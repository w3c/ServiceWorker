<h2>Navigation Controllers Explained -- Advanced Topics</h2>

So you've read the [Explainer](explainer.md) for Navigation Controller's but you've still got questions -- great! We've got (more) answers.

## Understanding Cache Lifetimes

Navigation Controllers have two effective types of caches: the browser managed cache for the controller script itself (covered in the next section) and the caches your apps create and maintain. Lets focus on the second. The Explainer covered how to make them, how to use them when responding to requests, but not much else about their lifecycle.

First, the zen of understanding Navigation Controller `Cache` instances is that they _are not part of your browser's HTTP cache_. Forget what you know about HTTP cache eviction, expires headers, and all the rest. None of that matters here -- your `Cache` objects are exactly that, _your_ caches. They don't get updated unless you ask for them to be, they don't expire (unless you delete the entries), and they don't disappear just because you upgrade your controller version.

This has huge ramifications for good long-term controller practice.

The first implication is that _you should version your caches by name_. Add the major version of your controller to the cache name and make sure you are only using caches that your version of the controller knows it can safely operate on.

So what about old caches? Replaced controllers don't get an extra chance to run, so it's always up to the _replacing_ controller to do housekeeping.

The Explainer talked heavily about `oninstall`, but wisely didn't mention it's cousin `onactivate`: there's good reason for this: `onactivate` is called *after* the previous controller is replaced but before the new controller handles any resources, and no new requests will be sent to the new controller until it finishes. That makes `onactivate` the ideal place to do work like IndexedDB schema upgrades and legacy cache removal. It also makes a dangerous place, since doing too much work or doing work that takes too long can have the effective appearance of hosing an app entirely. There won't be an old version to use and the new version is assumed to be doing important work to get ready to handle new requests.

Tread very, _very_ lightly when writing `onactivate` handlers.

Luckily, removing old caches is both simple and fast.

Caches are always enumerable via the global `caches` map, and removing a cache (and all of the resources it holds) is as simple as:

```js
// caching.js
this.version = 2;

var caches = this.caches;
var assetBase = "/assets/v" + parseInt(this.version) + "/";
var shellCacheName = "shell-v" + parseInt(this.version);
var contentCacheName = "content";
var currentCaches = [ shellCacheName, contentCacheName ];

this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  var shellResources = new Cache(
    assetBase + "/base.css",
    assetBase + "/app.js",
    assetBase + "/logo.png",
    assetBase + "/intro_video.webm",
  );
  caches.set(shellCacheName, shellResources);
  e.waitUntil(shellResources.ready());
});

this.addEventListener("activate", function(e) {
  // Iterate through the list of caches and remove all caches not needed by
  // this version.
  caches.forEach(function(cacheName, cache) {
    if (currentCaches.indexOf(cacheName) == -1) {
      caches.delete(cacheName);
    }
  });
});

// ...onfetch, etc...
```

So that's cache "garbage collection" then: it's manual and your app should be mindful of what it doesn't need any more when updating to a new version. The same thing goes for static routes that your old versions may have set up: it's best to clear them all and re-set them in the latest version of your controller rather than leaving them around as they can lead to terrible gotchas and astonishing disk usage. If you don't want to spend forever debugging, it's best to take care early to ensure that your caches, databases, and static routes are kept neat and tidy.

But what about in-place updates of `Cache` objects?

Remember, `Cache` entries do not update themselves. Whatever versions of content they receive when they are successfully filled are the versions they keep until the developer requests an update. That means it's possible for a controller to be updated regularly, use caches across versions, but still find itself using legacy content in caches...assuming content at the same URL has been updated, a pretty-clear anti-pattern: better to put version #'s in URLs than to update cacheable content at stable URL).

To re-iterate: caches aren't updated automatically. Updates must be manually managed. How? With `.update()`.

```js
// caching.js
this.version = 2;

var caches = this.caches;
var assetBase = "/assets/v" + parseInt(this.version) + "/";
var shellCacheName = "shell-v" + parseInt(this.version);
var contentCacheName = "content";
var currentCaches = [ shellCacheName, contentCacheName ];

this.addEventListener("install", function(e) {
  // Update the existing caches that we'll eventually keep.
  caches.forEach(function(cacheName, cache) {
    if (currentCaches.indexOf(cacheName) >= 0) {
      e.waitUntil(caches.get(cacheName).update());
    }
  });

  // Create a cache of resources. Begins the process of fetching them.
  var shellResources = new Cache(
    assetBase + "/base.css",
    assetBase + "/app.js",
    assetBase + "/logo.png",
    assetBase + "/intro_video.webm",
  );
  caches.set(shellCacheName, shellResources);

  e.waitUntil(shellResources.ready());

});

this.addEventListener("activate", function(e) {
  caches.forEach(function(cacheName, cache) {
    if (currentCaches.indexOf(cacheName) == -1) {
      caches.delete(cacheName);
    } else {
      // Update the existing caches
      e.waitUntil(caches.get(cacheName).update());
    }
  });
});

// ...onfetch, etc...
```

A call to `.update()` re-checks the underlying resources against the versions in the HTTP cache using HTTP semantics. If they've expired, a fetch all the way to the network is attempted. If not, the versions in the browser's HTTP cache are used instead.

## Understanding Controller Caching

It's important to keep in mind that Navigation Controllers are a type of [Shared Worker](http://www.w3.org/TR/workers/#shared-workers-and-the-sharedworker-interface) -- uniquely imbued with additional APIs for access to cache objects and such -- but in general, what you can do in a Shared Worker, you can do in a Navigation Controller. That includes calling [`importScripts()`](https://developer.mozilla.org/en-US/docs/DOM/Using_web_workers#Importing_scripts_and_libraries) to include libraries.

