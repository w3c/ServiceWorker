<h2>Navigation Controllers Explained</h2>

<!-- patterned after:
https://dvcs.w3.org/hg/webcomponents/raw-file/d7d1b718de45/explainer/index.html
-->

## From Pages to Apps

Imagine a simple movie application. To be useful, it must allow users to browse
some library of content for purchase or download while online and view videos
both on and offline. Sure, there could be online-only video applications...but
what's the fun in that? Airplanes, busses, and mobile-roaming are key moments
when we can all use a bit of _Pulp Fiction_ or _Lawrence of Arabia_ in our
lives.

One way to think of this might be "taking a web-page offline", but that's far
too simple. Any good video app will have an inventory that far outstrips the
capacity of a modern portable device, so the challenge isn't so much to "go
offline" as to "identify a subset of content to synchronize and manage that data
over time". To do that synchronization and management, an app will need some
sort of "explorer" view to help users understand what's available locally and
what _could_ be available were they to select/purchase/download additional
content.

Turns out the same story is repeated in nearly every sort of application you
might think of: email clients tend to only have a snapshot of some of your mail
and perform synchronization to get more. Same for magazines. And games with
downloadable levels. Even twitter clients and RSS readers fit the same basic
story: shell + content == app.

Legacy offline solutions for HTML haven't made building applications in this
model natural, URL-friendly, or scalable. Yet these are the qualities that
developers demand of a productive platform.

Enter the Navigation Controller.

A Navigation Controller is a bit of script that manages content caches and
decides what content to display when a URL is requested.

In our video example, one cache might be built/managed to help make sure that
the shell of the application is available offline. Another might be built to
represent the downloaded videos. Yet another might be built to keep a local
inventory of ads or trailers to show before movies play. Each of these caches
are effectively independent bits of content, joined at runtime by the
application -- and Navigation Controllers mediate how applications come into
being.

## Bootstrapping With A Navigation Controller

Navigation Controllers are installed by web pages. A user must visit a page or
app for the process to start. Lets assume our page is
`http://videos.example.com/index.html`. From there, script on that page might
install a controller with code like this:

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

The controller itself is a bit of JavaScript that runs in a context that's very
much like a [shared worker](http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers "HTML5 Shared Workers").

The browser now attempts to download and "install" `ctrl.js`; a process covered
later in this document. Once it is successfully installed, our `success!`
message will be sent to the console and, crucially, the next time the user
visits `index.html` or any other page located at `http://videos.example.com/`,
`ctrl.js` will be consulted about what to do and what content to load -- even if
the device has no internet connection is offline. On pages that are "controlled"
in this way, other resources (like the image in the body) are also requested
first from `ctrl.js` before the normal browser cache is consulted for them.

### Controlled vs. Uncontrolled Documents

The first time `http://videos.example.com/index.html` is loaded, all the
resources it requests will come from the network. That means that even if the
browser runs the install snippet for `ctrl.js`, fetches it, and finishes
installing it before it begins fetching `logo.png`, the new controller script
won't be consulted about loading `logo.png`. This is down to the first rule of
Navigation Controllers:

> Documents live out their whole lives using the controller they start with.

This means that if a document starts life _without_ a controller, even if one is
installed for a matching bit of URL space, it won't suddenly get a controller
later in life. Same goes for documents that are loaded with a controller which
might later call `navigator.controller.unregister("/*")`. Put another way,
`register()` and `unregister()` only affects the *next* document(s).

This is good for a couple of important reasons:

  - Graceful fallback. Browsers that don't yet understand controllers will still
    understand these pages.
  - Developers are less likely to paint themselves into a corner by relying on
    controllers when they shouldn't. If it doesn't work without the controller,
    it'll be obvious the first time a new page is loaded or by unregistering the
    controller. Not ideal for testing, but it beats AppCache and can be made
    better with tools over time.
  - Reasoning about a page that gets a controller halfway through its lifetime
    -- or worse, loses its controller -- is incredibly painful. If an
    uncontrolled page could become controlled, there's a natural tendency to
    stuff core app behavior into the controller and then try to "block" until
    the controller is installed. This isn't webby and it's not a good user
    experience. And given that there's no obvious way to synchronize on
    controller installation gracefully, the patterns that would emerge are
    ghastly even to think about.

