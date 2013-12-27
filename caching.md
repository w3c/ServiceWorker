## Caching

The Cache API is the easiest mechanism to take an application offline, but it is by no means the only one. Other browser storage mechanisms (such as IndexedDB, the FileSystem API are fine candidates as well. (Local storage is out: no synchronous APIs) The Cache API is primarily an API sugared specifically for responding to `fetch` events in ServiceWorkers.

Much like any other web storage technology, they are _not_ shared
across domains, and they are completely isolated from the browser's HTTP cache.

A domain can have multiple, named `Cache` objects, whose contents are entirely under the control of scripts. The zen of understanding `Cache` instances is that they _are not part of your browser's HTTP cache_. Forget what you know about HTTP cache eviction, expires headers, and all the rest. None of that matters here -- your `Cache` objects are exactly that, _your_ caches. They don't get updated unless you ask for them to be, they don't expire (unless you delete the entries), and they don't disappear just because you upgrade your ServiceWorker script.

This has huge ramifications for good long-term offline use of ServiceWorkers.

The first implication is that _you should version your caches by name_. Add the major version of your ServiceWorker to the cache name and make sure you are only using caches that your version of the ServiceWorker knows it can safely operate on.

So what about old caches? Old ServiceWorker scripts don't get an extra chance to run, so it's always up to the _replacing_ ServiceWorker to do housekeeping.

The [Explainer](explainer.md) talked heavily about `oninstall`, but wisely didn't mention it's cousin `onactivate`: there's good reason for this: `onactivate` is called *after* the previous ServiceWorker script is replaced but before the new script handles any resources, and no new requests will be sent to the new ServiceWorker until it finishes. That makes `onactivate` the ideal place to do work like IndexedDB schema upgrades and legacy cache removal. It also makes a dangerous place, since doing too much work or doing work that takes too long can have the effective appearance of hosing an app entirely. There won't be an old version to use and the new version is assumed to be doing important work to get ready to handle new requests.

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

So that's cache "garbage collection" then: it's manual and your app should be mindful of what it doesn't need any more when updating to a new version. If you don't want to spend forever debugging, it's best to take care early to ensure that your caches and databases are kept neat and tidy.

But what about in-place updates of `Cache` objects?

Remember, `Cache` entries do not update themselves. Whatever versions of content they receive when they are successfully filled are the versions they keep until the developer requests an update. That means it's possible for an ServiceWorker to be updated regularly, use caches across versions, but still find itself using legacy content in caches...assuming content at the same URL has been updated, a pretty-clear anti-pattern: better to put version #'s in URLs than to update cacheable content at stable URL).

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
