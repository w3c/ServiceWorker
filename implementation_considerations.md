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

Next, an event is dispatched to the now-running worker. If the worker's event handler doesn't call `e.respondWith()`, no further script is implicated in servicing the fetch and normal resource loading can proceed as per usual. If the worker _does_ take a crack at responding to the event, the worker's life is typically extended to enable it to do whatever (asynchronous) work it needs to do to respond. Once the worker is done handling the event (or not), the UA _is free to shut the worker down_ and only revive it again for the next event.

It bears repeating: if no event's lifecycle is keeping the SW alive, UA's can shut them down and reclaim whatever resources they might have been using. If this doesn't warm your cold, cold implementer's heart then you might truly be dead inside.

### Install

Installation of SWs happens as a result of a document calling:

```html
<!-- https://example.com/index.html -->
<script>
  navigator.serviceWorker.register("sw.js");
</script>
```

The SW might be humonculous...dozens of imports, loads of code. This is the web and every terrible thing that authors _can_ do _will_ be done. This looks bad, right?

Turns out that SWs have a _defined lifecycle_ that enables us to think about installation as a separate, asynchronous, potentially long-running phase that _doesn't affect the rest of `index.html`_.

Installation can be low-priority, and no documents will be controlled by the SW until it succeeds. That means that it's possible to depend on lots of script and cache many resources in an SW without worrying about the "load time" of the SW itself since all subsequent starts of the SW will come from local disk cache.

### Event Dispatch

TODO(slightlyoff)

## Good News, Everybody!

Opportunities to go fast (and, more importantly, avoid going slow) abound.

### It's All Async

TODO(slightlyoff)

### Best Effort

UA's are free to _not_ start SW's for navigations (or other events), _event if they would match a registered and active SW_. If you find yourself under memory pressure or for some reason don't happen to think a SW is necessary or beneficial (e.g., it has previously been killed for abusing CPU, doesn't respond to requests in a timeline way, or habitually times out and has to be clobbered), the UA is _free to not start it for a given navigation_. This has the knock-on effect that the SW won't be consulted for sub-resource requests for the document either.

UAs, obviously, should try to do their best to enable SWs to do _their_ best in serving meaningful content to users, and we recommend always trying to send sub-resource requests to SWs for documents that begin life based on the SW in question.

### Only Matching Navigations Boot SW's

Lets say `example.com` has a SW registered and `acme.com` embeds the image `https://example.com/images/kittens.gif`. Since the

### Installation is Not in the Fast Path

TODO(slightlyoff)

### Events Implicitly Filter

TODO(slightlyoff)

### Racing Allowed

TODO(slightlyoff)

### Cache Objects Are HTTP-specific

TODO(slightlyoff)

### Interaction With Prefetch and Prerender Is SaneTODO(slightlyoff)

TODO(slightlyoff)
