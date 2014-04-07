<!-- TODO(slightlyoff)
  - Cover cache updating and script caching
-->
<h2>ServiceWorkers Explained</h2>

<!-- patterned after:
https://dvcs.w3.org/hg/webcomponents/raw-file/d7d1b718de45/explainer/index.html
-->

## What's All This Then?

ServiceWorkers are a new feature for the web platform that lets a script persistently cache resources and handle all resource requests for an application -- even when the network isn't available. Putting it all together, ServiceWorkers give you a way to build applications that work offline.

You might now be thinking "yeah, but what about the [HTML5 Application Cache (aka "AppCache")](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html)"...didn't it solve this? Good question. AppCache is declarative -- you give the browser a manifest and magic happens. This has [well-documented limitations](http://alistapart.com/article/application-cache-is-a-douchebag) that ServiceWorkers work around by giving developers the lower-level primitives that AppCache might be described in terms of. ServiceWorkers, then, are the explanation for the magic of AppCache.

This document is designed to help you understand the basic concepts of ServiceWorkers, how they interact, and how to start thinking about building apps with them in mind.

## From Pages to Apps

Imagine a simple movie application. To be useful, it must allow users to browse some library of content for purchase or download while online and view videos both on and offline. Sure, there could be online-only video applications...but what's the fun in that? Airplanes, buses, and mobile-roaming are key moments when we can all use a bit of _Pulp Fiction_ or _Lawrence of Arabia_ in our lives.

One way to think of this might be "taking a web-page offline", but that's far too simple. Any good video app will have an inventory that far outstrips the capacity of a modern portable device, so the challenge isn't so much to "go offline" as to "identify a subset of content to synchronize and manage that data over time". To do that synchronization and management, an app will need some sort of "explorer" view to help users understand what's available locally and what _could_ be available were they to select/purchase/download additional content.

Turns out the same story is repeated in nearly every sort of application you might think of: email clients tend to only have a snapshot of some of your mail and perform synchronization to get more. Same for magazines. And games with downloadable levels. Even twitter clients and RSS readers fit the same basic story: shell + content == app.

Legacy offline solutions for HTML haven't made building applications in this model natural, URL-friendly, or scalable. Yet these are the qualities that developers demand of a productive platform.

Enter the ServiceWorker.

A ServiceWorker is a bit of script that can listen for network events, (such as resource requests) manage content caches, and thus decide what content to display when a URL is requested.

In our video example, one cache might be built/managed to help make sure that the shell of the application is available offline. Another might be built to represent the downloaded videos. Yet another might be built to keep a local inventory of ads or trailers to show before movies play. Each of these caches are effectively independent bits of content, joined at runtime by the application -- and ServiceWorkers mediate how applications come into being.

## Bootstrapping With a ServiceWorker

ServiceWorkers are installed by web pages. A user must visit a page or app for the process to start. The page must also be served over SSL. Let's assume our page is `https://videos.example.com/index.html`. From there, script on that page might install a ServiceWorker with code like this:

```html
<!DOCTYPE html>
<!-- https://videos.example.com/index.html -->
<html>
  <head>
    <script>
      // scope defaults to "/*"
      navigator.serviceWorker.register("/assets/v1/worker.js").then(
        function(serviceWorker) {
          console.log("success!");
          serviceWorker.postMessage("Howdy from your installing page.");
          // To use the serviceWorker immediately, you might call window.location.reload()
        },
        function(why) {
          console.error("Installing the worker failed!:", why);
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

The ServiceWorker itself is a bit of JavaScript that runs in a context that's very much like a [shared worker](http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers "HTML5 Shared Workers").

The browser now attempts to download and "install" `worker.js`; a process covered later in this document. Once it is successfully installed, our `success!` message will be sent to the console and, crucially, the next time the user visits `index.html` or any other page located at `https://videos.example.com/`, `worker.js` will be consulted about what to do and what content to load -- even if the device has no internet connection. On pages that are "controlled" in this way, other resources (like the image in the body) are also requested first from `worker.js` before the normal browser cache is consulted for them.

### Controlled & Uncontrolled Documents

The first time `https://videos.example.com/index.html` is loaded, all the resources it requests will come from the network. That means that even if the browser runs the install snippet for `worker.js`, fetches it, and finishes installing it before it begins fetching `logo.png`, the new ServiceWorker script won't be consulted about loading `logo.png`. This is the first rule of ServiceWorkers:

> Documents live out their whole lives using the ServiceWorker they start with.

