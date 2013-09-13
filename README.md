<h2>Event Worker Design</h2>

## What's Going On Here?

Event Workers (formerly Navigation Controllers) are a new system in browsers that provide event-driven scripts that run independent of web pages. They are similar to SharedWorkers except that their lifetime is different and they have access to domain-wide events such as network requests.

Event Workers also have scriptable caches. Along with the ability to respond to network requests from certain web pages via script, this provides a way for applications to "go offline".

Event Workers aren't a new version of the [rightfully-loathed](http://alistapart.com/article/application-cache-is-a-douchebag) [HTML5 Application Cache](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html). Instead, they are comprised of scriptable primitives that make it possible for application developers to build URL-friendly, always-available applications in a sane and layered way.

To understand the design and how you might build apps with Event Workers, see the [explainer document](https://github.com/slightlyoff/EventWorker/blob/master/explainer.md).

For the nitty-gritty of the API, see [`event_worker.ts`](https://github.com/slightlyoff/EventWorker/blob/master/event_worker.ts), a [TypeScript](http://www.typescriptlang.org/) description of the major bits of the callable interface.

## Building & Contributing to the Design

Most decisions regarding the API and finer points of the design are handled through issues in this repository. Feel free to open one if you don't see an obvious answer to your question in the explainer.

To make edits to the design, change the TypeScript file (`event_worker.ts`); the JavaScript file is built from it. Building the JS version yourself isn't essential, but here's how:

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
make
```
