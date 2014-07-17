# Implementation Considerations for Service Workers

Or

### _What to Expect When You're Expecting to Implement_

So you've got a browser engine, are looking into this whole "Service Workers" thing and have some questions. Take heart, dear reader! Your friendly spec designers/authors are here to answer your (anticipated) questions. Want more answers? [File a bug](issues) and tag it `implementation-concern`.

This doc looks first at key concepts then outlines the [areas of helpful built-in ambiguity ](//slightlyoff.github.io/ServiceWorker/spec/service_worker/) that provide opportunities to go fast. Each opportunity includes a list of strategies that implementations might explore to improve Service Worker performance.

## Key Concepts

### Event-Driven Workers

The biggest thing to understand about Service Workers is that they are _event driven_. Unlike other forms of [Web Worker](http://www.w3.org/TR/workers/), the lifetime of the script execution context of the worker is not related to documents which have handles to the worker. Instead, Service Workers begin life when events are sent to them, and they can end between events.

The most performance-sensitive of these events is the `fetch` event for top-level document navigation. To ensure that the decision regarding which (if any) Service Worker to boot up to handle a `fetch` event, the spec uses a static tuple of origin + URL pattern to map SW's to navigations. This list will change infrequently and is likely to be something you can cache in memory for fast lookup.

Once a Service Worker is a match for a particular navigation, a Service Worker instance is created (if one isn't already running) using the previously cached scripts. It's reasonable to assume that all of the scripts required to start the worker will be in the local cache at this point, so there's little reason to worry about network speed or flakiness here (disk flakiness is another question entirely, see "Racing Allowed" below).

Next, an event is dispatched to the now-running worker. If the worker's event handler doesn't call `e.respondWith()`, no further script is implicated in servicing the fetch and normal resource loading can proceed as per usual. If the worker _does_ take a crack at responding to the event, the worker's life is typically extended to enable it to do whatever work it needs to do to respond (asynchronously, via the `Promise` provided to `respondWith()`) . Once the worker is done handling the event (or not), the UA _is free to shut the worker down_ and only revive it again for the next event.

It bears repeating: if no event's lifecycle is keeping the SW alive, UA's can shut them down and reclaim whatever resources they might have been using. If this doesn't warm your cold, cold implementer's heart then you might truly be dead inside. The opportunities to trade space for speed (and vice versa) are massive. The freedom to start and end SWs at a time of your choosing is the stuff good optimization strategies are made off.

### Install

Installation of SWs happens as a result of a document calling:

```html
<!-- https://example.com/index.html -->
<script>
  navigator.serviceWorker.register("sw.js");
</script>
```

The SW might be homunculus...dozens of imports, loads of code. This is the web and every terrible thing that authors _can_ do _will_ be done. This looks bad, right?

Turns out that SWs have a defined lifecycle that enables us to think about installation as a separate, asynchronous, potentially long-running phase that _doesn't affect the rest of `index.html`_'s loading process.

Installation can be low-priority, and no documents will be controlled by the SW until it succeeds. That means that it's possible to depend on lots of script and cache many resources in an SW without worrying about the "load time" of the SW itself since all subsequent starts of the SW will come from local disk cache.

### Event Dispatch

SWs lean on the DOM Events as the entry point for nearly all work. The contract that developers must learn is that they must call `e.waitUntil()` or `e.respondWith()` to lengthen the life of the overall operation. All of the APIs available to them are asynchronous, and the combination of these factors implies that SWs are meant to be async by default. The tools at hand lead developers down this path, and cooperative multi-tasking (à la node.js) is the way that libraries must be structured, both for performance and to work naturally with the SW execution model. Lastly, remember that developers can move work off-thread using sub-workers. They'll also be killed along with their parent SWs, but long-running or CPU intensive work that might otherwise cause potential for becoming unresponsive can be delegated to contexts which will not block the SW thread.

## Good News, Everybody!

SWs are designed to enable many optimizations. This section covers some of these opportunities and outlines potential strategies for exploiting them.

_Caveat Emptor_: This document was drafted in early 2014. Architectures and constraints change. The set of areas to consider outlined here is influenced by a lack perfect foreknowledge. Memory and IO might become free. CPU might become expensive. Genetically engineered super-intelligent catdog hybrids may take over the world. YMMV.

### Only Matching Navigations Boot SW's

Lets say `example.com` has a SW registered and `acme.com` embeds the image `https://example.com/images/kittens.gif`. Since the SW matching algorithm is primarily based on _navigations_ and not sub-resource requests, a visit to `acme.com` will _not_ boot the SW for `example.com` for this fetch. Instead, the `onfetch` event is sent to the `acme.com` SW (if there is one).

The need to match navigations may still strike you as a performance burden, but there's reason for hope. First, you're already matching a likely-larger list to provide `:visited` metadata to renderers. Next, the globbing format is designed to be simple to speed matches. Lastly, since a UA may skip a SW entirely, it's feasible for a UA to only match against some set of registered SWs (say, the most recently installed or used).

UAs may even decide to try harder (match against a larger list of SWs) when offline to help provide a better offline experience.

#### Strategies

  * __Keep the match list in memory__
  * __Memory-bound the size of the match list__
  * __Only run matching test against top-level navigations__. Sub-resource requests are always sent to the SW that controls the page (if any) and so don't need to be matched. Only top-level navigations every need to be sent through the matching algorithm.


### Events Implicitly Filter

Only the event handlers registered at the top-level evaluation of the first evaluation (at install time) of a version of a SW script are guaranteed to be dispatched against in the future. That is to say, if a SW script doesn't register an `onfetch` handler _you can avoid ever sending it `fetch` events_. This is a powerful mechanism for trimming the number of times you need to do potentially expensive work by invoking SWs.

#### Strategies

  * __Prune the navigation match list based on `onfetch` handlers__
  * __Warn SW authors that use APIs which would need corresponding handlers which are not registered__. E.g., a call to `navigator.requestSync()` against a SW that doesn't include an `onsync` handler isn't likely to be what the author meant to do.

### Startup _Matters_

The performance of evaluation of the Service Worker script is a key bottleneck to address in ensuring that perceived latency of SW-controlled documents remains low. It isn't possible to send the `fetch` event to the worker until it has been evaluated, potentially including code (via `importScripts()`) from other files.

#### Strategies

  * __Fetch SWs from disk early__. Links in documents to SW-controlled space constitute one of perhaps many available signals about the likelihood that the next navigation will be to space controlled by a SW. As discussed in the matching section, querying to understand if a navigation will match a SW should be made cheap and, therefore, it's possible to imagine that optimizing implementations may try to pre-fetch SW scripts from disk based on speculative matches; e.g. the user typing `microsoft.co` in the address bar is perhaps a strong signal that a frequent visitor of `microsoft.com` will want a registered SW for that origin to be available quickly. As with all speculative optimizations, the real work here is ensuring good hit rates.
  * __Interpret__. JIT-only VMs (like V8) are at a startup-time disadvantage due to the time taken by JIT codegen. SW scripts aren't likely to be compute intensive (and if they are, your engine can detect as much and flag future runs for JITing). Simpler compilation strategies that get the handlers available faster are a good area to investigate inside the SW execution context.
  * __Store SW scripts as a single unit__. Storage locality still matters, even in 2014. Commodity MLC flash latency is _atrocious_, and spinning disk isn't getting (much) faster. Since SW scripts will nearly always require their previously `importScripts()` dependencies (which will be cached as a group), it pays to store them in a format that reduces the number of seeks/reads necessary to get the SW started. Also, remember that install-time is async, so there is time/energy available to optimize the storage layout up-front.
  * __Cache Parse Trees or Snapshot__. SW scripts (and their dependencies) shouldn't change in a single version of the application. Combined with a reduced API surface area, it's possible to apply more exotic strategies for efficiently "rehydrating" the startup execution context of the SW. The spec makes no guarantees about how frequently a SW context is killed and re-evaluated in relationship to the number of overall events dispatched, so a UA is free to make non-side-effecting global startup appear to be a continuation of a previous execution.
  * __Warn on nondeterministic imports__. SWs are likely to be invoked when offline. This means that any scripts included via `importScripts()` that aren't from stable URLs _are likely to break when offline_. UAs can help keep developers on the optimization-friendly path by warning at the console whenever a call to `importScripts()` occurs at a location other than the top-level or is based on a non-static string value.
  * __Warn on non-trivial global work__. Since SWs "pay" for any globally executed code every time they start, it's a good idea for implementations to *_STRONGLY_* discourage doing work outside the defined lifecycle events (`oninstall` and `onactivate`).
  * __Learn storage/DB patterns__. SW's are going to need to lean on IDB for state keeping across invocations and `Cache` objects for dealing with HTTP responses. In both cases it's possible to observe the set of resources most frequently accessed by a particular version of a SW and work to ensure that they're cheaply available by the time the SW is sent a particular event. In particular, speculatively fetching indexes may pay off in some scenarios.
  * __Delay shutdown__. The cheapest SW to start is the one you haven't killed. Optimizing implementations may consider providing a 'grace period' for the shutdown of SW threads to reduce startup time of subsequent events. This strategy can be further refined with semantic awareness about event types. E.g., a top-level navigation to a SW is _likely_ to generate sub-resource fetch events soon after. Shutting down the original SW execution context quickly may be wasteful.

### It's All Async

Aside from `importScripts()`, no synchronous APIs are available to SWs. This is by design. Remaining responsive from the shared SW context requires ensuring that decisions are made quickly and long-running work can be deferred to underlying (asynchronous) systems. No API will be added to the SW execution context that can potentially create cross-context mutex holds (e.g., Local Storage) or otherwise block (e.g., synchronous XHR). This discipline makes it simpler to reason about what it means to be a poorly-written SW script.

#### Strategies

  * __Prioritize the SW thread__. SW execution is likely to be a sensitive component of overall application performance. Ensure it isn't getting unscheduled!
  * __Warn on long periods of SW-thread work__. Remaining responsive requires yielding to the SW thread's event loop. DevTools can provide value by warning developers of long periods of potentially-blocking work that might reduce responsiveness to incoming events. A reasonable, mobile-friendly starting point might be to warn on any function that takes longer than 20ms to return in the fast path (e.g., `onfetch` or `onmessage`). Recommend to users that they move long-running work to sub-workers, to other turns (via new promises), or that they cache expensive work such that it can be returned via an async API (e.g. IDB).
  * __Plan features with async in mind__. As you plan to add new features to the platform that you'd like to have exposed to the SW context, remember that they'll need to pass the "async only" test. Using Promises is a good first place to start, and reaching out to the editors of the SW spec early can't hurt.
  * __Write async tests__. Your implementation is going to need to handle a large degree of variability in timing. Testing (and fuzzing) your scheduling behavior to optimize for overall app performance, particularly in the multiple-tab scenario, is key to keeping an eye on the real-world impact of performance tuning.
  * __Get smart about return types__. When it comes to dealing in async responses, the word "return" is usually phrased as `e.respondWith()`. What's replied with is usually an instance of a `Promise` type, but _not all `Promise`s are created equal_. Consider the case of `e.respondWith(e.default())` and `e.respondWith(caches.match(e.request))`. Both return types result in a delegation to an underlying mechanism _with no further SW interaction_. Since no additional handlers are added to the vended Promise object, the receiving event can know that the SW is effectively out of the loop for the rest of the operation. This allows savvy implementations to avoid re-entering the SW and reifying `Response` objects in the SW execution context.

### Best Effort

UA's are free to _not_ start SW's for navigations (or other events), _event if they would match a registered and active SW_. If you find yourself under memory pressure or for some reason don't happen to think a SW is necessary or beneficial (e.g., it has previously been killed for abusing CPU, doesn't respond to requests in a timeline way, or habitually times out and has to be clobbered), the UA is _free to not start it for a given navigation_. This has the knock-on effect that the SW won't be consulted for sub-resource requests for the document either.

UAs, obviously, should try to do their best to enable SWs to do _their_ best in serving meaningful content to users, and we recommend always trying to send sub-resource requests to SWs for documents that begin life based on the SW in question.


### Installation is Not in the Fast Path

The first page loaded from an application that calls `navigator.serviceWorker.register()` cannot, by definition, be served from the SW itself. This illuminates the async nature of SW installation. Because SW installation may take a long time (downloading imported scripts and populating `Cache` objects), the lifecycle events for the SW system are designed to allow authors to inform the UA of installation success.

Until installation success a registered SW _will not be sent any performance-sensitive events_. The async nature of installation provides an opportunity for implementations to do extra work to keep the fast-path responsive.

#### Strategies

  * __Prioritize SW resource fetching appropriately__. It may improve performance of the installing document to prioritize resource fetches of the foreground page above those of the installing SW.
  * __Do extra work to optimize SW loading before activation__. UAs have leeway to avoid activating the SW for navigations until they're good and ready to do so. Thinks is your chance to optimize the crud out of them.

### Racing Allowed

Anecdotal evidence suggests that commodity OSes and hardware perform VERY badly in disk I/O. Some systems are so degraded that local (valid) caches fetched from disk may perform worse than requests for equivalent resources from the network. Improvements in networks, the spread of malware, and the spread of poorly-written virus scanners exacerbate the underlying trend towards poorly performing disk I/O.

#### Strategies

  * __Learn to race on top-level navigations__. Adapting to historical (local) I/O performance may help UAs decide if and when to avoid using local resources. SWs may, at first glance, appear to muddy the waters, but fear not! Nothing about the SW spec forces an implementer to _always_ send navigations to a matching SW. In fact, the implementation can attempt to go to the network for a top-level navigation while concurrently attempting to dispatch an `onfetch` to the matching SW. Assuming the UA chooses to render the document produced by the winner of the race, the model from then on is clear. Thanks to the page-ownership model of the SW design, the first system to respond will "control" sub-resource requests. This means that if a SW is used, all subsequent sub-resource requests should be sent to the SW (not raced). If the network wins the race, all sub-resource requests will be sent to the network (not the SW).
  * __Learn to disable SWs__. In extreme cases, if disk is degraded to the extent that SWs can never start quickly, it may be advantageous to simply disable the SW subsystem entirely. Thanks to the online-fallback model of SWs, applications should continue to function (to the extent that they can).

### Cache Objects Are HTTP-specific

Objects in `self.caches` are instances of `Cache`. These HTTP-like-cache objects deal _exclusively_ in HTTP `Response` objects. With the exception of programmatic (not automatic) eviction these `Cache` objects are best thought of a group of native cache items. Most of the operations available for dealing with them will mirror HTTP cache query semantics and will likely be familiar to implementers. You know how to make this stuff fast.

#### Strategies

  * __Store `Response` objects like HTTP cache entries__. It might be tempting to lean on IDB or other general-purpose storage for handling `Cache` entries. Browser HTTP caches have seen a decade+ of tuning for the specific use-case of returning HTTP data to renderers. It may be advantageous to lean on this engineering where possible.

### Interaction With Prefetch and Prerender Is Sane

Speculative pre-parsing of documents and CSS resources (not blocking a parser on `<script>` elements, etc.) to locate URLs to speculatively load is an important browser optimization. SWs play well with this optimization since they conceptually sit "behind" the document but in front of the network layer. Sending `onfetch` events for these resources should happen in the usual way.

Similarly, [pre-rendering](https://developers.google.com/chrome/whitepapers/prerender) requests should be sent to SWs. They can help warm-up documents while offline. A UA might decide to only send pre-render requests to URL space with a matching SW registration when offline to avoid wasting resources.

#### Strategies

  * __Start DNS and TCP early__. It may improve overall performance to begin DNS resolution and TCP warm-up for prefetch-located resources _concurrently_ with dispatching the request to the SW. This, obviously, requires measurement (and perhaps adaption on a per-SW version basis) to verify that requests outbound from a SW usually correspond to the origin of the `Request` sent to the SW itself.
  * __Pre-fetch to SW-controlled URL space when offline__. Pre-render is a huge boon to app performance when online, but generally isn't available offline. SWs can help by providing a "map" of the available world based on SW registrations with `onfetch` handlers.
