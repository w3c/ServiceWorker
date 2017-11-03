# Service workers explained

## What’s all this then?

Service workers are being developed to answer frequent questions and concerns about the web platform, including:

 * An inability to explain (in the [Extensible Web Manifesto](https://extensiblewebmanifesto.org/) sense) HTTP caching and high-level HTTP interactions like the HTML5 AppCache
 * Difficulty in building offline-first web applications in a natural way
 * The lack of a background execution context which many proposed capabilities could make use of

We also note that the long lineage of declarative-only solutions ([Google Gears](https://gears.google.com), [Dojo Offline](http://www.sitepen.com/blog/category/dojo-offline/), and [HTML5 AppCache](http://alistapart.com/article/application-cache-is-a-douchebag)) have failed to deliver on their promise. Each successive declarative-only approach failed in many of the same ways, so the service worker effort has taken a different design approach: a largely-imperative system that puts developers firmly in control.

The service worker is like a [shared worker](https://html.spec.whatwg.org/multipage/workers.html#sharedworker) in that it:

* Runs in its own global script context (usually in its own thread)
* Isn’t tied to a particular page
* Has no DOM access

Unlike a shared worker, it:

* Can run without any page at all
* Can terminate when it isn’t in use, and run again when needed (i.e., it’s event-driven)
* Has a defined upgrade model
* Is HTTPS only (more on that in a bit)

We can use service workers:

* To make sites work [faster and/or offline](https://www.youtube.com/watch?v=px-J9Ghvcx4) using network intercepting
* As a basis for other ‘background’ features such as [push messaging](http://updates.html5rocks.com/2015/03/push-notificatons-on-the-open-web) and [background synchronization](https://github.com/slightlyoff/BackgroundSync/blob/master/explainer.md)

## Getting started

First you need to register for a service worker:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/my-app/sw.js').then(function(reg) {
    console.log('Yey!', reg);
  }).catch(function(err) {
    console.log('Boo!', err);
  });
}
```

In this example, `/my-app/sw.js` is the location of the service worker script, and it controls pages whose URL begins with `/my-app/`.

`.register` returns a promise. If you’re new to promises, check out the [HTML5Rocks article](http://www.html5rocks.com/en/tutorials/es6/promises/).

Some restrictions:

* The registering page must have been served securely (HTTPS without cert errors)
* The service worker script must be on the same origin as the page, although you can import scripts from other origins using [`importScripts`](https://html.spec.whatwg.org/multipage/workers.html#apis-available-to-workers:dom-workerglobalscope-importscripts)
* …as must the scope

### HTTPS only you say?

Using service workers you can hijack connections, respond differently, & filter responses. Powerful stuff. While you would use these powers for good, a man-in-the-middle might not. To avoid this, you can only register for service workers on pages served over HTTPS, so we know the service worker the browser receives hasn’t been tampered with during its journey through the network.

GitHub Pages are served over HTTPS, so they’re a great place to host demos.

## Initial lifecycle

Your worker script goes through three stages when you call `.register`:

1. Download
2. Install
3. Activate

You can use events to interact with `install` and `activate`:

```js
self.addEventListener('install', function(event) {
  event.waitUntil(
    fetchStuffAndInitDatabases()
  );
});

self.addEventListener('activate', function(event) {
  // You're good to go!
});
```

You can pass a promise to `event.waitUntil` to extend the installation process. Once `activate` fires, your service worker can control pages!

## So I’m controlling pages now?

Well, not quite. A document will pick a service worker to be its controller when it navigates, so the document you called `.register` from isn’t being controlled, because there wasn’t a service worker there when it first loaded.

If you refresh the document, it’ll be under the service worker’s control. You can check `navigator.serviceWorker.controller` to see which service worker is in control, or `null` if there isn’t one. Note: when you’re updating from one service worker to another, things work a little differently. We’ll get into that in the “Updating” section.

If you shift+reload a document, it’ll always load without a controller, which is handy for testing quick CSS & JS changes.

Documents tend to live their whole life with a particular service worker, or none at all. However, a service worker can call `self.skipWaiting()` ([spec](https://w3c.github.io/ServiceWorker/#service-worker-global-scope-skipwaiting)) to do an immediate takeover of all pages within scope.

## Network intercepting

```js
self.addEventListener('fetch', function(event) {
  console.log(event.request);
});
```

You get fetch events for:

* Navigations within your service worker’s scope
* Any requests triggered by those pages, even if they’re to another origin

This means you get to hear about requests for the page itself, the CSS, JS, images, XHR, beacons… all of it. The exceptions are:

* iframes & `<object>`s – these will pick their own controller based on their resource URL
* Service workers – requests to fetch/update a service worker don’t go through the service worker
* Requests triggered within a service worker – you’d get a loop otherwise

The `request` object gives you information about the request such as its URL, method & headers. But the really fun bit, is you can hijack it and respond differently:

```js
self.addEventListener('fetch', function(event) {
  event.respondWith(new Response("Hello world!"));
});
```

[Here’s a live demo](https://jakearchibald.github.io/isserviceworkerready/demos/manual-response/).

`.respondWith` takes a `Response` object or a promise that resolves to one. We’re creating a manual response above. The `Response` object comes from the [Fetch Spec](https://fetch.spec.whatwg.org/#response-class). Also in the spec is the `fetch()` method, which returns a promise for a response, meaning you can get your response from elsewhere:

```js
self.addEventListener('fetch', function(event) {
  if (/\.jpg$/.test(event.request.url)) {
    event.respondWith(
      fetch('//www.google.co.uk/logos/…3-hp.gif', {
        mode: 'no-cors'
      })
    );
  }
});
```

In the above, I’m capturing requests that end in `.jpg` and instead responding with a Google doodle. `fetch()` requests are [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) by default, but by setting `no-cors` I can use the response even if it doesn’t have CORS access headers (although I can’t access the content with JavaScript). [Here’s a demo of that](https://jakearchibald.github.io/isserviceworkerready/demos/img-rewrite/).

Promises let you fall back from one method to another:

```js
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return new Response("Request failed!");
    })
  );
});
```

The service worker comes with a cache API, making it easy to store responses for reuse later. More on that shortly, but first…

## Updating a service worker

The lifecycle of a service worker is based on Chrome’s update model: do as much as possible in the background, don’t disrupt the user, complete the update when the current version closes.

Whenever you navigate to a page within scope of your service worker, the browser checks for updates in the background. If the script is byte-different, it’s considered to be a new version, and installed (note: only the script is checked, not external `importScripts`). However, the old version remains in control over pages until all tabs using it are gone (unless `.replace()` is called during install). Then the old version is garbage collected and the new version takes over.

This avoids the problem of two versions of a site running at the same time, in different tabs – something that happens by default on the web, and is the [source of really tricky bugs](https://twitter.com/jaffathecake/status/502779501936652289).

Note: Updates obey the freshness headers of the worker script (such as `max-age`), unless the `max-age` is greater than 24 hours, in which case it is capped to 24 hours.


```js
self.addEventListener('install', function(event) {
  // this happens while the old version is still in control
  event.waitUntil(
    fetchStuffAndInitDatabases()
  );
});

