<!-- TODO(slightlyoff)
  - Cover cache updating and controller caching
  - Add a way to default-to-network in the API. Perhaps respondWith() without arguments?
-->
<h2>Navigation Controllers Explained</h2>

<!-- patterned after:
https://dvcs.w3.org/hg/webcomponents/raw-file/d7d1b718de45/explainer/index.html
-->

## What's All This Then?

Navigation Controllers are a new feature for the web platform that lets a script persistently cache resources and handle all resource requests for an application -- even when the network isn't available. Putting it all together, Navigation Controllers give you a way to build applications that work offline.

You might now be thinking "yeah, but what about the [HTML5 Application Cache (aka "AppCache")](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html)"...didn't it solve this? Good question. AppCache is declarative -- you give the browser a manifest and magic happens. This has [well-documented limitations](http://alistapart.com/article/application-cache-is-a-douchebag) that Navigation Controllers work around by giving developers the lower-level primitives that AppCache might be described in terms of. Navigation Controllers, then, are the explanation for the magic of AppCache.

This document is designed to help you understand the basic concepts of Navigation Controllers, how they interact, and how to start thinking about building apps with them in mind.

## From Pages to Apps

Imagine a simple movie application. To be useful, it must allow users to browse some library of content for purchase or download while online and view videos both on and offline. Sure, there could be online-only video applications...but what's the fun in that? Airplanes, busses, and mobile-roaming are key moments when we can all use a bit of _Pulp Fiction_ or _Lawrence of Arabia_ in our lives.

One way to think of this might be "taking a web-page offline", but that's far too simple. Any good video app will have an inventory that far outstrips the capacity of a modern portable device, so the challenge isn't so much to "go offline" as to "identify a subset of content to synchronize and manage that data over time". To do that synchronization and management, an app will need some sort of "explorer" view to help users understand what's available locally and what _could_ be available were they to select/purchase/download additional content.

Turns out the same story is repeated in nearly every sort of application you might think of: email clients tend to only have a snapshot of some of your mail and perform synchronization to get more. Same for magazines. And games with downloadable levels. Even twitter clients and RSS readers fit the same basic story: shell + content == app.

Legacy offline solutions for HTML haven't made building applications in this model natural, URL-friendly, or scalable. Yet these are the qualities that developers demand of a productive platform.

Enter the Navigation Controller.

A Navigation Controller is a bit of script that manages content caches and decides what content to display when a URL is requested.

In our video example, one cache might be built/managed to help make sure that the shell of the application is available offline. Another might be built to represent the downloaded videos. Yet another might be built to keep a local inventory of ads or trailers to show before movies play. Each of these caches are effectively independent bits of content, joined at runtime by the application -- and Navigation Controllers mediate how applications come into being.

## Bootstrapping With A Navigation Controller

Navigation Controllers are installed by web pages. A user must visit a page or app for the process to start. Lets assume our page is `http://videos.example.com/index.html`. From there, script on that page might install a controller with code like this:

```html
<!DOCTYPE html>
<!-- http://videos.example.com/index.html -->
<html>
  <head>
    <script>
      navigator.controller.register("/*", "/assets/v1/ctrl.js").then(
        function(controller) {
          console.log("success!");
          controller.postMessage("Howdy from your installing page.");
          // To use the controller immediately, you might call window.location.reload()
        },
        function(why) {
          console.error("Installing the controller failed!:", why);
        });
    </script>
    <link rel="stylesheet" href="/assets/v1/base.css">
    <script src="/assets/v1/app.js"></script>
    <script src="/services/inventory/data.json"></script>
  </head>
  <body>
    <img src="/assets/v1/logo.png" alt="Example App Logo">
  </body>
</html>
```

The controller itself is a bit of JavaScript that runs in a context that's very much like a [shared worker](http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers "HTML5 Shared Workers").

The browser now attempts to download and "install" `ctrl.js`; a process covered later in this document. Once it is successfully installed, our `success!` message will be sent to the console and, crucially, the next time the user visits `index.html` or any other page located at `http://videos.example.com/`, `ctrl.js` will be consulted about what to do and what content to load -- even if the device has no internet connection. On pages that are "controlled" in this way, other resources (like the image in the body) are also requested first from `ctrl.js` before the normal browser cache is consulted for them.

### Controlled & Uncontrolled Documents

The first time `http://videos.example.com/index.html` is loaded, all the resources it requests will come from the network. That means that even if the browser runs the install snippet for `ctrl.js`, fetches it, and finishes installing it before it begins fetching `logo.png`, the new controller script won't be consulted about loading `logo.png`. This is down to the first rule of Navigation Controllers:

> Documents live out their whole lives using the controller they start with.

