# ServiceWorkers Explained

## What's All This Then?

The ServiceWorker is like a [SharedWorker](https://html.spec.whatwg.org/multipage/workers.html#sharedworker) in that it:

* runs in its own thread
* isn't tied to a particular page
* has no DOM access

Unlike a SharedWorker, it:

* can run without any page at all
* can terminate when it isn't in use, and run again when needed
* has a defined upgrade model
* is HTTPS only (more on that in a bit)

We can use ServiceWorker:

* to make sites work [faster and/or offline](https://www.youtube.com/watch?v=px-J9Ghvcx4) using network intercepting
* as a basis for other 'background' features such as push messaging and background sync

## Getting Started

First you need to register for a ServiceWorker:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/my-app/sw.js', {
    scope: '/my-app/'
  }).then(function(reg) {
    console.log('Yey!', reg);
  }).catch(function(err) {
    console.log('Boo!', err);
  });
}
```

In this example, `/my-app/sw.js` is the location of the ServiceWorker script, and it controls pages whose URL begins `/my-app/`. The scope is optional, and defaults to `/`.

`.register` returns a promise. If you're new to promises, check out the [HTML5Rocks article](http://www.html5rocks.com/en/tutorials/es6/promises/).

Some restrictions:

* The registering page must have been served securely (HTTPS without cert errors)
* The ServiceWorker script must be on the same origin as the page, although you can import scripts from other origins using [`importScripts`](https://html.spec.whatwg.org/multipage/workers.html#apis-available-to-workers:dom-workerglobalscope-importscripts)
* …as must the scope

### HTTPS only you say?

Using ServiceWorker you can hijack connections, respond differently, & filter responses. Powerful stuff. While you would use these powers for good, a man-in-the-middle might not. To avoid this, you can only register for ServiceWorkers on pages served over HTTPS, so we know the ServiceWorker the browser receives hasn't been tampered with during its journey through the network.

Github Pages are served over HTTPS, so they're a great place to host demos.

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

You can pass a promise to `event.waitUntil` to extend the installation process. Once `activate` fires, your ServiceWorker can control pages!

## So I'm controlling pages now?

Well, not quite. A document will pick a ServiceWorker to be its controller when it navigates, so the document you called `.register` from isn't being controlled, because there wasn't a ServiceWorker there when it first loaded.

If you refresh the document, it'll be under the ServiceWorker's control. You can check `navigator.serviceWorker.controller` to see which ServiceWorker is in control, or `null` if there isn't one. Note: when you're updating from one ServiceWorker to another, things work a little differently, we'll get onto that in the "Updating" section.

If you shift+reload a document it'll always load without a controller, which is handy for testing quick CSS & JS changes.

Documents tend to live their whole life with a particular ServiceWorker, or none at all. However, a ServiceWorker can call `event.replace()` during the `install` event to do an immediate takeover of all pages within scope.

## Network intercepting

```js
self.addEventListener('fetch', function(event) {
  console.log(event.request);
});
```

You get fetch events for:

* Navigations within your ServiceWorker's scope
* Any requests triggered by those pages, even if they're to another origin

This means you get to hear about requests for the page itself, the CSS, JS, images, XHR, beacons… all of it. The exceptions are:

* iframes & `<object>`s - these will pick their own controller based on their resource URL
* ServiceWorkers - requests to fetch/update a ServiceWorker don't go through the SerivceWorker
* Requests triggered within a ServiceWorker - you'd get a loop otherwise

The `request` object gives you information about the request such as its URL, method & headers. But the really fun bit, is you can hijack it and respond differently:

```js
self.addEventListener('fetch', function(event) {
  event.respondWith(new Response("Hello world!"));
});
```

[Here's a live demo](https://jakearchibald.github.io/isserviceworkerready/demos/manual-response/) (you'll need to enable [some flags](http://jakearchibald.com/2014/using-serviceworker-today/#in-canary-today) to get it working in Chrome today).

`.respondWith` takes a `Response` object or a promise that resolves to one. We're creating a manual response above. The `Response` object comes from the [Fetch Spec](https://fetch.spec.whatwg.org/#response-class). Also in the spec is the `fetch()` method, which returns a promise for a response, meaning you can get your response from elsewhere:

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

In the above, I'm capturing requests that end `.jpg` and instead responding with a Google doodle. `fetch()` requests are CORS by default, but by setting `no-cors` I can use the response even if it doesn't have CORS access headers (although I can't access the content with JavaScript). [Here's a demo of that](https://jakearchibald.github.io/isserviceworkerready/demos/img-rewrite/).

Promises let you fallback from one method to another:

```js
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return new Response("Request failed!");
    })
  );
});
```

The ServiceWorker comes with a cache API, making it easy to store responses for reuse later, more on that shortly, but first…

## Updating a ServiceWorker

The lifecycle of a ServiceWorker is based on Chrome's update model: Do as much as possible in the background, don't disrupt the user, complete the update when the current version closes.

Whenever you navigate to page within scope of your ServiceWorker, the browser checks for updates in the background. If the script is byte-different, it's considered to be a new version, and installed (note: only the script is checked, not external `importScripts`). However, the old version remains in control over pages until all tabs using it are gone (unless `.replace()` is called during install). Then the old version is garbage collected and the new version takes over.

This avoids the problem of two versions of a site running at the same time, in different tabs. Our current strategy for this is ["cross fingers, hope it doesn't happen"](https://twitter.com/jaffathecake/status/502779501936652289).

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

Here's [how that looks in practice](https://www.youtube.com/watch?v=VEshtDMHYyA).

Unfortunately refreshing a single tab isn't enough to allow an old worker to be collected and a new one take over. Browsers make the next page request before unloading the current page, so there isn't a moment when current active worker can be released.

The easiest way at the moment is to close & reopen the tab (cmd+w, then cmd+shift+t on Mac), or shift+reload then normal reload.

## The Cache

ServiceWorker comes with a [caching API](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#cache-objects), letting you create stores of responses keyed by request.

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
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
```

Matching within the cache is similar to the browser cache. Method, URL and vary headers are taken into account, but freshness headers are ignored. Things are only removed from caches when you remove them.

You can add individual items to the cache with `cache.put(request, response)`, including ones you've created yourself. You can also control matching, [discounting things](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#cache-query-options-dictionary) such as query string, methods, and vary headers.

## Other ServiceWorker related specifications

Since ServiceWorkers can spin up in time for events, they've opened up the possibility for other features that happen occasionally in the background, even when the page isn't open. Such as:

* [Push](http://w3c.github.io/push-api/)
* [Background sync](https://github.com/slightlyoff/BackgroundSync)
* [Geofencing](https://github.com/slightlyoff/Geofencing)

## Conclusions

This document only scratches the surface of what ServiceWorkers enable, and aren't an exhaustive list of all of the available APIs available to controlled pages or ServiceWorker instances. Nor does it cover emergent practices for authoring, composing, and upgrading applications architected to use ServiceWorkers. It is, hopefully, a guide to understanding the promise of ServiceWorkers and the rich promise of offline-by-default web applications that are URL friendly and scalable.

## Acknowledgments

Many thanks to [Web Personality of the Year nominee](http://www.ubelly.com/thecritters/) Jake ("B.J.") Archibald, David Barrett-Kahn, Anne van Kesteren, Michael Nordman, Darin Fisher, Alec Flett, Andrew Betts, Chris Wilson, Aaron Boodman, Dave Herman, Jonas Sicking, and Greg Billock for their comments and contributions to this document and to the discussions that have informed it.