self.addEventListener('activate', function(event) {
  // the old version is gone now, do what you couldn't
  // do while it was still around
  event.waitUntil(
    schemaMigrationAndCleanup()
  )
});
```

Here’s [how that looks in practice](https://www.youtube.com/watch?v=VEshtDMHYyA).

Unfortunately refreshing a single tab isn’t enough to allow an old worker to be collected and a new one take over. Browsers make the next page request before unloading the current page, so there isn’t a moment when current active worker can be released.

The easiest way at the moment is to close & reopen the tab (cmd+w, then cmd+shift+t on Mac), or shift+reload then normal reload.

## The cache

Service worker comes with a [caching API](https://w3c.github.io/ServiceWorker/#cache-objects), letting you create stores of responses keyed by request.

```js
self.addEventListener('install', function(event) {
  // pre cache a load of stuff:
  event.waitUntil(
    caches.open('myapp-static-v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/styles/all.css',
        '/styles/imgs/bg.png',
        '/scripts/all.js'
      ]);
    })
  )
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      return cachedResponse || fetch(event.request);
    })
  );
});
```

Matching within the cache is similar to the browser cache. Method, URL and `vary` headers are taken into account, but freshness headers are ignored. Things are only removed from caches when you remove them.

You can add individual items to the cache with `cache.put(request, response)`, including ones you’ve created yourself. You can also control matching, [discounting things](https://w3c.github.io/ServiceWorker/#cache-query-options-dictionary) such as query string, methods, and vary headers.

## Other service worker–related specifications

Since service workers can spin up in time for events, they’ve opened up the possibility for other features that happen occasionally in the background, even when the page isn’t open. Such as:

* [Push](http://w3c.github.io/push-api/)
* [Background sync](https://github.com/slightlyoff/BackgroundSync)
* [Geofencing](https://github.com/slightlyoff/Geofencing)

## Conclusions

This document only scratches the surface of what service workers enable, and isn’t an exhaustive list of all of the available APIs available to controlled pages or service worker instances. Nor does it cover emergent practices for authoring, composing, and upgrading applications architected to use service workers. It is, hopefully, a guide to understanding the promise of service workers and the rich promise of offline-by-default web applications that are URL friendly and scalable.

## Acknowledgments

Many thanks to [Web Personality of the Year nominee](http://www.ubelly.com/thecritters/) Jake (“B.J.”) Archibald, David Barrett-Kahn, Anne van Kesteren, Michael Nordman, Darin Fisher, Alec Flett, Andrew Betts, Chris Wilson, Aaron Boodman, Dave Herman, Jonas Sicking, Greg Billock, Karol Klepacki, Dan Dascalescu, and Christian Liebel for their comments and contributions to this document and to the discussions that have informed it.