`importScripts()` is a dynamic call, much like the addition of a `<script>` element to document at runtime, so from the perspective of the browser, there's no way to know what resources the controller itself will depend on until it is executed. As you've guessed by now, this has implications for what gets fetched and cached when the browser downloads and attempts to install a controller. Remember also that initial requests for controller scripts (and their sub-resources) happen *against the native HTTP cache* (without heuristic caching), not `Cache` objects you might have set up.

But browsers surely must cache Controllers (else how would Controllers run when disconnected?)...so what guarantees do we have about what will be cached and when?

The way to think about this is that your controller and whatever scripts it depends on by the time `oninstall` succeeds are added to a browser-managed `Cache` object that is checked for updates once a day.

To repeat: if you `importScripts()` for all of the resources you will need by the time your `oninstall` callback finishes, those resources are going to be part of the implicit cache that the browser maintains.

Here's a super simple example that imports all the libraries the script will need at every possible point into the global scope:

```js
// caching.js

// Define "route()" and "cache()" via external scripts
importScripts("http://cdn.example.com/assets/v1/router.js",
              "http://cdn.example.com/assets/v1/cacheManger.js");

this.version = 1;
var resources = [
    base + "/assets/v1/base.css",
    base + "/assets/v1/app.js",
    base + "/assets/v1/logo.png",
    base + "/assets/v1/intro_video.webm"
];
// Sets up an onfetch handler for the resources
route(
  // Sets up an oninstall to make sure they're available
  cache("shell-v1", resources)
);
```

Neat stuff. The `route` and `cache` functions provided by `router.js` and `cacheManger.js` make it much simpler to write your controller and since they're imported at the top-level, we know they'll be cached along with `caching.js`.

Many versions of the basic pattern presented here are possible, including calling `importScripts()` to include libraries authored by third parties to help manage sensitive resources that they would like to manage. In these cases, the ability for the controller to register multiple `oninstall` and `onfetch` handlers proves to be invaluable: each imported script can set up handlers to manage resources, caches, and the like for the bits of the world they need to be in control of.

_*NOTE: Be mindful that these are global imports running in the context of your app's origin. Like cross-origin scripts included in your app, scripts imported into your controller run with full authority to do everything your controller can -- which is pretty much everything. `importScripts()` only from those you trust!*_

It's also good to know what counts as an "update" to the controller script: when the browser re-fetches the main script, it ignores HTTP heuristic caching and goes all the way to the network, requesting the controller directly from the server and bypassing HTTP caches. Upon getting a new response, the returned script it checked to see if it is byte-for-byte identical. Only when not byte-for-byte identical is the controller considered "updated". Scripts required by `importScripts()` are fetched and validated in the same way, at the same time, but updates to them are not considered to trigger the "ugprade dance" the same way that an update to the main controller does.

The rule then is that if you'd like to update the behavior of controllers, you should update some of the contents of the controller script itself -- even if it's just a small increment to the version number.

### If You Liked It, You Should Have Put Some SSL On It

Controllers are in effect all the time, but really come into their own when offline. But "offline" is incredibly hard to define, it turns out. Think of the last time you were in a hotel lobby, coffee shop, or airport where some sign advertised "Free WiFi!", only to present you with a captive portal demanding an email address (all the better to spam you with!) or worse, some form of payment to do anything but view some marketing site for the place *you're already in* (but starting to want to leave).

Now imagine that the browser is running and thinks "cool, we're connected to the Internet and DNS is resolving, lets fetch some updated controllers!" Pain and heartache are about to befall installed apps, particularly if you *do* connect, but the service provider is running an aggressive and badly-behaved proxy. Such things are more common than they should be.

Good news and bad news: the good news is that *most* proxies will respect you serving your controllers with `Cache-Control: no-cache` or `Cache-Control: private`. Between that and the browser turning off heuristic caching for resource controllers, most requests for updated controllers will get to the right places. But not if something is really wonky and/or DNS is compromised. To prevent your app getting pwn'd by terrible proxies and captive portals, you'll need to serve the controller (and most of the resources) in such a way that they payloads _can't_ be inspected (and therefore cached). Yes, that means SSL.

Oh, don't give me that look. You knew you were going to have to do it.

### Cache Quotas and Eviction Events

TODO(slightlyoff)

### CSP

TODO(slightlyoff): what happens if a controller matches the page's CSP policy but an importScript()'d resource doesn't?

## Dude, Where Are My Synchronous APIs?

They're gone. Just gone.

With the exception of `importScripts()` (covered at length above), Navigation Controllers expose no synchronous APIs. No sync XHR, no sync IDB, nothing.

Why?

Glad you asked: Controllers live and die by their ability to respond quickly to requests. In fact, if a controller takes too long to do _anything_, browsers can just simply kill them. If your `importScript()` call takes too long, dead. If your event handlers take too long, _dead_. Them's the breaks when you're in the fast-path for content fetching.

Remember that there's only one controller running at a time, meaning that if many resources need to be handled, the Controller needs to be free to start making decisions about them, and _that_ means getting out of the way and giving some other request a chance. To help enable good performance behavior, all of the APIs that might otherwise lock up the Controller have been taken away and all of the APIs that you respond with content to deal with `Futures` to enable you to do work asynchronously.

Keeping your controllers responsive is your job. Making that easier than not is the job of the spec authors, and removing synchronous guns pointed straight at the feet of your application is one way they've done that.