This means that if a document starts life _without_ a ServiceWorker it won't suddenly get a ServiceWorker later in life, even if one is installed for a matching bit of URL space during the doucment's lifetime. This means documents that are loaded with a ServiceWorker which might later call `navigator.serviceWorker.unregister("/*")` do not become controlled by that worker. Put another way, `serviceWorker.register()` and `serviceWorker.unregister()` only affect *subsequent* navigations.

This is good for a couple of important reasons:

  - Graceful fallback. Browsers that don't yet understand ServiceWorkers will still understand these pages.
  - [Good URLs are forever](http://www.w3.org/Provider/Style/URI). Apps that respect some URLs with a ServiceWorker should do sane things without the SW in play. This is good for users and good for the web.
  - Reasoning about a page that gets a ServiceWorker halfway through its lifetime -- or worse, has its ServiceWorker replaced -- is complicated. Allowing apps to opt into this (complicated) power is good, but making it the default is make-work for most apps.

## A Quick Game of `onfetch`

Once installed, ServiceWorkers can choose to handle resource requests. A navigation that matches the ServiceWorker's origin and scope will be handled by the ServiceWorker.

Here's an example of a ServiceWorker that only handles a single resource (`/services/inventory/data.json`) but which logs out requests for all resources it is consulted for:

```js
// hosted at: /assets/v1/worker.js
this.version = 1;

var base = "https://videos.example.com";
var inventory = new URL("/services/inventory/data.json", base) + "";

this.addEventListener("install", function(e) {
});

this.addEventListener("fetch", function(e) {
  var url = e.request.url;
  console.log(url);
  if (url == inventory) {
    e.respondWith(new Response({
      statusCode: 200,
      body: JSON.stringify({
        videos: { /* ... */ }
      })
    }));
  }
});
```

This simple example will always produce the following output at the console when we load a tab with `https://videos.example.com/index.html`:

```
> https://videos.example.com/index.html
> https://videos.example.com/assets/v1/base.css
> https://videos.example.com/assets/v1/app.js
> https://videos.example.com/services/inventory/data.json
> https://videos.example.com/assets/v1/logo.png
```

The contents of all but the inventory will be handled by the normal browser resource fetching system because the `onfetch` event handler didn't call `respondWith` when invoked with their requests. The first time the app is loaded (before the ServiceWorker is installed), `data.json` will also be fetched from the network. Thereafter it'll be computed by the ServiceWorker instead. The important thing to remember here is that _normal resource loading is the fallback behavior for fetch events_.

When combined with access to [IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB) and a new form of Cache (covered below), the ability to respond with arbitrary content is incredibly powerful. Since installed ServiceWorkers are invoked even when offline, ServiceWorkers enable apps that are "offline by default" once installed.

## Mental Notes

A few things to keep in mind. The second rule of ServiceWorkers is:

> ServiceWorkers may be killed *at any time*.

That's right, the browser might unceremoniously kill your ServiceWorker if it's idle, or even stop it mid-work and re-issue the request to a different instance of the worker. There are no guarantees about how long a ServiceWorker will run. ServiceWorkers should be written to avoid holding global state. This can't be stressed enough: _write your workers as though they will die after every request_.

_Service Workers are shared resources_. A single worker might be servicing requests from multiple tabs or documents. Never assume that only one document is talking to a given ServiceWorker. If you care about where a request is coming from or going to, use the `.window` property of the `onfetch` event; but don't create state that you care about without serializing it somewhere like [IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB).

This should be familiar if you've developed servers using Django, Rails, Java, Node etc. A single instance handles connections from many clients (documents in our case) but data persistence is handled by something else, typically a database.

Lastly, exceptions or syntax errors that prevent running a ServiceWorker will ensure that the worker won't be considered successfully installed and won't be used on subsequent navigations. It pays to test.

### Resources & Navigations

Since loading documents and apps on the web boils down to an [HTTP request](http://shop.oreilly.com/product/9781565925090.do) the same way that any other sort of resource loading does, an interesting question arises: how do we distinguish loading a document from loading, say, an image or a CSS file that's a sub-resource for a document? And how can we distinguish between a top-level document and an `<iframe>`?

A few properties are made available on the `onfetch` event to help with this. Since the browser itself needs to understand the difference between these types of resource requests -- for example, to help it determine when to add something to the back/forward lists -- exposing it to a ServiceWorker is only natural.

Let's say we want a ServiceWorker that only handles top-level document navigations; that is to say, doesn't handle any `<iframes>` or requests for sub-resources like scripts, images, stylesheets or any of the rest. Here's how the most minimal version would look:

```js
// top-level-only-service-worker.js
this.addEventListener("install", function(e) {
});

this.addEventListener("fetch", function(e) {
  if (e.type == "navigate" && e.isTopLevel == true) {
    e.respondWith( /* ... */ );
  }
});
```

### URLs, Domains, and Registrations

Now that we've started to talk about `<iframe>`s, another question comes up: what if a controlled document from `video.example.com` loads an iframe from `www.example.net` which has previously registered a ServiceWorker using `navigator.serviceWorker.register("/worker.js")`?

`video.example.com` and `www.example.net` are clearly different domains...should the ServiceWorker for `video.example.com` (registered with the path `/*`) get a crack at it? Because the web's same-origin security model guarantees that documents from different domains will be isolated from each other, it would be a huge error to allow `video.example.com` to return content that would run in the context of `www.example.net`. Code on that page could read cookies and databases, abuse sessions, and do all manner of malicious stuff.

What happens instead in the scenario is that all navigations -- top level or not -- for `www.example.net` are handled by the ServiceWorker located at `https://www.example.net/worker.js`. The ServiceWorker on `video.example.com` won't get an `onfetch` event for this iframe, but it would if the iframe's `src` property were set to `https://video.example.com/subcontent.html` or any other page on `https://video.example.com`.

Another interesting question: what happens if there are two registrations that might match?

For instance, what if `https://www.example.com/foo.html` contains:

```html
<!DOCTYPE html>
<!-- https://www.example.com/foo.html -->
<html>
  <head>
    <script>
      navigator.serviceWorker.register("/foo_worker.js", { scope: "/foo*"});
    </script>
  </head>
</html>
```

While `https://www.example.com/foo/bar.html` contains:

```html
<!DOCTYPE html>
<!-- https://www.example.com/foo/bar.html -->
<html>
  <head>
    <script>
      navigator.serviceWorker.register("/foo/bar_worker.js", { scope: "/foo/bar*" });
    </script>
  </head>
</html>
```

Turns out this is allowed, largely to prevent ServiceWorker scripts from becoming a point of contention across teams. If it were only possible to have one ServiceWorker per domain, sites with many different code-bases cooperating under one umbrella might find it very difficult to coordinate if they hadn't started by putting all apps on separate sub-domains.

#### Longest-Prefix Matching

To break what might otherwise be ties when matching URLs, navigations are mapped to ServiceWorkers by longest-prefix-match. Note that the `*` can only occur _at the end_ of a matching rule, so attempts to register `/foo/*/bar` or `*bar` will throw exceptions. Similarly, registering a pattern that includes a "?" or "#" will also throw exceptions.

In the above example with registrations for `/foo*` and `/foo/bar*`, the following matches would be made when navigating to the following URLs under `https://www.example.com`:

```
/foo                        -> /foo_worker.js
/foo?blarg                  -> /foo_worker.js
/foo/                       -> /foo_worker.js
/foo/thinger.html           -> /foo_worker.js
/foobar.html                -> /foo_worker.js
/foo/other/thinger.html     -> /foo_worker.js
/foo/bar                    -> /foo/bar_worker.js
/foo/bar/                   -> /foo/bar_worker.js
/foo/bar/thinger.html       -> /foo/bar_worker.js
/foo/bar/baz/thinger.html   -> /foo/bar_worker.js
/index.html                 -> <fallback to native>
/whatevs/index.html         -> <fallback to native>
```

<!--
  FIXME(slightlyoff): what happens for registrations like:
    "/foo*"
    "/foo"
  when you then browse to "/foo"?
-->

"fallback to native" is the browser's built-in behavior for fetching resources -- the thing the Fetch Service defers to when it doesn't handle a fetch with `e.respondWith()`.

Note: if `e.respondWith()` isn't called when handling a connection in `/foo/barServiceWorker.js`, it does not cascade to `/fooServiceWorker.js`, it falls back to the browser's built-in network behavior.

One more note: Last-registration wins. If two pages on a site are visited in order and both register a ServiceWorker for `"/*"` (or any other identical path), the second page visited will have its ServiceWorker installed. Only when the specified ServiceWorker scripts are identical byte-for-byte will there appear not to have been any change. In all other cases, the upgrade dance is performed (see below) and the last registration is now the effective one.

#### Registrations Map Navigations, Documents Map Fetches

It's important to understand that `navigator.serviceWorker.register()` _only affects navigations_. Let's imagine for just a minute that we have a server that will hand back HTML or JSON for a given URL depending on whether the query parameter `?json=1` is included. Let's say this resource is hosted at `https://www.example.com/services/data`.

Now, let's assume the page served by browsing to that URL is:

```html
<!DOCTYPE html>
<!-- https://www.example.com/services/data -->
<html>
  <head>
    <script>
      navigator.serviceWorker.register("/services/data/worker.js", { scope: "/services/data" });
    </script>
  </head>
</html>
```

What happens when we visit `https://www.example.com/index.html` that includes:

```html
<!DOCTYPE html>
<!-- https://www.example.com/index.html -->
<html>
  <head>
    <script>
      navigator.serviceWorker.register("/worker.js", { scope: "/*" });
    </script>
    <script src="/services/data?json=1"></script>
  </head>
  <body>
    <iframe src="/services/data"></iframe>
</html>
```

Assuming a user visits them in order and both ServiceWorker install successfully, what happens the next time that user visits `/index.html`? What ServiceWorker is used for `/services/data?json=1`?

The answer hinges on how requests map to ServiceWorkers. The third rule of ServiceWorkers is:

> All _resource requests_ from a controlled document are sent to _that
> document's_ ServiceWorker.

Looking back at our `index.html`, we see two different request types: a navigation for an `<iframe>` and a resource request for a script. Since iframe loading is a navigation and not a "naked" resource request, it matches the rules for longest-prefix, an instance of `/services/data/worker.js` is started and a single `onfetch` is dispatched to it. The script loading, on the other hand, is a sub-resource request and not a navigation, so it's send to the instance of `/worker.js` that was started when the user initially navigated to `https://www.example.com/index.html`, either by typing it into the address bar or clicking on a link that took them there.

Since resource requests (not navigations) are always sent to the ServiceWorker for the document it is issued from, and since documents always map to the ServiceWorkers they're born with, our script request will be send to `/worker.js` and not `/services/data/worker.js`.

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the fetching/matching
-->

#### ServiceWorkers Do Not Control Requests For ServiceWorkers

At this point it might seem as though a bit of script executing a registration from a page that is itself controlled might generate a sub-resource request for a ServiceWorker that might be satisfied by the current ServiceWorker! Luckily the system explicitly prevents such an Inception-like event from ever happening by treating all fetches and resource loads for ServiceWorkers and their sub-resources as "naked" fetches against the browser's default HTTP behavior.

A minor caveat is that ServiceWorker scripts are never [heuristically cached](http://www-archive.mozilla.org/projects/netlib/http/http-caching-faq.html) and when updated are assumed stale if last fetched over 24 hours ago. But those features only ensure that apps can't screw themselves over with one ill-placed `Expires` header. If the browser checks for an updated version and doesn't find anything different (i.e., they're the same bytes) or can't fetch it at all for some reason (an HTTP error code), nothing happens. If an updated version is found, the upgrade process is started (see below). All of this happens outside of the "controlled" world, for better and for worse.

#### Last-Registration-Wins

The registration system is also last-registration-wins. That means if two pages on `www.example.com` set a registration to control `/*`, the one a user visits second (assuming the first doesn't interfere) will be installed and over-write the previous registration.

This makes sense because registration is the same as replacement. That is to say, if you have content that wants to replace the existing ServiceWorker with one at a different URL (perhaps a heavy-handed form of "new version"), registering the new URL is the way that you indicate that the old registration is no longer the preferred one.

### Caching

So far we've only seen responses that are generated by code. This is an interesting, but not likely common case. Most often web apps are built as sets of resources in a directory or on a disk, wired together with html and re-constituted as a while by the browser at runtime. It's a good model that has served us well for more than a decade, allowing near endless flexibility in application architecture and the ability to scale services massively.

REST and good URL design have particularly stood the test of time as patterns that we abandon at our own risk. As a result, modern frameworks and thoughtful developers expend great care when working to compose HTML, CSS, and scripts that can be distributed to CDNs and perform well.

A major challenge for developers attempting to bring web apps to the offline world has been the unfriendliness of existing solutions to the workflow of "put things on disk, visit URL, hit ctrl-r". ServiceWorkers, in contrast, enable a straightforward model that gives developers explicit control over what/when/how to cache resources without adding layers of indirection which they cannot control.

In fact, our first example ServiceWorker, coupled with [IndexedDB](https://developer.mozilla.org/en-US/docs/IndexedDB) and XHR might be all that's *technically* necessary to build a programmatic offline solution. It would, however, be a royal pain in the ass to use -- either because developers would need to make or find large-ish libraries to managed fetching/storing/retrieving resources or because XHR doesn't provide all the power that's strictly necessary.

This is where the global `caches` map comes in. Each ServiceWorker has a global `caches` Map which holds instances of `Cache`. A `Cache` is just what it sounds like: a repository of stored `Response` objects; or in this case, `Promise`s which represent `Response`s which may or may not yet be available from the network.

Using `Cache`s is perhaps simpler than talking about them, so here's some tiny example code that implements the `oninstall` event, starts populating a single `Cache` with content, and tells the system that the ServiceWorker is ready if-and-only-if all the resources in the cache are downloaded.

```js
// caching.js
this.version = 1;

var base = "https://videos.example.com";
this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  // URLs are relative to the ServiceWorker
  var shellResources = new Cache(
    base + "/assets/v1/base.css",
    base + "/assets/v1/app.js",
    base + "/assets/v1/logo.png",
    base + "/assets/v1/intro_video.webm",
  );

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());

  // Add Cache to the global so it can be used later during onfetch
  caches.set("shell-v1", shellResources);
});
```

`Cache` objects contain an `items` map which contains `Promise`s for each of the resources, keyed by their absolute URL. When all of the resources added to a cache are downloaded successfully, the `Promise` vended by `.ready()` completes successfully. Our example wires that up to the resolution to the completion of installation, meaning this ServiceWorker won't be "activated" until at least that set of resources is cached and ready. Pretty neat.

### Serving Cached Resources

Now that we've got some resources in a cache, what can we do with 'em?

Most of the ServiceWorker interfaces that can take `Response` instances are designed to also work with `Promise`s that wrap `Response`s. Here's an expanded version of `caching.js` that adds an `onfetch` handler to serve the URLs in question:

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

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());

  // Add Cache to the global so it can be used later during onfetch
  caches.set("shell-v1", shellResources);
});

this.addEventListener("fetch", function(e) {
  // No "onfetch" events are dispatched to the ServiceWorker until it
  // successfully installs.

  // All operations on caches are async, including matching URLs, so we use
  // Promises heavily. e.respondWith() even takes Promises to enable this:
  e.respondWith(caches.match(e.request));
});
```

The behavior of `respondWith()` is conditional: if the cache returns a valid `Response`, that is what is sent back to the requesting document. If the `Promise` generated by `match()` returns anything else or resolves as an error, the request is then routed to the browser's HTTP stack (as would happen without the ServiceWorker).

The `caches.match()` dance is a bit wordy, so to cut this short there's a `match` convenience method on the global `caches` object to make our `onfetch` handler shorter. It looks through all the caches until it finds an entry that matches. It's possible to have multiple caches with entries for the same URL, in this case you get the first set. You can provide the cache name as the second argument if you want to be specific:

```js
this.addEventListener("fetch", function(e) {
  // Abbreviated onfetch handler
  e.respondWith(caches.match(e.request, "shell-v1"));
});
```

Handy!

### Redirects

HTTP redirects happen whenever a browser receives a `3xx` status code, most often [`302`](http://en.wikipedia.org/wiki/HTTP_302).

Redirection is a fact of life in modern networks, so ServiceWorkers must have something intelligent to say about them. To enable this, a `forwardTo()` method is made available as a convenience in the `onfetch` event. It's functionally the same as creating a `Response`, setting the `.statusCode` to 302, providing a `Location: ...` header, and responding with that. Both work fine, but in most cases `e.forwardTo(urlOrString)` is easier:

```js
this.addEventListener("fetch", function(e) {
  if (e.request.url == oldURL) {
    e.forwardTo(newURL);
  }
  // ...
});
```

The important thing to note is that redirects behave the way they would as if a server had responded with a redirect: the browser will fetch the second resource directly as though it were creating a new request from the new URL. That is to say, if it's a top-level navigation and a ServiceWorker redirects to a different domain (or a bit of the same domain that it doesn't control), it won't get another chance to provide content for the eventual URL. In the case of same-domain & scope navigations and _all_ sub-resource redirects, the new request will be sent back through the `fetch` event listener again.

But wait, doesn't this open up the potential for a loop? It does, but this is a case browsers already detect and handle by terminating the loop after some number of iterations. The same will happen to your requests should you create a loop.

<!-- FIXME(slightlyoff):
  Add a graphic here to show circular fetching and off-domain navigation
  redirects
-->

### Offline & Fallback Content

So now we've got a mechanism to cache things and a way to serve up those cached resources without any server requests...heeeeeey...wait a minute! That sounds like offline!

_Indeed_

ServiceWorkers get first crack at requests, so if an app caches its "shell" (the stuff needed to bootstrap enough UI for navigating content), it's possible to make offline apps using ServiceWorkers. More excitingly still, offline support just sort of falls out of the system naturally. Building ServiceWorker-based apps inverts the model: apps don't have to care about "offline" independently of "just building the app". Cached resources can be used instead of going to the network _all_ the time.

But what to do when some content isn't available? Assume for a second that the video app is loaded and the user tries to visit a library of videos for sale or download -- a list that's far too big and dynamic to reasonably cache client-side, to say nothing of the videos themselves. How do we fallback gracefully and provide a "library not available when offline" message to users?

The error handler in our response `Promise` holds the key:

```js
var base = "https://videos.example.com";
var inventory = new URL("/services/inventory/data.json", base)+"";
var fallbackInventory = new URL("/assets/v1/inventory_fallback.json", base)+"";

// ...

this.addEventListener("fetch", function(e) {
  var url = e.request.url;
  if (url == inventory) {
    e.respondWith(
      fetch(url).then(
        null,
        function() { return caches.match(fallbackInventory); }
      )
    );
  }
});
```

That might take a bit of explaining, particularly if you don't use Promises (aka "Futures") often, but the long and the short of it is that the `fetch` event listener:

  - Gets a `Promise` instance from `fetch`
  - If it resolves successfully (that is, gets what it wanted from the network), that's the value passed to the page. Simple.
  - If not, the `.then()` function adds a callback to handle the error which, in this case, returns some default content. We don't need a callback for the success case here, so that's just specified as `null`.

And _that_ is how we try-online-with-a-fallback! Variations of this might be better for when in flaky network scenarios where a low-ish timeout might be the right way to break the tie. If the browser is offline, our network fetch will either come from the HTTP cache (depending on what's in there and the expiration behaviors) or fail immediately. Either way, the event listener gives the user a useful result. Huzzah!

## ServiceWorker Installation & Upgrade

A couple of examples of installation have been presented so far:

  - ServiceWorkers that don't handle the `oninstall` event at all (in which case they're assumed to have succeeded).
  - ServiceWorkers that create new Caches and delay declaring success for their installation until those Caches are populated.

The biggest scenario that hasn't been touched on yet is upgrades. Recall that browsers check for updated versions of ServiceWorker scripts roughly once a day. What happens if they find a new version?

For the new version (we'll call it "2"), nothing much changes about the process. `oninstall` is dispatched (which it can handle or not) and, if no error occurs, it's the new ServiceWorker-in-waiting.

Wait, "ServiceWorker-in-waiting"?

Yep: recall the first rule of ServiceWorkers: _"Documents live out their whole lives using the ServiceWorker they start with."_

Assume the browser found and installed v2 while a tab that had been born under ServiceWorker v1 was still running. Sure, the ServiceWorker itself might be killed at any time, but any new resource request generated from that window will re-instantiate that version of the ServiceWorker and expect it to service the request.

So what if a new tab is created? Which ServiceWorker does it get, v1 or v2?

### Wait-For-Restart

The default policy is that this new tab will be controlled by v1. This is done to prevent the crazy-town scenario of multiple ServiceWorker versions running at the same time, possibly creating conflicts for IndexedDB schemas, content caches, and the like. Yes, there's a small window during `oninstall` when v2 will be running at the same time as v1, but they won't both be serving content. The advice then is: _don't do irreversible things during `oninstall`_. It's a good place to get a jump on populating caches (with unique names if the new content is reliant on the new ServiceWorker), but a bad place to do things like schema and model upgrades for your app.

The alternative scenario is one in which the new version of your ServiceWorker is discovered and installed and no documents are running against v1. This could happen because:

  - v1 was installed by a page that was loaded "naked", but which was never reloaded so as to start under the ServiceWorker.
  - The browser fetched an update of it's own volition. It's allowed to do that!
  - Between the time `oninstall` started for the v2 ServiceWorker and when `waitUntil()` was finally satisfied, all of the app's windows were closed.

When this happens, v2 instantly becomes the active ServiceWorker, so the next time you navigate to a URL controlled by the registration, v2 would get first crack at it.

Indeed, v2 will become the active ServiceWorker _just as soon as all v1 documents are closed_.

When v2 *does* become the active ServiceWorker, another event -- `onactivate` -- is sent to v2. This happens _before any fetches are dispatched_. This is the ideal time to upgrade database schemas and the like, but be careful not to do too much work. Applications will be blocked from loading while `onactivate` is being serviced (including any extensions asked for via `e.waitUntil()`, which is also available to `onactivate` handlers). Treat `onactivate` as a time to stake your claim as the new version but beware doing more than that lest you make your app unavailable!

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the wait-until-restart lifetime
-->

### Replacement

An alternative policy is available for the daring: a new ServiceWorker can choose to cut-in and replace an existing one. And before you ask, yes, this does break the first rule. But not much.

To replace an existing ServiceWorker, use the `.replace()` method of the `oninstall` event during the event dispatch. In fact, you can even call `.replace()` on the very first install of a ServiceWorker, which will now make your ServiceWorker the proud owner of all windows/tabs whose URLs match the registration origin and scope -- including the page that registered it.

let's clarify with an example: here we'll also compare the versions to ensure that they aren't so far apart that stepping in would break things; leaving the old ServiceWorker in place if the version skew is too great and taking over if it's a difference our new version is confident it can handle. Consider v1.3 vs. v1.0:

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
  caches.set(shellCacheName, shellResources);

  // Prepare an additional cache that we can add items to later
  caches.has(contentCacheName).catch(function() {
    caches.set(contentCacheName, new Cache());
  });

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());

  // If and only if we're less than one major version ahead, cut-in and start
  // serving resources.
  if (parseInt(e.previousVersion) == parseInt(this.version)) {
    // Note: replacement won't happen until the Promise passed to
    // e.waitUntil resolves
    e.replace();
  }
});

// ...onfetch, etc...
```

The `previousVersion` field of the event is filled in using a [structured clone](https://developer.mozilla.org/en-US/docs/DOM/The_structured_clone_algorithm) of the global `version` property set by the last execution of the previous ServiceWorker. It's a good idea both to always set a `version` and, sort of obviously, not to make it something that can't be cloned or which varies.

What of the old ServiceWorker? What happens to it?

<!--
The upgrade dance isn't unilateral. In most cases it's a good idea for the old version to do whatever cleanup it might want to do before handing the reigns to the new whippersnapper. Since replacement is a bit more hairy than wait-for-restart, a separate `onreplaced` event is sent to ServiceWorkers that are about to be replaced.
-->

The replacing ServiceWorker can send a message to the old ServiceWorker in `oninstalled` using `e.previous.postMessage()`. This can blossom into a bi-directional discussion if both sides [have registered `onmessage` handlers](https://developer.mozilla.org/en-US/docs/DOM/window.postMessage), but that's out of the scope of this document for now.

### On Sane Versioning

There's no universally "right" solution to versioning your ServiceWorkers, but a couple of Do's and Dont's can help keep your ServiceWorkers out of trouble and your app in ship-shape:

#### _Do_:

  - Always set a global `version` at the top of your ServiceWorkers. A simple number or string is a good bet.
  - Put cache initialization and loading into your `oninstall`, not `onfetch`.
  - Version your assets and URL endpoints _in the URL_, not a part of the query string.

#### _Don't_:

  - Keep state in global variables inside ServiceWorkers.
  - Call `.replace()` in `oninstall` unless you're darned sure you know what you're doing. It's most often best to let wait-for-restart do its thing.

<!--
## Who's On First?

FIXME(slightlyoff): cover messaging:
  - window to ServiceWorker
  - ServiceWorker to window
  - new-to-old ServiceWorker and vice versa
  - a simple example of "please upgrade now"
-->

## Cross-Origin ServiceWorkers?

Understanding fetches, caches, installation and upgrades are most of what you'll need to successfully use ServiceWorkers to enrich your apps. The performance implications might already be dawning on you, and they can be absolutely profound. And that's before you get to being able to architect for offline-first and provide a seamless experience based around synchronization (not 404 vs. working).

One of the first advanced concerns that major apps hit is "how do I host things from a CDN?" By definition, these are servers in other places, often on other domains, that your content references. Can ServiceWorkers be hosted on CDNs?

No, sorry. But they can include resources (via `importScripts()`) that are.

The reasons for this restriction is that ServiceWorkers create the opportunity for a bad actor to turn a bad day into a bad eternity. Imagine an XSS vulnerability anywhere on a site. An attacker that can run a bit of JS can now request a new ServiceWorker be installed. If that ServiceWorker is registered from  different origin (say, `evil.com`), the ServiceWorker itself can prevent updates to content which might dislodge it. Worse, the original application wouldn't be able to help the users who have been stranded.

By mandating same-origin restrictions for the ServiceWorker script, it's possible for an attacked application to help those users. Their browsers will request ServiceWorker updates from the source origin no less frequently than once a day, meaning an intermittent XSS is a hole that can still be closed.

It may some day be possible to loosen this policy via a new CSP directive, but for now, the best mental model for hosting ServiceWorkers is that the script you pass to `navigator.serviceWorker.register()` must live on the same domain as the document itself. But ServiceWorkers can use `importScripts()` to include other scripts that are hosted elsewhere, e.g. on a CDN.

### `importScripts()` & 3rd-party Routers

Thus far all examples have used `this.addEventListener("fetch", ...)` instead of the perhaps more direct `this.onfetch = ...` syntax. The latter is clearly exclusive while the former isn't. So what happens if we have multiple listeners registered?

Turns out allowing multiple handlers is a feature, not a bug. It enables bits of the overall application to be handled by different handlers.

In `onfetch`, `e.respondWith()` and `e.forwardTo()` behave as though [`e.stopImmediatePropagation()`](https://developer.mozilla.org/en-US/docs/DOM/event.stopImmediatePropagation) has been called, meaning the first handler to respond wins.

In `oninstalled` and `onactivate`, multiple calls to `e.waitUntil()` will ensure that the overall operation isn't considered a success until _all_ the passed `Promise`s are resolved successfully.

This all becomes more relevant when you consider that ServiceWorkers support the general Web Worker API [`importScripts()`](https://developer.mozilla.org/en-US/docs/DOM/Worker/Functions_available_to_workers#Worker-specific_functions). It's important to note that _only the scripts that have been imported the first time the worker is run will be cached along side it by the browser_. The upside is that imported scripts _will_ be downloaded and cached alongside the main ServiceWorker script.

What does that imply? Lots of good stuff. First, ServiceWorkers can import libraries from elsewhere, including other origins and CDNs. Next, Since these scripts can register their own handlers, they can manage bits of the world that they are written to. For instance, a ServiceWorker can include the ServiceWorker bit for a third-party set of widgets or analytics without worrying about the details of the URLs they manage or need.

## Cross-Origin Resources

What if an app wants to cache items that come from a CDN or other domain? It's possible to request many of them directly using `<script>`, `<img>`, `<video>` and `<link>` elements. It would be hugely limiting if this sort of runtime collaboration broke when offline. Similarly, it's possible to XHR many sorts of off-domain resources when appropriate [CORS headers](https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS) are set.

ServiceWorkers enable this by allowing `Cache`s to fetch and cache off-origin items. Some restrictions apply, however. First, unlike same-origin resources which are managed in the `Cache` as `Promise`s for `Response` instances, the objects stored are `Promise`s for `OpaqueResponse` instances. `OpaqueResponse` provides a much less expressive API than `Response`; the bodies and headers cannot be read or set, nor many of the other aspects of their content inspected. They can be passed to `respondWith()` and `forwardTo()` in the same manner as `Response`s, but can't be meaningfully created programmatically. These limitations are necessary to preserve the security invariants of the platform. Allowing `Cache`s to store them allows applications to avoid re-architecting in most cases.

Note that CORS plays an important role in the cross-origin story for many resource types: fonts, images, XHR requests. All cross-origin resources that are fetched by `Cache`s succeed when fetched, but may not display/run correctly when their CORS headers are replayed to the document fetching them.

A few things to keep in mind regarding cross-origin resources that you may cache or request via `fetch()`:

  * You can mix origins, but it might redirect. Consider a request from `example.com/index.html` to `example.com/assets/v1/script.js`. A `fetch` event listener that calls `e.respondWith(caches.match('https://cdn.com/script.js'))` may upset some expectations. From the perspective of the page, this response will be treated as a redirect to whatever the original URL of the response body was. Scripts that interrogate the final state of the page wil see the redirected URL as the `src`, not the original one. The reason for this is that it would otherwise be possible for a page to co-operate with a ServiceWorker to defeat cross-origin restrictions, leaking data that other origins were counting on the browser to protect.
  * CORS does what CORS does. The body of a cross-origin response served with CORS headers won't be readable from a `fetch` (this restriction might be lifted later), but when sent to a document, the CORS headers will be replayed and the document will be able to do anything CORS would have allowed with the content.
  * There's no harm in responding to a cross-origin request with a `new Response()` that you create out of thin air. Since the document in question is the thing that's at risk, and since the other APIs available to you won't allow you undue access to cross-origin response bodies, you can pretend you're any other origin -- so long as the only person you're fooling is yourself.

## Conclusions

This document only scratches the surface of what ServiceWorkers enable,
and aren't an exhaustive list of all of the available APIs available
to controlled pages or ServiceWorker instances. If you have more
questions, they might be answered in the [Advanced Topics
Explainer](advanced_topics.md). Nor does it cover emergent practices
for authoring, composing, and upgrading applications architected to
use ServiceWorkers. It is, hopefully, a guide to understanding the
promise of ServiceWorkers and the rich Promise of offline-by-default
web applications that are URL friendly and scalable.

## Acknowledgments

<!-- TODO: add others who provide feedback! -->

Many thanks to [Web Personality of the Year nominee](http://www.ubelly.com/thecritters/) Jake ("B.J.") Archibald, David Barrett-Kahn, Anne van Kesteren, Michael Nordman, Darin Fisher, Alec Flett, Andrew Betts, Chris Wilson, Aaron Boodman, Dave Herman, Jonas Sicking, and Greg Billock for their comments and contributions to this document and to the discussions that have informed it.