This means that if a document starts life _without_ a controller, even if one is installed for a matching bit of URL space, it won't suddenly get a controller later in life. Same goes for documents that are loaded with a controller which might later call `navigator.controller.unregister("/*")`. Put another way, `register()` and `unregister()` only affects the *next* document(s).

This is good for a couple of important reasons:

  - Graceful fallback. Browsers that don't yet understand controllers will still understand these pages.
  - Related: [good URLs are forever](http://www.w3.org/Provider/Style/URI). Apps that respect some URLs with a controller should do sane things without one when users navigate to those locations. This is key to "URL-friendly" apps that exhibit the ur-social behaviors that make the web so good for collaboration, sharing, and all the rest.
  - It forces you to have URLs! Some modern apps platforms have foresaken this core principle of the web and suffer for it. The web should never make the same mistake.
  - Developers are less likely to paint themselves into a corner by relying on controllers when they shouldn't. If it doesn't work without the controller, it'll be obvious the first time a new page is loaded or by unregistering the controller. Not ideal for testing, but it beats AppCache and can be made better with tools over time.
  - Reasoning about a page that gets a controller halfway through its lifetime -- or worse, loses its controller -- is incredibly painful. If an uncontrolled page could become controlled, there's a natural tendency to stuff core app behavior into the controller and then try to "block" until the controller is installed. This isn't webby and it's not a good user experience. And given that there's no obvious way to synchronize on controller installation gracefully, the patterns that would emerge are ghastly even to think about.

## A Quick Game of `onfetch`

Navigation Controllers, once installed, can choose to handle resource loading. Before going to the network, a Controller is consulted for each request generated for a document, including the initial document payload itself.

Here's an example of a controller that only handles a single resource (`/services/inventory/data.json`) but which logs out requests for all resources it is consulted for:

```js
// hosted at: /assets/v1/ctrl.js
this.version = 1;

var base = "http://videos.example.com";
var inventory = new URL("/services/inventory/data.json", base);

this.addEventListener("fetch", function(e) {
  var url = e.request.url;
  console.log(url);
  if (url.toString() == inventory.toString()) {
    e.respondWith(new SameOriginResponse({
      statusCode: 200,
      body: JSON.stringify({
        videos: { /* ... */ }
      })
    }));
  }
});
```

This simple example will always produce the following output at the console when we load a tab with `http://videos.example.com/index.html`:

```
> http://videos.example.com/index.html
> http://videos.example.com/assets/v1/base.css
> http://videos.example.com/assets/v1/app.js
> http://videos.example.com/services/inventory/data.json
> http://videos.example.com/assets/v1/logo.png
```

The contents of all but the inventory will be handled by the normal browser resource fetching system because the `onfetch` event handler didn't call `respondWith` when invoked with their requests. The first time the app is loaded (before the controller is installed), `data.json` will also be fetched from the network. Thereafter it'll be computed by the controller instead. The important thing to remember here is that _normal resource loading is the fallback behavior for controllers_.

When combined with access to [IndexedDB](https://developer.mozilla.org/en- US/docs/IndexedDB) and a new form of Cache (covered below), the ability to respond with arbitrary content is incredibly powerful. Since installed controllers are invoked even when offline, Navigation Controllers enable apps that are "offline by default" once installed.

## Mental Notes

Before we get into the nitty-gritty of controllers, a few things to keep in mind. First, the second rule of Navigation Controllers:

> Navigation Controllers may be killed at any time.

That's right, the browser might uncerimonously kill your Controller if it's idle, or even stop it mid-work and re-issue the request to a different instance of the controller. There are zero gaurantees about how long a Controller will run. That means that all Controller scripts must be written in such a way as to avoid holding lots of global state. This simply can't be stressed enough: _write your controllers as though they expect to die after every request, only to be revived for the next one_.

Also, remember that _Navigation Controllers are shared resources_. A single controller might be servicing requests from multiple tabs or documents. Never assume that only one document can talk to an instance of a controller. If you need to care about where a request is coming from or going to, use the `.window` property of the `onfetch` event; but don't create state that you care about without serializing it somewhere like IndexedDB.

This pattern should be familiar if you've developed content servers using Django, Rails, Java, Node etc. A single instance handles connections from many clients (documents in our case) but data persistence is handled by something else, typically a database.

Lastly, this might seem obvious, but if syntax errors prevent running a controller script, or if an exception is thrown in the event handler, the controller won't be considered successfully installed and won't be used on subsequent navigations. It pays to lint and test.

### Resources & Navigations

Since loading documents and apps on the web boils down to an [HTTP request](http://shop.oreilly.com/product/9781565925090.do) the same way that any other sort of resource loading does, an interesting question arises: how do we distingiush loading a document from loading, say, an image or a CSS file that's a sub-resource for a document? And how can we distinguish between a top-level document and an `<iframe>`?

A few properties are made available on `onfetch` event to help with this. Since the browser itself needs to understand the difference between these types of resource requests -- for example, to help it determine when to add something to the back/forward lists -- exposing it to a Navigation Controller is only natural.

Lets say we want a controller that only handles top-level document navigations; that is to say, doesn't handle any `<iframes>` or requests for sub-resources like scripts, images, stylesheets or any of the rest. Here's how the most minimal version would look:

```js
// top-level-only-controller.js
this.addEventListener("fetch", function(e) {
  if (e.type == "navigate" && e.isTopLevel == true) {
    e.respondWith( /* ... */ );
  }
});
```

The `type` attribute is a string that can be either `"navigate"` or `"fetch"`. Navigations happen any time a resource request corresponds to the location of a document changing. Note that in the first draft of this spec, this doesn't include "internal" navigations such as hash-change events, only navigations that require an http(s) response. This is true for iframes as well as for top-level documents, so the `isTopLevel` flag helps us distinguish between them.

Why in the world would we want to distinguish navigations from other types of requests? It's all about URL-friendliness: consider the case where a user is sent a link to a video in example.com's app, e.g.: `http://video.example.com/play/nevergonnagiveyouup`. This is the sort of clean, meaningful, long-lived URL that modern apps strive to create. The primary content hosted there (the video and perahps reviews and discussions related to it) are forever bound to that address. This is a Good Thing (TM). But in most server-generated apps, the core content is also mixed with a bunch of templates and context (much of it specific to the user) before it ever hits the wire. Yes, the URL represents the content, but much of what gets sent to the user is "shell" for that content -- the navigation and UI that enable discovery and viewing of that content.

Now, lets say we've built an app in a more modern style; one that builds much of the UI in script and handles the transitions between bits of content via queries against a local data model. What should happen when the user requests that video? And what if it was in a tab/window that was already displaying content, say at `http://video.example.com/play/honeybadger`. The naive, old-skool thing to do is to unload the old page and reload the entire UI. This, as they say, sucks. It's slow, jarring, and overall a crummy experience. Instead, we'd like to engineer a smooth transition. The Navigation Controller is the key: instead of trying to capture `onbeforeunload` and over-ride the behavior of links, the app can simply allow the navigation, counting on the Controller to avoid unloading the current document (by canceling the event and not responding with any content) and sending a message to the source window to have it do an "internal navigation" in which it replaces part of the document's content without unloading and re-loading everything:

```js
var base = "http://videos.example.com";
this.addEventListener("fetch", function(e) {
  if (e.type == "navigate" && e.isTopLevel == true) {
    // If the app is already loaded in this window, avoid unloading the app
    // and inform it what to do via postMessage()
    if (e.window.location.toString().indexOf(base) == 0) {
      // Note that we don't call e.respondWith() here
      e.stopImmediatePropagation();
      e.window.postMessage({ navigateTo: e.url.toString() });
      return;
    }
  }
});
```

### URLs, Domains, and Registrations

Now that we've started to talk about `<iframe>`s, another question comes up: what if a controlled document from `video.example.com` loads an iframe from `www.example.net` which has previously registered a controller using `navigator.controller.register("/*", "/ctrl.js")`?

`video.example.com` and `www.example.net` are clearly different domains...should the controller for `video.example.com` get a crack at it? Because the web's same-origin security model guarantees that documents from different domains will be isolated from each other, it would be a huge error to allow `video.example.com` to return content that would run in the context of `www.example.net`. Code on that page could read cookies and databases, abuse sessions, and do all manner of malicious stuff.

What happens instead in the scenario is that all navigations -- top level or not -- for `www.example.net` are handled by the controller located at `http://www.example.net/ctrl.js`. The document on `video.example.com` won't get an `onfetch` event for this iframe, but it would if the iframe's `src` property were set to `http://video.example.com/subcontent.html` or any other page on `http://video.example.com`.

Another interesting question: what happens if there are two registrations that might match?

For instance, what if `http://www.example.com/foo.html` contains:

```html
<!DOCTYPE html>
<!-- http://www.example.com/foo.html -->
<html>
  <head>
    <script>
      navigator.controller.register("/foo*", "/fooController.js");
    </script>
  </head>
</html>
```

While `http://www.example.com/foo/bar.html` contains:

```html
<!DOCTYPE html>
<!-- http://www.example.com/foo/bar.html -->
<html>
  <head>
    <script>
      navigator.controller.register("/foo/bar*", "/foo/barController.js");
    </script>
  </head>
</html>
```

Turns out this is allowed, largely to prevent controller scripts from becoming a point of contention across teams. If it were only possible to have one controller per domain, sites with many different code-bases cooperating under one umbrella might find it very difficult to coordinate if they hadn't started by putting all apps on separate sub-domains.

#### Longest-Prefix Matching

To break what might otherwise be ties when matching URLs, navigations are mapped to controllers by longest-prefix-match. Note that the `*` can only occur _at the end_ of a matching rule, so attempts to register `/foo/*/bar` or `*bar` will throw exceptions. Similarly, anything after a "?" or "#" in a registration will be ignored, meaning that `/foo?*` and `/foo#thinger*` are the same as `/foo`.

In the above example with registrations for `/foo*` and `/foo/bar*`, the following matches would be made when navigating to the following URLs under `http://www.example.com`:

```
/foo                        -> /fooController.js
/foo?blarg                  -> /fooController.js
/foo/                       -> /fooController.js
/foo/thinger.html           -> /fooController.js
/foobar.html                -> /fooController.js
/foo/other/thinger.html     -> /fooController.js
/foo/bar                    -> /foo/barController.js
/foo/bar/                   -> /foo/barController.js
/foo/bar/thinger.html       -> /foo/barController.js
/foo/bar/baz/thinger.html   -> /foo/barController.js
/index.html                 -> <fallback to native>
/whatevs/index.html         -> <fallback to native>
```

<!--
  FIXME(slightlyoff): what happens for registrations like:
    "/foo*"
    "/foo"
  when you then browse to "/foo"?
-->

"fallback to native" is the browser's built-in behavior for fetching resources -- the thing controllers defer to when they don't handle a fetch with `e.respondWith()`.

Note: if `e.respondWith()` isn't called when handling a connection in `/foo/barController.js`, it does not cascade to `/fooController.js`, it falls back to the browser's built-in network behavior.

#### Registrations Map Navigations, Documents Map Fetches

It's important to understand that `navigator.controller.register()` _only affects navigations_. Lets imagine for just a minute that we have a server that will hand back HTML or JSON for a given URL depending on whether the query parameter `?json=1` is included. Lets say this resource is hosted at `http://www.example.com/services/data`.

Now, lets assume the page served by browsing to that URL is:

```html
<!DOCTYPE html>
<!-- http://www.example.com/services/data -->
<html>
  <head>
    <script>
      navigator.controller.register("/services/data", "/services/data/ctrl.js");
    </script>
  </head>
</html>
```

What happens when we visit `http://www.example.com/index.html` that includes:

```html
<!DOCTYPE html>
<!-- http://www.example.com/index.html -->
<html>
  <head>
    <script>
      navigator.controller.register("/*", "/ctrl.js");
    </script>
    <script src="/services/data?json=1"></script>
  </head>
  <body>
    <iframe src="/services/data"></iframe>
</html>
```

Assuming a user visits them in order and both controllers install successfully, what happens the next time that user visits `/index.html`? What controller is invoked for `/services/data?json=1`?

The answer hinges on how requests map to controllers. The third rule of Navigation Controllers is:

> All _resource requests_ from a controlled document are sent to _that
> document's_ controller.

Looking back at our `index.html`, we see two different request types: a navigation for an `<iframe>` and a resource request for a script. Since iframe loading is a navigation and not a "naked" resource request, it matches the rules for longest-prefix, an instance of `/services/data/ctrl.js` is started and a single `onfetch` is dispatched ot it. The script loading, on the other hand, is a sub-resource request and not a navigation, so it's send to the instance of `/ctrl.js` that was started when the user initially navigated to `http://www.example.com/index.html`, either by typing it into the address bar or clicking on a link that took them there. Since resource requests (not navigations) are always sent to the controller for the document it is issued from, and since documents always map to the controllers they're born with, our script request will be send to `/ctrl.js` and not `/services/data/ctrl.js`.

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the fetching/matching
-->

#### Controllers Do Not Control Requests For Controllers

At this point it might seem as though a bit of script executing a registration from a page that is itself controlled might generate a sub-resource request for a Controller that might be satisfied by the current controller! Luckily the system explicitly prevents such an Inception-like event from ever happening by treating all fetches and resource loads for Controllers and their sub-resources as "naked" fetches against the browser's default HTTP behavior.

A minor caveat is that Navigation Controller scripts are never [heuristically cached](http://www-archive.mozilla.org/projects/netlib/http/http-caching-faq.html) and when updated are assumed stale if last fetched over 24 hours ago. But those features only ensure that apps can't screw themselves over with one ill-placed `Expires` header. If the browser checks for an updated version and doesn't find anything different (i.e., they're the same bytes) or can't fetch it at all for some reason (an HTTP error code), nothing happens. If an updated version is found, the upgrade process is started (see below). All of this happens outside of the "controlled" world, for better and for worse.

#### Last-Registration-Wins

The registration system is also last-registration-wins. That means if two pages on `www.example.com` set a registration to control `/*`, the one a user visits second (assuming the first doesn't interfere) will be installed and over-write the previous registration.

This makes sense because registration is the same as replacement. That is to say, if you have content that wants to replace the existing controller with one at a different URL (perhaps a heavy-handed form of "new version"), registering the new URL is the way that you indicate that the old registration is no longer the preferred one.

### Caching

So far we've only seen responses that are generated by code. This is an interesting, but not likely common case. Most often web apps are built as sets of resources in a directory or on a disk, wired together with html and re-constituted as a while by the browser at runtime. It's a good model that has served us well for more than a decade, allowing near endless flexibility in application architecture and the ability to scale services massively.

REST and good URL design have particularly stood the test of time as patterns that we abandon at our own risk. As a result, modern frameworks and thoughtful developers expend great care when working to compose HTML, CSS, and scripts that can be distributed to CDNs and perform well.

A major challenge for developers attempting to bring web apps to the offline world has been the unfriendliness of existing solutions to the workflow of "put things on disk, visit URL, hit ctrl-r". Navigation Controllers, in contrast, enable a straightforward model that gives developers explicit control over what/when/how to cache resources without adding layers of indirection which they cannot control.

In fact, our first example controller, coupled with [IndexedDB](https://developer.mozilla.org/en- US/docs/IndexedDB) and XHR might be all that's *technically* necessary to build a programmatic offline solution. It would, however, be a royal pain in the ass to use -- either because developers would need to make or find large-ish libraries to managed fetching/storing/retreiving resources or because XHR doesn't provide all the power that's strictly necessary.

This is where the global `caches` map comes in. Each Controller has a global `caches` Map which holds instances of `Cache`. A `Cache` is just what it sounds like: a repository of stored `Response` objects; or in this case, `Future`s which represent `Response`s which may or may not yet be available from the network.

_NOTE: You might know "Future" by the name "Promise". If not, see the [case for Futures in DOM](https://github.com/slightlyoff/DOMFuture/blob/master/README.md#futures- promises-i-dont-speak-your-crazy-moon-language) or an explanation [here](http://www.xanthir.com/b4PY0)._

Using `Cache`s is perhaps simpler than talking about them, so here's some tiny example code that implements the `oninstall` event, starts populating a single `Cache` with content, and tells the system that the Controller is ready if-and- only-if all the there resources in the cache are downloaded.

```js
// caching.js
this.version = 1;

var base = "http://videos.example.com";
this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  // URLs are relative to the controller
  var shellResources = new Cache(
    base + "/assets/v1/base.css",
    base + "/assets/v1/app.js",
    base + "/assets/v1/logo.png",
    base + "/assets/v1/intro_video.webm",
  );

  // Add Cache to the global so it can be used later during onfetch
  this.caches.set("shell-v1", shellResources);

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());
});
```

`Cache` objects contain an `items` map which contains `Future`s for each of the resources, keyed by their absolute URL. When all of the resources added to a cache are downloaded successfully, the `Future` vended by `.ready()` completes successfully. Our example wires that up to the resolution to the completion of installation, meaning this controller won't be "activated" until at least that set of resources is cached and ready. Pretty neat.

### Serving Cached Resources

Now that we've got some resources in a cache, what can we do with 'em?

Most of the Navigation Controller interfaces that can take `Response` instances are designed to also work with `Future`s that wrap `Response`s. Here's an expanded version of `caching.js` that adds an `onfetch` handler to serve the URLs in question:

```js
// caching.js
this.version = 1;

this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  var shellResources = new Cache(
    "/app.html",
    "/assets/v1/base.css",
    "/assets/v1/app.js",
    "/assets/v1/logo.png",
    "/assets/v1/intro_video.webm",
  );

  // Add Cache to the global so it can be used later during onfetch
  this.caches.set("shell-v1", shellResources);

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());
});

this.addEventListener("fetch", function(e) {
  // No "onfetch" events are dispatched to the controller until it successfully
  // installs.

  var shellResources = this.caches.get("shell-v1");

  // All operations on caches are async, including matching URLs, so we use
  // Futures heavily. e.respondWith() even takes Futures to enable this:
  e.respondWith(shellResources.match(e.request.url));
});
```

The behavior of `respondWith()` is conditional: if the cache returns a valid `Response`, that is what is sent back to the requesting document. If the `Future` generated by `match()` returns anything else or resolves as an error, the request is then routed to the browser's HTTP stack (as would happen without the controller).

The `this.caches.get()/.match()` dance is a bit wordy, so to cut this short there's a `match` convenience method on the global `caches` object to make our `onfetch` handler shorter but instead of taking one parameter (the URL), it takes two (the cache name and the URL):

```js
this.addEventListener("fetch", function(e) {
  // Abbreviated onfetch handler
  e.respondWith(this.caches.match("shell-v1", e.request.url));
});
```

Handy!

### Redirects

HTTP redirects happen whenever a browser receives a `3xx` status code, most often [`302`](http://en.wikipedia.org/wiki/HTTP_302).

Redirection is a fact of life in modern networks, so Navigation Controllers must have something intelligent to say about them. To enable this, a `forwardTo()` method is made available as a convenience in the `onfetch` event. It's functionally the same as creating a `SameOriginResponse`, setting the `.statusCode` to 302, providing a `Location: ...` header, and responding with that. Both work fine, but in most cases `e.forwardTo(urlOrString)` is easier:

```js
this.addEventListener("fetch", function(e) {
  if (e.request.url.toString() == oldURL.toString()) {
    e.forwardTo(newURL);
  }
  // ...
});
```

The important thing to note is that redirects behave the way they would as if a server had responded with a redirect: the browser will fetch the second resource directly as though it were creating a new request from the new URL. That is to say, if it's a top-level navigation and a Controller redirects to a different domain (or a bit of the same domain that it doesn't control), it won't get another chance to provide content for the eventual URL. In the case of same-domain & scope navigations and _all_ sub-resource redirects, the new request will be sent back through the controller again.

But wait, doesn't this open up the potential for a loop? It does, but this is a case browsers already detect and handle by terminating the loop after some number of iterations. The same will happen to your requests should you create a loop.

<!-- FIXME(slightlyoff):
  Add a graphic here to show circular fetching and off-domain navigation
  redirects
-->

### Offline & Fallback Content

So now we've got a mechanism to cache things and a way to serve up those cached resources without any server requests...heeeeeey...wait a minute! That sounds like offline!

_Indeed_

Navigation Controllers get first crack at requests, so if an app caches its "shell" (the stuff needed to bootstrap enough UI for navigating content), it's possible to make offline apps using Navigation Controllers. More excitingly still, offline support just sort of falls out of the system naturally. Building Navigation Controller-based apps inverts the model: apps don't have to care about "offline" independently of "just building the app". Cached resources can be used instead of going to the network _all_ the time.

But what to do when some content isn't available? Assume for a second that the video app is loaded and the user tries to visit a library of videos for sale or download -- a list that's far too big and dynamic to reasonably cache client-side, to say nothing of the videos themselves. How do we fallback gracefully and provide a "library not available when offline" message to users?

The error handler in our response `Future` holds the key:

```js
var base = "http://videos.example.com";
var inventory = new URL("/services/inventory/data.json", base);
var fallbackInventory = new URL("/assets/v1/inventory_fallback.json", base);
var shellResources = this.caches.get("shell-v1");

// ...

this.addEventListener("fetch", function(e) {
  var url = e.request.url;
  if (url.toString() == inventoryURL.toString()) {
    e.respondWith(networkFetch(url).catch(
      shellResources.match.bind(shellResources, fallbackInventory)
    ));
  }
});
```

## Controller Installation & Upgrade

A couple of examples of installation have been presented so far:

  - Controllers that don't handle the `oninstall` event at all (in which case they're assume to have succeeded).
  - Controllers that create new Caches and delay declaring success for their installation until those Caches are populated.

The biggest scenario that hasn't been touched on yet is upgrades. Recall that browsers check for updated versions of controller scripts roughly once a day. What happens if they find a new version?

For the new version (we'll call it "2"), nothing much changes about the process. `oninstall` is dispatched (which it can handle or not) and, if no error occurs, it's the new controller-in-waiting.

Wait, "controller-in-waiting"?

Yep: recall the first rule of Navigation Controllers: _"Documents live out their whole lives using the controller they start with."_

Assume the browser found and installed v2 while a tab that had been born under controller v1 was still running. Sure, the controller itself might be killed at any time, but any new resource request generated from that window will re- instantiate that version of the controller and expect it to service the request.

So what if a new tab is created? Which controller does it get, v1 or v2?

### Wait-For-Restart

The default policy is that this new tab will be controlled by v1. This is done to prevent the crazy-town scenario of multiple controller versions running at the same time, possibly creating conflicts for IndexedDB schemas, content caches, and the like. Yes, there's a small window during `oninstall` when v2 will be running at the same time as v1, but they won't both be serving content. The advice then is: _don't do irreversible things during `oninstall`_. It's a good place to get a jump on populating caches (with unique names if the new content is reliant on the new controller), but a bad place to do things like schema and model upgrades for your app.

The alternative scenario is one in which the new version of your controller is discovered and installed and no documents are running against v1. This could happen because:

  - v1 was installed by a page that was loaded "naked", but which was never reloaded so as to start under the Controller.
  - The browser fetched an update of it's own volition. It's allowed to do that!
  - Between the time `oninstall` started for the v2 Controller and when `waitUntil()` was finally satisfied, all of the app's windows were closed.

When this happens, v2 instantly becomes the active controller, so the next time you navigate to a URL controlled by the registration, v2 would get first crack at it.

Indeed, v2 will become the active controller _just as soon as all v1 documents are closed_.

When v2 *does* become the active controller, another event -- `onactivate` -- is sent to v2. This happens _before any fetches are dispatched_. This is the ideal time to upgrade database schemas and the like, but be careful not to do too much work. Applications will be blocked from loading while `onactivate` is being serviced (including any extensions asked for via `e.waitUntil()`, which is also available to `onactivate` handlers). Treat `onactivate` as a time to stake your claim as the new version but beware doing more than that lest you make your app unavailable!

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the wait-until-restart lifetime
-->

### Replacement

An alternative policy is available for the daring: a new controller can choose to cut-in and replace an existing one. And before you ask, yes, this does break the first rule. But not much.

To replace an existing controller, use the `.replace()` method of the `oninstall` event during the event dispatch. In fact, you can even call `.replace()` on the very first install of a controller, which will now make your controller the proud owner of all windows/tabs whose URLs match the registration origin and scope -- including the page that registered it.

Lets clarify with an example: here we'll also compare the versions to ensure that they aren't so far apart that stepping in would break things; leaving the old controller in place if the version skew is too great and taking over if it's a difference our new version is confident it can handle. Consider v1.3 vs. v1.0:

```js
// caching.js
this.version = 1.3;

var assetBase = "/assets/v" + parseInt(this.version) + "/";
var shellCacheName = "shell-v" + parseInt(this.version);
var contentCacheName = "content";

this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  var shellResources = new Cache(
    assetBase + "/base.css",
    assetBase + "/app.js",
    assetBase + "/logo.png",
    assetBase + "/intro_video.webm",
  );

  // Add Cache to the global so it can be used later during onfetch
  this.caches.set(shellCacheName, shellResources);

  // Prepare an additional cache that we can add items to later
  if (!this.caches.has(contentCacheName)) {
    this.caches.set(contentCacheName, new Cache());
  }

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());

  // If and only if we're less than one major version ahead, cut-in and start
  // serving resources.
  if (parseInt(e.previousVersion) == parseInt(this.version)) {
    // Note: replacement won't happen until the future passed to
    // e.waitUntil resolves
    e.replace();
  }
});

// ...onfetch, etc...
```

The `previousVersion` field of the event is filled in using a [structured clone](https://developer.mozilla.org/en-US/docs/DOM/The_structured_clone_algorithm) of the global `version` property set by the last execution of the previous controller. It's a good idea both to always set a `version` and, sort of obviously, not to make it something that can't be cloned or which varies.

What of the old controller? What happens to it?

The upgrade dance isn't unilateral. In most cases it's a good idea for the old version to do whatever cleanup it might want to do before handing the reigns to the new whippersnapper. Since replacement is a bit more hairy than wait-for-restart, a separate `onreplaced` event is sent to controllers that are about to be replaced.

In all cases, the replacing controller can send a message to the old controller in `oninstalled` using `e.previous.postMessage()`. This can blossom into a bi-directional discussion if both sides [have registered `onmessage` handlers](https://developer.mozilla.org/en-US/docs/DOM/window.postMessage), but that's out of the scope of this document for now.

### On Sane Versioning

There's no universally "right" solution to versioning your controllers, but a couple of Do's and Dont's can help keep your controllers out of trouble and your app in ship-shape:

#### _Do_:

  - Always set a global `version` at the top of your controllers. A simple number or string is a good bet.
  - Put cache initialization and loading into your `oninstall`, not `onfetch`.
  - Version your assets and URL endpoints _in the URL_, not a part of the query string.

#### _Don't_:

  - Keep state in global variables inside controllers.
  - Call `.replace()` in `oninstall` unless you're darned sure you know what you're doing. It's most often best to let wait-for-restart do its thing.

<!--
## Who's On First?

FIXME(slightlyoff): cover messaging:
  - window to controller
  - controller to window
  - new-to-old controller and vice versa
  - a simple example of "please upgrade now"
-->

## Cross-Origin Controllers And Resources

Understanding fetches, caches, installation and upgrades are most of what you'll need to successfully use Navigation Controllers to enrich your apps. The performance implications might already be dawning on you, and they can be absolutely profound, to say nothing of being able to architect for offline-first and provide a seamless experience based around synchronization (not 404 vs. working).

One of the first advanced concerns that major apps hit is "how do I host things from a CDN?" By definition, these are servers in other places, often on other domains, that your content references. Can Navigation Controllers be hosted on CDNs?

Yes!

Turns out that controllers act like regular `<script>` includes for most origin-related purposes: they can be hosted elsewhere but run in the context of the domain that they are included with. Unlike normal scripts, there's no document to tie the Controller's domain to, but all `navigator.controller.register()` calls happen in the context of some domain, and *that* is the domain that the registered controller will be executed in -- even if it's hosted someplace else entirely.

Lets make it concrete. Imagine a generic controller that both `evil.com` and `good.com` want to use. There's no problem at all with them both serving a page that includes:

```html
<!DOCTYPE html>
<!-- served at both:
  http://good.com/app.html
  http://evil.com/bad.html
-->
<html>
  <head>
    <script>
      navigator.controller.register("/*", "http://cdn.example.com/ctrl.js");
    </script>
  </head>
</html>
```

Subsequent navigations to each URL will result in `ctrl.js` being executed, but in the context of `good.com` and `evil.com` respectively. Nothing is shared between them and they update independently. The fourth Rule of Navigation Controllers, then, is that:

> Controllers run in the domain they're registered from.

Third-party cached resources are another interesting area. What if we want to cache items that come from a CDN or other domain? It's possible to request many of them directly using `<script>`, `<img>`, `<video>` and `<link>` elements. It would be hugely limiting if this sort of runtime collaboration broke when offline. Similarly, it's possible to XHR many sorts of off-domain resources when appropriate [CORS headers](https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS) are set.

Navigation Controllers enable this by allowing `Cache`s to fetch and cache off-origin items. Some restrictions apply, however. First, unlike same-origin resources which are managed in the `Cache` as `Future`s for `SameOriginResponse` instances, the objects stored are `Future`s for `CrossOriginResponse` instances. `CrossOriginResponse` provides a much less expressive API than `SameOriginResponse`; the bodies and headers cannot be read or set, nor many of the other aspects of their content inspected. They can be passed to `respondWith()` and `forwardTo()` in the same manner as `SameOriginResponse`s, but can't be meaningfully created programmatically. These limitations are necessary to preserve the security invariants of the platform. Allowing `Cache`s to store them allows applications to avoid re-architecting in most cases.

Note that CORS plays an important role in the cross-origin story for many resource types: fonts, images, XHR requests. All cross-origin resources that are fetched by `Cache`s succeed when fetched, but may not display/run correctly when their CORS headers are replayed to the document fetching them.

### `importScripts()` & 3rd-party Routers

Thus far all examples have used `this.addEventListener("fetch", ...)` instead of the perhaps more direct `this.onfetch = ...` syntax. The latter is clearly exclusive while the former isn't. So what happens if we have multiple listeners registered?

Turns out allowing multiple handlers is a feature, not a bug. It enables bits of the overall application to be handled by different handlers.

In `onfetch`, `e.respondWith()` and `e.forwardTo()` behave as though [`e.stopImmediatePropagation()`](https://developer.mozilla.org/en-US/docs/DOM/event.stopImmediatePropagation) has been called, meaning the first handler to respond wins.

In `oninstalled` and `onactivate`, multiple calls to `e.waitUntil()` will ensure that the overall operation isn't considered a success until _all_ the passed `Future`s are resolved successfully.

This all becomes more relevant when you consider that Navigation Controllers support the general Web Worker API [`importScripts()`](https://developer.mozilla.org/en-US/docs/DOM/Worker/Functions_available_to_workers#Worker-specific_functions). It's important to note that _only the scripts that have been imported the first time the worker is run will be cached along side it by the browser_. The upside is that imported scripts _will_ be downloaded and cached alongside the main controller script.

What does that imply? Lots of good stuff. First, Controllers can import libraries from elsewhere, including other origins and CDNs. Next, Since these scripts can register their own handlers, they can manage bits of the world that they are written to. For instance, a Controller can include the Controller bit for a third-party set of widgets or analytics without worrying about the details of the URLs they manage or need.

## Conclusions

This document only scratches the surface of what Navigation Controllers enable, and aren't an exhaustive list of all of the available APIs available to controlled pages or Controller instances. If you have more questions, they might be asnwered in the [Advanced Topics Explainer](advanced_topics.md). Nor does it cover emergent practices for authoring, composing, and upgrading applications architected to use Controllers. It is, hopefully, a guide to understanding the promise of Navigation Controllers and the rich future of offline-by-default web applications that are URL friendly and scalable.

## Acknowledgments

<!-- TODO: add others who provide feedback! -->

Many thanks to Jake ("B.J.") Archibald, David Barrett-Kahn, Anne van Kesteren, Michael Nordman, Darin Fisher, Alec Flett, Chris Wilson, and Greg Billock for their comments and contributions to this document and to the discussions that have informed it.

