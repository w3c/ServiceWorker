Navigation Controller Design Sketch
====================================

See `controller.js` for the nitty-gritty. What follow are a few examples using
the proposed API:

## Installing a controller

Assume the following is hosted at `http://example.com/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <script>
      // All top-level navigation requests for example.com/* will be routed to
      // the controller once it successfully installs

      // Note: it's safe to call register() instead of ready() in most cases. If
      // "/ctrl.js" is cached and not invalidated, you'll simply start up the
      // controller and be handed a reference to it in your callback, just the same
      // way you would by calling .ready().then(...);
      window.controller.register("/*", "/ctrl.js").then(
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

Once the controller is installed, *all* requests for resources from any page hosted at a URL for which the globbing expression in `register` matches, in this case any page on `http://example.com`, will be sent to the controller. Lets take a look at a simple controller which downloads a list of things to cache and when offline returns a helpful error message for `http://example.com/browse` instead of viewing the page or outright failing:

Assume the following is hosted at `http://example.com/ctrl.js`:

```js
"use strict"
this.onconnect = function(e) {
  // Whenver a new window from a URL we control is created, a connect message is
  // automatically sent. From here, we can send messages back to that window
  // or any other on the same origin
};

this.onupdate = function(e) {
  // The controller has be installed or updated, so install the caches we need:
  if (!this.caches.get("exampleApp")) {
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
    this.caches.set("exampleApp", c);
  }
};

// No "request" events are dispatched until after the "update" event is
// processed, but that doesn't mean all the resources are in our cache yet. We
// still need to check to see if our cache is complete before trying to use it.
this.onrequest = function(e) {
  var exampleAppCache = this.caches.get("exampleApp");
  // Look for top-level requests for "/browse" and, if offline, serve up the
  // fallback if we have one:
  if (e.request.url == "/browse" && !this.onLine) {
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
  // but send a message to the app telling it about other parameters the user may
  // have had in the query.
  if (e.type == "toplevel") {
    // TODO(slightlyoff):
  }
};

```
