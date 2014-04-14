# Implementation Considerations for Service Workers

Or

### _What to Expect When You're Expecting to Implement Service Workers_

So you've got a browser engine, are looking into this whole "Service Workers" thing and have some questions. Take heart, dear reader! Your friendly spec designers/authors are here to answer your (anticipated) questions. Want more answers? [File a bug!](issues) and tag it `implementation-concern`.

We'll take this in steps; first looking at the general architecture, then outlining the areas of built-in ambiguity [in the spec](//slightlyoff.github.io/ServiceWorker/spec/service_worker/) that provide opportunities to go fast, and lastly outline a list of strategies that implementations might explore to improve Service Worker performance and reliability.

## Key Concepts

### Event-Driven Workers

As an implementer, the biggest thing to understand about Service Workers is that they are _event driven_. Unlike other forms of [Web Worker](http://www.w3.org/TR/workers/), the lifetime of the script execution context of the worker is not related to documents which have handles to the worker. Instead, Service Workers begin (and end) life when events are sent to them.

In general, the most performance-sensitive of these events is the `fetch` event for top-level document navigation. To ensure that the decision regarding which (if any) Service Worker to boot up to handle a `fetch` event, the spec uses a static tuple of origin + URL pattern to map SW's to navigations. This list will change infrequently and is likely to be something you can cache in memory for fast lookup.

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

The SW might be humonculous...dozens of imports, loads of code. This is the web and every terrible thing that authors _can_ do _will_ be done. This looks bad, right?

Turns out that SWs have a defined lifecycle that enables us to think about installation as a separate, asynchronous, potentially long-running phase that _doesn't affect the rest of `index.html`_'s loading process.

Installation can be low-priority, and no documents will be controlled by the SW until it succeeds. That means that it's possible to depend on lots of script and cache many resources in an SW without worrying about the "load time" of the SW itself since all subsequent starts of the SW will come from local disk cache.

### Event Dispatch

SWs lean on the DOM Events as the entry point for nearly all work. The contract that developers must learn is that they must call `e.waitUntil()` or `e.respondWith()` to lengthen the life of the overall operation. All of the APIs available to them are asynchronous, and the combination of these factors implies that SWs are meant to be async by default. The tools at hand lead developers down this path, and cooperative multi-tasking (ala node.js) is the way that libraries must be structured, both for performance and to work naturally with the SW execution model. Lastly, remember that developers can move work off-thread using sub-workers. They'll also be killed with their parent SWs are collected, but long-running or CPU intensive work that might otherwise cause potential for becoming unresponsive can be delegated to contexts which will not block the SW thread.

## Good News, Everybody!

Opportunities to go fast (and, more importantly, avoid going slow) abound. This section is a burn-down list of performance-oriented things to understand as you begin to implement. Each section finishes with a list of potential strategies to investigate in your implementation.

### Startup _Matters_

The performance of evaluation of the Service Worker script is a key bottleneck to address in ensuring that perceived latency of SW-controlled documents remains low. It isn't possible to send the `fetch` event to the worker until it has been evaluated, potentially including code (via `importScripts()`) from other files.

#### Strategies

  * _Interpret_. JIT-only VMs (like V8) are at a startup-time disadvantage due to the time taken by JIT codegen. SW scripts aren't likely to be compute intensive (and if they are, your engine can detect as much and flag future runs for JITing). Simpler compilation strategies that get the handlers available faster are a good area to investigate inside the SW execution context.
  * _Store SW scripts as a single unit_. Storage locality still matters, even in 2014. Commodity MLC flash latency is _atrocious_, and spinning disk isn't getting (much) faster. Since SW scripts will nearly always require their previously `importScripts()` dependencies (which will be cached as a group), it pays to store them in a format that reduces the number of seeks/reads necessary to get the SW started. Also, remember that install-time is async, so there is time/energy available to optimize the storage layout up-front.
  * _Cache Parse Trees or Snapshot_. SW scripts (and their dependencies) shouldn't change in a single version of the application. Combined with a reduced API surface area, it's possible to apply more exotic strategies for efficiently "rehydrating" the startup execution context of the SW. The spec makes no gaurantees about how frequently a SW context is killed and re-evaluated in relationship to the number of overall events dispatched, so a UA is free to make non-side-effecting global startup appear to be a continuation of a previous execution.
  * _Warn on nondeterministic imports_. SWs are likely to be invoked when offline. This means that any scripts included via `importScripts()` that aren't from stable URLs _are likely to break when offline_. UAs can help keep developers on the optimization-friendly path by warning at the console whenever
  * _Warn on non-trivial global work_. Since SWs "pay" for any globally executed code every time they start, it's a good idea for implementations to *_STRONGLY_* discourage doing work outside the defined lifecycle events (`oninstall` and `onactivate`).
  * _Learn storage/DB patterns_. SW's are going to need to lean on IDB for state keeping across invocations and `Cache` objects for dealing with HTTP responses. In both cases it's possible to observe the set of resources most frequently accessed by a particular varsion of a SW and work to ensure that they're cheaply available by the time the SW is sent a particular event. In particular, speculatively fetching indexes may pay off in some scenarios.
  * _Delay shutdown_. The cheapest SW to start is the one you haven't killed. Optimizing implementations may consider providing a 'grace period' for the shutdown of SW threads to reduce startup time of subsequent events. This strategy can be further refined with semantic awareness about event types. E.g., a top-level navigation to a SW is _likely_ to generate sub-resource fetch events soon after. Shutting down the original SW execution context quickly may be wasteful.

### It's All Async

Aside from `importScripts()`, no synchronous APIs are available to SWs. This is by design. Remaining responsive from the shared SW context requires ensuring that decisions are made quickly and long-running work can be deferred to underlying (asynchronous) systems. No API will be added to the SW execution context that can potentially create cross-context mutex holds (e.g., Local Storage) or otherwise block (e.g., synchronous XHR). This discipline makes it simpler to reason about what it means to be a poorly-written SW script.

#### Strategies

  * _Prioritize the SW thread_. SW execution is likely to be a sensitive component of overall application performance. Ensure it isn't getting descheduled!
  * _Warn on long periods of SW-thread work_. Remaining responsive requires yeilding to the SW thread's event loop. DevTools can provide value by warning developers of long periods of potentially-blocking work that might reduce responsiveness to incoming events. A reasonable, mobile-friendly starting point might be to warn on any function that takes longer than 20ms to return in the fast path (e.g., `onfetch` or `onmessage`). Recommend to users that they move long-running work to sub-workers, to other turns (via new promises), or that they cache expensive work such that it can be returned via an async API (e.g. IDB).
  * _Plan features with async in mind_. As you plan to add new features to the platform that you'd like to have exposed to the SW context, remember that they'll need to pass the "async only" test. Using Promises is a good first place to start, and reaching out to the editors of the SW spec early can't hurt.
  * _Write async tests_. Your implementation is going to need to handle a large degree of variability in timing. Testing (and fuzzing) your scheduling behavior to optimize for overall app performance, particularly in the multiple-tab scenario, is key to keeping an eye on the real-world impact of performance tuning.

### Best Effort

UA's are free to _not_ start SW's for navigations (or other events), _event if they would match a registered and active SW_. If you find yourself under memory pressure or for some reason don't happen to think a SW is necessary or beneficial (e.g., it has previously been killed for abusing CPU, doesn't respond to requests in a timeline way, or habitually times out and has to be clobbered), the UA is _free to not start it for a given navigation_. This has the knock-on effect that the SW won't be consulted for sub-resource requests for the document either.

UAs, obviously, should try to do their best to enable SWs to do _their_ best in serving meaningful content to users, and we recommend always trying to send sub-resource requests to SWs for documents that begin life based on the SW in question.

#### Strategies

### Only Matching Navigations Boot SW's

Lets say `example.com` has a SW registered and `acme.com` embeds the image `https://example.com/images/kittens.gif`. Since the

#### Strategies

### Installation is Not in the Fast Path

TODO(slightlyoff)
#### Strategies

### Events Implicitly Filter

TODO(slightlyoff)
#### Strategies

### Racing Allowed

TODO(slightlyoff)
#### Strategies

### Cache Objects Are HTTP-specific

TODO(slightlyoff)
#### Strategies

### Interaction With Prefetch and Prerender Is Sane

TODO(slightlyoff)
#### Strategies
