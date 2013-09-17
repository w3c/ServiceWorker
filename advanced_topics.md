<h2>EventWorkers Explained -- Advanced Topics</h2>

So you've read the [Explainer](explainer.md) for EventWorkers but you've still got questions -- great! We've got (more) answers.

## Caching of EventWorker scripts

The script that you register, as well as any additional scripts that
are imported during initial load, are persistently cached with a separate policy from normal web content, or any other web storage mechanisms.

This allows the browser to start up the EventWorker at any point, generally in response to 

## Offline

How does this handle offline, or more specifically, how does this replace AppCache?

The fetch event is simply the gateway through which all network access for a given is managed. By intercepting all fetch events and optionally routing them through a cache, you can control access to the network, possibly avoiding it altogether.

To do this you're going to need an actual Cache. EventWorkers (and eventually other contexts) have access to a separate Cache API which allows storage of arbitrary data that can be used to respond to fetch events.

## Understanding EventWorker script Caching

It's important to keep in mind that EventWorkers are a type of [Shared Worker](http://www.w3.org/TR/workers/#shared-workers-and-the-sharedworker-interface) -- uniquely imbued with additional APIs for access to cache objects and such -- but in general, what you can do in a Shared Worker, you can do in a EventWorker. That includes calling [`importScripts()`](https://developer.mozilla.org/en-US/docs/DOM/Using_web_workers#Importing_scripts_and_libraries) to include libraries.

`importScripts()` is a dynamic call, much like the addition of a `<script>` element to document at runtime, so from the perspective of the browser, there's no way to know what resources the EventWorker script itself will depend on until it is executed. As you've guessed by now, this has implications for what gets fetched and cached when the browser downloads and attempts to install an EventWorker. Remember also that initial requests for EventWorker scripts (and their sub-resources) happen *against the native HTTP cache* (without heuristic caching).

But browsers surely must cache EventWorker scripts (else how would EventWorkers run when disconnected?)...so what guarantees do we have about what will be cached and when?

To repeat: if you `importScripts()` for all of the resources you will need by the time your `oninstall` callback finishes, those resources are going to be part of the implicit cache that the browser maintains.

Here's a super simple example that imports all the libraries the script will need at every possible point into the global scope. It brings in both EventWorker scripts themselves, as well as resources that will be used when offline:

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

Neat stuff. The `route` and `cache` functions provided by `router.js` and `cacheManger.js` make it much simpler to write your EventWorker, and since they're imported at the top-level, we know they'll be cached along with `caching.js`.

Many versions of the basic pattern presented here are possible, including calling `importScripts()` to include libraries authored by third parties to help manage sensitive resources that they would like to manage. In these cases, the ability for the EventWorker to register multiple `oninstall` and `onfetch` handlers proves to be invaluable: each imported script can set up handlers to manage resources, caches, and the like for the bits of the world they need to be in control of.

_*NOTE: Be mindful that these are global imports running in the context of your app's origin. Like cross-origin scripts included in your app, scripts imported into your EventWorker run with full authority to do everything your EventWorker can -- which is pretty much everything. `importScripts()` only from those you trust!*_

It's also good to know what counts as an "update" to the EventWorker script: when the browser re-fetches the main script, it ignores HTTP heuristic caching and goes all the way to the network, requesting the EventWorker script directly from the server and bypassing HTTP caches. Upon getting a new response, the returned script it checked to see if it is byte-for-byte identical. Only when not byte-for-byte identical is the EventWorker script considered "updated". Scripts required by `importScripts()` are fetched and validated in the same way, at the same time, but updates to them are not considered to trigger the "upgrade dance" the same way that an update to the main EventWorker script does.

The rule then is that if you'd like to update the behavior of EventWorker, you should update some of the contents of the EventWorker script itself -- even if it's just a small increment to the version number.

### If You Liked It, You Should Have Put Some SSL On It

EventWorkers are "in effect" all the time, but really come into their own when offline. But "offline" is incredibly hard to define, it turns out. Think of the last time you were in a hotel lobby, coffee shop, or airport where some sign advertised "Free WiFi!", only to present you with a captive portal demanding an email address (all the better to spam you with!) or worse, some form of payment to do anything but view some marketing site for the place *you're already in* (but starting to want to leave).

Now imagine that the browser is running and thinks "cool, we're connected to the Internet and DNS is resolving, let's fetch some updated EventWorkers!" Pain and heartache are about to befall installed apps, particularly if you *do* connect, but the service provider is running an aggressive and badly-behaved proxy. Such things are more common than they should be.

Good news and bad news: the good news is that *most* proxies will respect you serving your EventWorker scripts with `Cache-Control: no-cache` or `Cache-Control: private`. Between that and the browser turning off heuristic caching for EventWorker script resources, most requests for updated EventWorkers will get to the right places. But not if something is really wonky and/or DNS is compromised. To prevent your app getting pwn'd by terrible proxies and captive portals, you'll need to serve the script (and most of the resources) in such a way that they payloads _can't_ be inspected (and therefore cached). Yes, that means SSL.

Oh, don't give me that look. You knew you were going to have to do it.

### Cache Quotas and Eviction Events

TODO(slightlyoff)

### CSP

TODO(slightlyoff): what happens if an EventWorker script matches the page's CSP policy but an importScript()'d resource doesn't?

## Dude, Where Are My Synchronous APIs?

They're gone. Just gone.

With the exception of `importScripts()` (covered at length above), EventWorkers expose no synchronous APIs. No sync XHR, no sync IDB, nothing.

Why?

Glad you asked: EventWorker scripts live and die by their ability to respond quickly to requests. In fact, if a EventWorker takes too long to do _anything_, browsers can just simply kill them. If your `importScript()` call takes too long, dead. If your event handlers take too long, _dead_. Them's the breaks when you're in the fast-path for content fetching.

Remember that there's only one EventWorker running at a time, meaning that if many resources need to be handled, the EventWorker needs to be free to start making decisions about them, and _that_ means getting out of the way and giving some other request a chance. To help enable good performance behavior, all of the APIs that might otherwise lock up the EventWorker have been taken away and all of the APIs that you respond with content to deal with `Promises` to enable you to do work asynchronously.

Keeping your EventWorkers responsive is your job. Making that easier than not is the job of the spec authors, and removing synchronous guns pointed straight at the feet of your application is one way they've done that.