## A Quick Game of `onfetch`

Navigation Controllers, once installed, can choose to handle resource loading.
Before going to the normal HTTP cache, a controller is consulted for each
request generated for a document, including the initial document payload itself.

Here's an example of a controller that only handles a single resource
(`/services/inventory/data.json`) but which logs out requests for all resources
it is consulted for:

```js
// hosted at: /assets/v1/ctrl.js
this.version = 1;

var base = "http://videos.example.com";
var inventory = new URL("/services/inventory/data.json", base);

this.addEventListener("fetch", function(e) {
  var url = e.request.url;
  console.log(url);
  if (url == inventory) {
    e.respondWith(new SameOriginResponse({
      statusCode: 200,
      body: JSON.stringify({
        videos: { /* ... */ }
      })
    }));
  }
});
```

This simple example will always produce the following output at the console when
we load a tab with `http://videos.example.com/index.html`:

```
> http://videos.example.com/index.html
> http://videos.example.com/assets/v1/base.css
> http://videos.example.com/assets/v1/app.js
> http://videos.example.com/services/inventory/data.json
> http://videos.example.com/assets/v1/logo.png
```

The contents of all but the inventory will be handled by the normal browser
resource fetching system because the `onfetch` event handler didn't call
`respondWith` when invoked with their requests. The first time the app is loaded
(before the controller is installed), `data.json` will also be fetched from the
network. Thereafter it'll be computed by the controller instead. The important
thing to remember here is that _normal resource loading is the fallback behavior
for controllers_.

When combined with access to [IndexedDB](https://developer.mozilla.org/en-
US/docs/IndexedDB) and a new form of Cache (covered below), the ability to
respond with arbitrary content is incredibly powerful. Since installed
controllers are invoked even when offline, Navigation Controllers enable apps
that are "offline by default" once installed.

## Mental Notes

Before we get into the nitty-gritty of controllers, a few things to keep in mind.
First, the second rule of Navigation Controllers:

> Navigation Controllers may be killed at any time.

That's right, the browser might uncerimonously kill your Controller if it's idle,
or even stop it mid-work and re-issue the request to a different instance of the
controller. There are zero gaurantees about how long a Controller will run. That
means that all Controller scripts must be written in such a way as to avoid
holding lots of global state. This simply can't be stressed enough: _write your
controllers as though they expect to die after every request, only to be revived
for the next one_.

Lastly, remember that _Navigation Controllers are shared resources_. A single
controller might be servicing requests from multiple tabs or documents. Never
assume that only one document can talk to an instance of a controller. If you
need to care about where a request is coming from or going to, use the `.window`
property of the `onfetch` event; but don't create state that you care about
without serializing it somewhere like IndexedDB.

This pattern should be familiar if you've developed content servers using
Django, Rails, Java, Node etc. A single instance handles connections from many
clients (documents in our case) but data persistance is handled by something
else, typically a database.

### Resources vs. Navigations

