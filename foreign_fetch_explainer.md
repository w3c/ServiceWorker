# Foreign Fetch Explained

## What's this about?

Without foreign fetch Service Workers can only intercept fetches for resources when the fetch originates on a page that is controlled by the service worker. If resources from cross origin services are used, a service worker can opaquely cache these resources for offline functionality, but full offline functionality (in particular things where multiple offline apps share some common third party service, and changes in one should be visible in the other) is not possible.
With foreign fetch a service worker can opt in to intercepting requests from anywhere to resources within its scope.

## The API

To start intercepting requests, you'll need to register for the scopes you want to intercept in your service worker, as well as the origins from which you want to intercept requests:

```js
self.addEventListener('install', function(e) {
  e.registerForeignFetch({scopes: ['/myscope/shared_resources'], origins: ['https://www.example.com/']});
});
```

The main restriction here is that the foreign fetch scopes have to be within the scope of the service worker.

Instead of specifying an explicit list of origins from which to intercept requests you can also use `["*"]` to indicate you want to intercept requests from all origins.

After registering your foreign fetch scopes, and after the service worker finished installation and activation, your service worker will not only receive fetch events for pages it controls (via the `onfetch` event), but also for requests made to URLs that match your foreign fetch scopes from pages you don't control, via the new `onforeignfetch` event.

Handling these fetch events is pretty much identical to how you'd handle regular fetch events (and in fact these are instances of the same `FetchEvent` interface only delivered to a new `onforeignfetch` event):

```js
self.addEventListener('foreignfetch', function(e) {
  // Do whatever local work is necesary to handle the fetch,
  // or just pass it through to the network:
  e.respondWith(fetch(e.request));
});
```

Of course just respondinging with a fetch for the same request just adds extra unneeded overhead. Generally you only want to register for foreign fetch events if the service worker can actually do something smart with the request. For example implement smarter caching than just the network cache and other regular service workers can offer. Or even more than just smarter caching, having full featured offline capable APIs.

## What about CORS?

Ideally having a dummy `onfetch` handler like above which just passes the received request through `fetch` and responds with that would be effectively a noop. That however isn't the case. The foreign fetch service worker runs with all the credentials and ambient authority it posesses. This means that the code in the foreign fetch handler has to be extra careful to make sure it only exposes data/resources cross origin when it really meant to do that.

To help with making it easier to write secure service workers, by default all responses passed to `respondWith` in a foreign fetch handler will be treated as opaque responses when handed back to whoever was requesting the resource. This will result in errors for the requesting party if it tried to do a CORS request. To enable a foreign fetch service worker to expose resources in a CORS like manner anyway, you can explicitly expose the request data and some subset of its headers by wrapping the response you pass to respondWith:

```js
self.addEventListener('foreignfetch', function(e) {
  e.respondWith(
      Response.makeVisibleTo(
          fetch(e.request), e.request.origin,
          {headers: ['...']});
});
```

If no explicit headers are specified all headers will be exposed. The `makeVisibleTo` method can be called either with a `Response` object, or with a promise resolving to a `Response` object.
