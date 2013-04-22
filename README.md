<h2>Navigation Controller Design Sketch</h2>

See `controller.ts` for the nitty-gritty. Examples with the proposed API:

## Installing A Controller

Assume the following is hosted at `http://example.com/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <script>
      // All top-level navigation requests for example.com/* will be routed to
      // the controller for pages which are navigated to once it is installed.

      // Note: it's safe to call register() instead of ready() in most cases. If
      // "/ctrl.js" is cached and not invalidated, you'll simply start up the
      // controller and be handed a reference to it in your callback, just the
      // same way you would by calling .ready().then(...);
      navigator.controller.register("/*", "/ctrl.js").then(
        function(controller) {
          controller.postMessage("OH HAI");
        },
        function(why) {
          console.error("Installing the controller failed!:", why);
        });
    </script>
  </head>
</html>
```

Once the controller is installed, *all* requests for resources from any page hosted at a URL for which the controller is active (see below for a discussion of controller/page mapping) are sent to the controller; in this case any page on `http://example.com` will be sent to `ctrl.js` once it is installed. Lets take a look at a simple controller which downloads a list of things to cache and when offline returns a helpful error message for `http://example.com/browse` instead of viewing the page or outright failing:

Assume the following is hosted at `http://example.com/ctrl.js`:

```js
"use strict"

var CACHE_NAME = "exampleApp v1";

this.oninstalled = function(e) {
  // The controller has be installed or updated, so install the caches we need:
  if (!this.caches.get(CACHE_NAME)) {
    // Note that we could host this list in an external file by XHR-ing it in.
    var c = new Cache([
      // Relative URLs are resolved based on the location of ctrl.js
      "/1/app.js", // versioned resources are still a good idea
      "/1/images/cat.gif",
      "/app.html",
      // Cross-origin caching is fine. Note, however, that no cookies are sent
      // with the request.
      "http://cdn.com/video.webm",
      // Our fallback for /browse:
      "/browse/fallback.html"
    ]);
    this.caches.set(CACHE_NAME, c);
  }
};

// No "request" events are dispatched until after the "update" event is
// processed, but that doesn't mean all the resources are in our cache yet. We
// still need to check to see if our cache is complete before trying to use it.
this.onfetch = function(e) {
  var exampleAppCache = this.caches.get(CACHE_NAME);
  // Look for top-level requests for "/browse" and, if offline, serve up the
  // fallback if we have one:
  if (e.request.url == (new Url("/browse")) && !this.onLine) {
    // Look to see if we have it in the cache:
    var resource = exampleAppCache.match("/browse/fallback.html");
    if (resource) {
      // We know now that we're offline *and* have the fallback content to
      // serve, so prevent faulting all the way to the network:
      e.preventDefault();
      e.respondWith(resource);
      return;
    }
  }

  // If we get a top-level request to go to "/app" and already have a window
  // whose location matches "/app", send focus to it instead of re-loading it,
  // also send a message to the app telling it what to do.
  if (e.type == "toplevel") {
    // We only get "toplevel" requests for windows which are attempting to
    // navigate to some bit of URL space that is matched by our registration
    // scope. It's only when we are responding to a top-level that we can call
    // someOtherWindow.focus(); it'll throw an exception at other times. You have
    // been warned = )
    var appUrl = new Url("/app");
    if(e.request.url == appUrl) {
      // Look to see if we already have one:
      var apps = this.windows.filter(function(w) {
        return w.location == appUrl;
      });

      if(apps.length) {
        // Pick one and focus it.
        var a = apps[0];
        // Cancel the navigation
        e.preventDefault();
        // Focus the existing app
        // NOTE: focus() is the root of some dispute and may not be added.
        a.focus();
        // And tell it what's going on:
        a.postMessage("someAppSpecificFocusPayload");
        return;
      }
    }
  }
};

this.onconnect = function(e) {
  // Whenver a new window from a URL we control is created, a connect message is
  // automatically sent. From here, we can send messages back to that window
  // or any other on the same origin
};
```

## The Controller Model

Like the legacy AppCache, controllers are not installed globally for an origin. Instead, they "claim" some bit of URL space in the origin of the page which installs them. Each page, then, matches to one or zero custom controllers at any time. The easiest way to think of this is that there is *always* a controller available (the default one provided by the browser). It's how applications get bootstrapped. Once there, apps can install their own controllers which pass through to the default controller if they choose not to respond to a request.


## Origin Restrictions

Controller scripts can be _from_ any origin. Likewise, resources in a `Cache` can be from any origin, and readable when allowed via CORS headers.

## Understanding Controller/Page Mapping

A Controller acts like a single "server" for (potentially) many pages (tabs, roughly). A page has a  Communications between these pages and the server is entirely asynchronous to ensure that one badly behaving page (or controller) can't sink many others. Browsers will place tight timeout deadlines on controllers, bypassing them if they do not respond quickly enough, so the key to writing a good controller is to ensure that your `onresource` handlers return quickly. That doesn't mean they need to hand back a response immediately, but if they are likely to do a lot of work in the process of responding, that should happen asynchronously.

Controllers may come and go based on the whim of browsers, a key reason why `controller.register()` and `controller.ready()` are asynchronous.

TODO(slightlyoff)

## Building & contributing

Make edits in the typescript file (controller.ts), the JavaScript file is built from it. Building the JS version yourself isn't essential, but here's how:

Requirements:

* [Node.js](http://nodejs.org/) v0.8.15+

Installing dependencies:

```sh
# From the root of the project directory
npm install
```

Building:

```sh
# From the root of the project directory
./build.sh
```