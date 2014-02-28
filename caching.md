## Caching

The Cache API is the easiest mechanism to take an application offline, but it is by no means the only one. Other browser storage mechanisms (such as IndexedDB, the FileSystem API are fine candidates as well. (Local storage is out: no synchronous APIs) The Cache API is primarily an API sugared specifically for responding to `fetch` events in ServiceWorkers.

Much like any other web storage technology, they are _not_ shared across domains, and they are completely isolated from the browser's HTTP cache.

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

var assetBase = "/assets/v1/";
var shellCacheName = "shell-v1";
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
  
  e.waitUntil(
    caches.set(shellCacheName, shellResources).then(function() {
      return caches.has(contentCacheName);
    }).then(function(result) {
      if (!result) {
        return caches.set(contentCacheName, new Cache());
      }
    }).then(function() {
      return shellResources.ready();
    });
  );
});

this.addEventListener("activate", function(e) {
  // Iterate through the list of caches and remove all caches not needed by
  // this version.
  e.waitUntil(
    caches.keys().then(function(cacheName) {
      return Promise.all(
        keys.filter(function(cacheName) {
          return currentCaches.indexOf(cacheName) == -1;
        }).map(caches.delete.bind(caches))
      )
    })
  );
});

// ...onfetch, etc...
```

So that's cache "garbage collection" then: it's manual and your app should be mindful of what it doesn't need any more when updating to a new version. If you don't want to spend forever debugging, it's best to take care early to ensure that your caches and databases are kept neat and tidy.

But what about in-place updates of `Cache` objects?

Remember, `Cache` entries do not update themselves. Whatever versions of content they receive when they are successfully filled are the versions they keep until the developer requests an update. That means it's possible for an ServiceWorker to be updated regularly, use caches across versions, but still find itself using legacy content in caches...assuming content at the same URL has been updated, a pretty-clear anti-pattern: better to put version #'s in URLs than to update cacheable content at stable URL).

To re-iterate: caches aren't updated automatically. Updates must be manually managed. How? With `.update()`.

```js
// caching.js

var assetBase = "/assets/v2/";
var shellCacheName = "shell-v2";
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
  
  e.waitUntil(
    caches.set(shellCacheName, shellResources).then(function() {
      return caches.get(contentCacheName);
    }).then(function(cache) {
      if (cache) {
        return cache.update();
      }
      else {
        return caches.set(contentCacheName, new Cache());
      }
    }).then(function() {
      return shellResources.ready();
    });
  );

});

this.addEventListener("activate", function(e) {
  // Iterate through the list of caches and remove all caches not needed by
  // this version.
  e.waitUntil(
    caches.keys().then(function(cacheName) {
      return Promise.all(
        keys.filter(function(cacheName) {
          return currentCaches.indexOf(cacheName) == -1;
        }).map(caches.delete.bind(caches))
      )
    })
  );
});

// ...onfetch, etc...
```

A call to `.update()` re-checks the underlying resources against the versions in the HTTP cache using HTTP semantics. If they've expired, a fetch all the way to the network is attempted. If not, the versions in the browser's HTTP cache are used instead.

### Storing entries for different methods

Items in the cache are actually keyed by request. When you create/fetch cache items using a string, that string is converted to a URL with the worker URL as a base, then that URL is converted to a basic GET request.

`cache.match(request)` uses HTTP caching semantics to find the first relavent match to the request, although "freshness" headers such as `Cache-Control` are ignored.

By default, cache entries are unique to their url and method:

```js
var getRequest = new Request({
  url: "/foo/bar",
  method: "GET"
});

var postRequest = new Request({
  url: "/foo/bar",
  method: "POST",
  body: "hello"
});

var myCache = new Cache(getRequest, postRequest);

myCache.ready().then(function() {
  return Promise.all([
    myCache.match(getRequest);
    myCache.match(postRequest);
  ]);
}).then(function(requests) {
  var getResponse = requests[0];
  var postResponse = requests[1];
  // Both are unique cache items
});
```

When you add something to a cache, it overrides anything its request would match.

```js
myCache.add(new Request({
  url: "/foo/bar",
  method: "POST",
  body: "world"
})).then(function() {
  // the request above matches the other
  // "POST" response already in the cache,
  // so it overwrites it.
  // 
  // The cache contains 2 items, the older
  // "GET" response, and this new "POST"
  // response.
});
```

### Additional constraints via "vary"

As in HTTP, you can add extra constraints via the "vary" header. Continuing from our example above:

```js
var jsonRequest = new Request({
  url: "/whatever/",
  method: "GET",
  headers: {Accept: "application/json"} 
});

var htmlRequest = new Request({
  url: "/whatever/",
  method: "GET",
  headers: {Accept: "text/html"} 
});

var varyCache = new Cache(jsonRequest, htmlRequest);

varyCache.ready().then(function(responses) {
  // Assuming:
  // responses[0].headers.vary == 'Accept'
  // responses[1].headers.vary == 'Accept'
  // We now have 2 unique items in the cache
});
```

However, note that:

```js
varyCache.match("/whatever/").catch(function() {
  // We don't have a match for this
});
```

"/whatever/" is casted to a basic GET request, which has a default "Accept" header that doesn't match either of the requests we have responses stored against.

### Edge cases with "Vary"

You can get unexpected behaviour when a url+method changes its vary header. Let's go back to `myCache` where we have a cached response for GET "/foo/bar", but the response doesn't have a vary header:

```js
myCache.add(new Request({
  url: "/foo/bar",
  method: "GET",
  headers: {Accept: "application/json"} 
})).then(function(responses) {
  var response = responses[0];
  // This response has returned some JSON and
  // response.headers.vary == 'Accept'

  // However, this response has overwritten the
  // previously cached "GET" request, because it
  // was matched by the request we added.
});
```

Responses from a given url and method should all return the same 'vary' header. When you change your vary header, a more specific response may overwrite a less specific one, as above. If we didn't do this, the newly cached response would never match a request, as the less-specific cache entry would match first.

```js
myCache.add("/foo/bar").then(function(responses) {
  var response = responses[0];
  // This response has returned some HTML and
  // response.headers.vary == 'Accept'

  // We now have 2 unique entries in the cache
  // for GET /foo/bar

  myCache.match("/foo/bar").then(function(response) {
    // response is html
  });

  myCache.match(new Request({
    url: "/foo/bar",
    headers: {Accept: "application/json"}
  })).then(function(response) {
    // response is json
  });
});
```

### Dynamically building/updating a cache

Because you can cache by request, it's easy to dynamically build a cache as requests are made:

```js
this.onfetch = function(event) {
  event.respondWith(
    caches.match(event.request).catch(function() {
      return caches.get('dynamic').then(function(dynamicCache) {
        dynamicCache.add(event.request);
        return fetch(event.request);
      });
    })
  )
};
```

Because the request going into the cache and network is the same, the browser will optimise by only making one request.