Since loading documents and apps on the web boils down to an [HTTP
request](http://shop.oreilly.com/product/9781565925090.do) the same way that any
other sort of resource loading does, an interesting question arises: how do we
distingiush loading a document from loading, say, an image or a CSS file that's
a sub-resource for a document? And how can we distinguish between a top-level
document and an `<iframe>`?

A few properties are made available on `onfetch` event to help with this. Since
the browser itself needs to understand the difference between these types of
resource requests -- for example, to help it determine when to add something to
the back/forward lists -- exposing it to a Navigation Controller is only
natural.

Lets say we want a controller that only handles top-level document navigations;
that is to say, doesn't handle any `<iframes>` or requests for sub-resources
like scripts, images, stylesheets or any of the rest. Here's the most minimal
version would look:

```js
// top-level-only-controller.js
this.addEventListener("fetch", function(e) {
  if (e.type == "navigate" && e.isTopLevel == true) {
    e.respondWith( /* ... */ );
  }
});
```

The `type` attribute is a string that can be either `"navigate"` or `"fetch"`.
Navigations happen any time a resource request corresponds to the location of a
document changing. Note that in the first draft of this spec, this doesn't
include "internal" navigations such as hash-change events, only navigations
that require an http(s) response. This is true for iframes as well as for
top-level documents, so the `isTopLevel` flag helps us distinguish between them.

### URLs, Domains, and Registrations

Now that we've started to talks about iframes, another question comes up: what
if a controlled document from `video.example.com` loads an iframe from
`www.example.net` which has previously registered a controller using
`navigator.controller.register("/*", "/ctrl.js")`?

`video.example.com` and `www.example.net` are clearly different domains...should
the controller for `video.example.com` get a crack at it? Because the web's
same-origin security model gaurantees that documents from different domains will
be isolated from each other, it would be a huge error to allow
`video.example.com` to return content that would run in the context of
`www.example.net`. Code on that page could read cookies and databases,
abuse sessions, and do all manner of malicious stuff.

What happens instead in the scenario is that all navigations -- top level or not
-- for `www.example.net` are handled by the controller located at
`http://www.example.net/ctrl.js`. The document on `video.example.com` won't get
an `onfetch` event for this iframe, but it would if the `src` property were set
to `http://video.example.com/subcontent.html` or any other page on
`http://video.example.com`.

Another interesting question: what happens if there are two registrations that
might match?

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

Turns out this is allowed, largely to prevent controller scripts from becoming a
point of contention across teams. If it were only possible to have one
controller per domain, sites with many different code-bases cooperating under
one umbrella might find it very difficult to coordinate if they hadn't started by putting all apps on separate sub-domains.

#### Longest-Prefix Matching

To break what might otherwise be ties when matching URLs, navigations are mapped
to controllers by longest-prefix-match. Note that the `*` can only occur _at the
end_ of a matching rule, so attempts to register `/foo/*/bar` or `*bar` will
throw exceptions. Similarly, anything after a "?" or "#" in a registration will
be ignored, meaning that `/foo?*` and `/foo#thinger*` are the same as `/foo`.

In the above example with registrations for `/foo*` and `/foo/bar*`, the
following matches would be made when navigating to the following URLs under
`http://www.example.com`:

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

"fallback to native" is the browser's built-in behavior for fetching resources
-- the thing controllers defer to when they don't handle a fetch with
`e.respondWith()`.

Note: if `e.respondWith()` isn't called when handling a connection in
`/foo/barController.js`, it does not cascade to `/fooController.js`, it falls
back to the browser's built-in network behavior.

#### Registrations Map Navigations, Documents Map Fetches

It's important to understand that `navigator.controller.register()` _only
affects navigations_. Lets imagine for just a minute that we have a server that
will hand back HTML or JSON for a given URL depending on whether the query
parameter `?json=1` is included. Lets say this resource is hosted at
`http://www.example.com/services/data`.

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

Assuming a user visits them in order and both controllers install successfully,
what happens the next time that user visits `/index.html`? What controller is
invoked for `/services/data?json=1`?

The answer hinges on how requests map to controllers. The second rule of
Navigation Controllers is:

> All _resource requests_ from a controlled document are sent to _that
> document's_ controller.

Looking back at our `index.html`, we see two different request types: a
navigation for an iframe and a resource request for a script. Since iframe
loading is a navigation and not a "naked" resource request, it matches the rules
for longest-prefix, an instance of `/services/data/ctrl.js` is started and a
single `onfetch` is dispatched ot it. The script loading, on the other hand, is
a sub-resource request and not a navigation, so it's send to the instance of
`/ctrl.js` that was started when the user initially navigated to
`http://www.example.com/index.html`, either by typing it into the address bar or
clicking on a link that took them there. Since resource requests (not
navigations) are always sent to the controller for the document it is issued
from, and since documents always map to the controllers they're born with, our
script request will be send to `/ctrl.js` and not `/services/data/ctrl.js`.

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the fetching/matching
-->

#### Controllers Do Not Control Requests For Controllers

At this point it might seem as though a bit of script executing a registration
from a page that is itself controlled might generate a sub-resource request for
a Controller that might be satisfied by the current controller! Luckily the
system explicitly prevents such an Inception-like event from ever happening by
treating all fetches and resource loads for Controllers and their sub-resources
as "naked" fetches against the browser's default HTTP behavior.

A minor caveat is that Navigation Controller scripts are never [heuristically
cached](http://www-archive.mozilla.org/projects/netlib/http/http-caching-
faq.html) and when updated are assumed stale if last fetched over 24 hours ago.
But those features only ensure that apps can't screw themselves over with one
ill-placed `Expires` header. If the browser checks for an updated version and
doesn't find anything different (i.e., they're the same bytes) or can't fetch
it at all for some reason (an HTTP error code), nothing happens. If an updated
version is found, the upgrade process is started (see below). All of this
happens outside of the "controlled" world, for better and for worse.

#### Last-Registration-Wins

The registration system is also last-registration-wins. That means if two pages
on `www.example.com` set a registration to control `/*`, the one a user visits
second (assuming the first doesn't interfere) will be installed and over-write
the previous registration.

This makes sense because registration is the same as replacement. That is to
say, if you have content that wants to replace the existing controller with one
at a different URL (perhaps a heavy-handed form of "new version"), registering
the new URL is the way that you indicate that the old registration is no longer
the preferred one.

### Caching

So far we've only seen responses that are generated by code. This is an
interesting, but not likely common case. Most often web apps are built as sets
of resources in a directory or on a disk, wired together with html and re-
constituted as a while by the browser at runtime. It's a good model that has
served us well for more than a decade, allowing near endless flexibility in
application architecture and the ability to scale services massively.

REST and good URL design have particularly stood the test of time as patterns
that we abandon at our own risk. As a result, modern frameworks and thoughtful
developers expend great care when working to compose HTML, CSS, and scripts that
can be distributed to CDNs and perform well.

A major challenge for developers attempting to bring web apps to the offline
world has been the unfriendliness of existing solutions to the workflow of "put
things on disk, visit URL, hit ctrl-r". Navigation Controllers, in contrast,
enable a straightforward model that gives developers explicit control over
what/when/how to cache resources without adding layers of indirection which they
cannot control.

In fact, our first example controller, coupled with
[IndexedDB](https://developer.mozilla.org/en- US/docs/IndexedDB) and XHR might
be all that's *technically* necessary to build a programmatic offline solution.
It would, however, be a royal pain in the ass to use -- either because
developers would need to make or find large-ish libraries to managed
fetching/storing/retreiving resources or because XHR doesn't provide all the
power that's strictly necessary.

This is where the global `caches` map comes in. Each Controller has a global
`caches` Map which holds instances of `Cache`. A `Cache` is just what it sounds
like: a repository of stored `Response` objects; or in this case, `Future`s
which represent `Response`s which may or may not yet be available from the
network.

_NOTE: You might know "Future" by the name "Promise". If not, see the [case for
Futures in
DOM](https://github.com/slightlyoff/DOMFuture/blob/master/README.md#futures-
promises-i-dont-speak-your-crazy-moon-language) or an explanation
[here](http://www.xanthir.com/b4PY0)._

Using `Cache`s is perhaps simpler than talking about them, so here's some tiny
example code that implements the `oninstall` event, starts populating a single
`Cache` with content, and tells the system that the Controller is ready if-and-
only-if all the there resources in the cache are downloaded.

```js
// caching.js
this.version = 1;

this.addEventListener("install", function(e) {
  // Create a cache of resources. Begins the process of fetching them.
  // URLs are relative to the controller
  var shellResources = new Cache(
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
```

`Cache` objects contain an `items` map which contains `Future`s for each of the
resources, keyed by their absolute URL. When all of the resources added to a
cache are downloaded successfully, the `Future` vended by `.ready()` completes
successfully. Our example wires that up to the resolution to the completion of
installation, meaning this controller won't be "activated" until at least that
set of resources is cached and ready. Pretty neat.

### Serving Cached Resources

Now that we've got some resources in a cache, what can we do with 'em?

Most of the Navigation Controller interfaces that can take `Response` instances
are designed to also work with `Future`s that wrap `Response`s. Here's an
expanded version of `caching.js` that adds an `onfetch` handler to serve the
URLs in question:

```js
// chaching.js
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

The behavior of `respondWith()` is conditional: if the cache returns a valid
`Response`, that is what is sent back to the requesting document. If the
`Future` generated by `match()` returns anything else or resolves as an error,
the request is then routed to the browser's HTTP stack (as would happen without
the controller).

The `this.caches.get()/.match()` dance is a bit wordy, so to cut this short
there's a `match` convenience method on the global `caches` object to make our
`onfetch` handler shorter but instead of taking one parameter (the URL), it
takes two (the cache name and the URL):

```js
this.addEventListener("fetch", function(e) {
  // Abbreviated onfetch handler
  e.respondWith(this.caches.match("shell-v1", e.request.url));
});
```

Handy!

### Redirects

HTTP redirects happen whenever a browser recevies a `3xx` status code, most
often [`302`](http://en.wikipedia.org/wiki/HTTP_302).

Redirection is a fact of life in modern networks, so Navigation Controllers must
have something intelligent to say about them. To enable this, a `forwardTo()`
method is made available as a convenience in the `onfetch` event. It's
functionally the same as creating a `SameOriginResponse`, setting the
`.statusCode` to 302, providing a `Location: ...` header, and responding with
that. Both work fine, but in most cases `e.forwardTo(urlOrString)` is easier:

```js
this.addEventListener("fetch", function(e) {
  if (e.request.url == oldURL) { e.forwardTo(newURL); }
  // ...
});
```

The important thing to note is that redirects behave the way they would as if
the browser had requested second resource. That is to say, if it's a top-level
navigation and a Controller redirects to a different domain (or a bit of the
same domain that it doesn't control), it won't get another chance to provide
content for the eventual URL. In the case of same-domain & scope navigations and
_all_ sub-resource redirects, the new request will be sent back through the
controller again.

But wait, doesn't this open up the potential for a loop? It does, but this is a
case browsers already detect and terminate fetching for. The same will happen to
your requests should you create a loop.

<!-- FIXME(slightlyoff):
  Add a graphic here to show circular fetching and off-domain navigation
  redirects
-->

### Fallback Content & Offline

<!-- TODO(slightlyoff) -->

## Controller Installation & Upgrade

A couple of examples of installation have been presented so far:

  - Controllers that don't handle the `oninstall` event at all (in which case
    they're assume to have succeeded).
  - Controllers that create new Caches and delay declaring success for their
    installation until those Caches are populated.

The biggest scenario that hasn't been touched on yet is upgrades. Recall that
browsers check for updated versions of controller scripts roughly once a day.
What happens if they find a new version?

For the new version (we'll call it "2"), nothing much changes about the process. `oninstall` is dispatched (which it can handle or not) and, if no error occurs, it's the new controller-in-waiting.

Wait, "controller-in-waiting"?

Yep: recall the first rule of Navigation Controllers: _"Documents live out their
whole lives using the controller they start with."_

Assume the browser found and installed v2 while a tab that had been born under
controller v1 was still running. Sure, the controller itself might be killed at
any time, but any new resource request generated from that window will re-
instantiate that version of the controller and expect it to service the request.

So what if a new tab is created? Which controller does it get, v1 or v2?

### Wait-For-Restart

The default policy is that this new tab will be controlled by v1. This is done
to prevent the crazy-town scenario of multiple controller versions running at
the same, possibly creating conflicts for IndexedDB schemas, content caches, and
the like. Yes, there's a small window during `oninstall` when v2 will be running
at the same time as v1, but they won't both be serving content. The advice then
is: _don't do irreversable things during `oninstall`_. It's a good place to get
a jump on populating caches (hopefully with unique names!), but a bad place to
do things like schema and model upgrades for your app.

The alternative scenario is one in which the new version of your controller is
discovered and installed and no documents are running against v1. This could
happen because:

  - v1 was installed by a page that was loaded "naked", but which was never
    reloaded so as to start under the Controller.
  - The browser fetched an update of it's own volition. It's allowed to do that!
  - Between the time `oninstall` started for the v2 Controller and when
    `waitUntil()` was finally satisfied, all of the app's windows were closed.

When this happens, v2 instantly becomes the active controller, so the next time
you navigate to a URL controlled by the registration, v2 would get first crack
at it.

Indeed, v2 will become the active controller _just as soon as all v1 documents
are closed_.

<!-- FIXME: update with decisions about whatever the .refresh() API might be -->

<!-- FIXME(slightlyoff):
  Add a graphic here to explain the wait-until-restart lifetime
-->

### Replacement

An alternative policy is available for the daring: a new controller can choose
to cut-in and replace an existing one. And before you ask, yes, this does break
the first rule. But not much.

To replace an existing controller, use the `.replace()` method of the
`oninstall` event during the event dispatch. In this example, we'll also compare
the versions to ensure that they aren't so far apart that stepping in would
break things. Here we'll consider v1.3 vs. v1.0:

```js
// chaching.js
this.version = 1.3;

var base = "http://videos.example.com";
var assetBase = base + "/assets/v" + parseInt(this.version) + "/";
var shellCacheName = parseInt(this.version) + " shell resources";
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

  if (!this.caches.has(contentCacheName)) {
    this.caches.set(contentCacheName, new Cache());
  }

  // The coast is only clear when all the resources are ready.
  e.waitUntil(shellResources.ready());

  // If and only if we're less than one major version ahead, cut-in and start
  // serving resources.
  if (parseInt(e.previousVersion) == parseInt(this.version)) {
    e.replace();
  }
});

// ...onfetch, etc...
```

The `previousVersion` field of the event is filled in using a [structured
clone](https://developer.mozilla.org/en-US/docs/DOM/The_structured_clone_algorithm)
of the global `version` property set by the last execution of the previous
controller. It's a good idea both to always set a `version` and, sort of
obviously, not to make it something that can't be cloned or which varies.

What of the old controller? What happens to it?



### On Sane Versioning

There's no universally "right" solution to versioning your controllers, but a
couple of Do's and Dont's can help keep your controllers out of trouble and your
app in ship-shape:

#### _Do_:

  - Always set a global `version` at the top of your controllers. A simple
    number or string is a good bet.
  - Put cache initialization and loading into your `oninstall`, not `onfetch`.
  - Version your assets and URL endpoints _in the URL_, not a part of the query
    string.

#### _Don't_:

  - Keep state in global variables inside controllers.
  - Call `.replace()` in `oninstall` unless you're darned sure you know what
    you're doing. It's most often best to let wait-for-restart do its thing.

<!--
## Who's On First?

FIXME(slightlyoff): cover messaging:
  - window to controller
  - controller to window
  - new-to-old controller and vice versa
  - a simple example of "please upgrade now"
-->

## Cross-Origin Controllers And Resources

### `importScripts()` and 3rd-party Routers

## Acknowledgements

<!-- TODO: add others who provide feedback! -->

Many thanks to B.J. Archibald, David Barrett-Kahn, Anne van Kesteren,
Michael Nordman, Darin Fisher, Alec Flett, Chris Wilson, and  for their comments
and contributions to this document and to the discussions that have informed it.

