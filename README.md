## What's Going On Here?

Service Workers are a new browser feature that provide event-driven scripts that run independently of web pages. Unlike other workers Service Workers can be shut down at the end of events, note the lack of retained references from documents, and they have access to domain-wide events such as network fetches.

ServiceWorkers also have scriptable caches. Along with the ability to respond to network requests from certain web pages via script, this provides a way for applications to "go offline".

Service Workers are meant to replace the ([oft maligned](http://alistapart.com/article/application-cache-is-a-douchebag)) [HTML5 Application Cache](//www.whatwg.org/specs/web-apps/current-work/multipage/offline.html). Unlike AppCache, Service Workers are comprised of scriptable primitives that make it possible for application developers to build URL-friendly, always-available applications in a sane and layered way.

To understand the design and how you might build apps with ServiceWorkers, see the [explainer document](explainer.md).

## Spec and API Development

For the nitty-gritty of the API, the [draft W3C specification](//slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html) and [`service_worker.ts`](//github.com/slightlyoff/ServiceWorker/blob/master/service_worker.ts) are authoritative.

Spec development happens via [issues in this repository](issues). For general discussion, please use the [public-webapps@w3.org mailing list](http://lists.w3.org/Archives/Public/public-webapps/).

Updates to the spec must reference [resolved issued marked `needs spec`](issues?labels=needs+spec&state=closed).

To edit the spec locally, you'll need a copy of [the Web Components-based framework which it is built with](//github.com/slightlyoff/web-spec-framework). To fetch it, clone the repo and run:

```sh
git submodule update --init --recursive
```

To make edits to the design, please send pull requests against the TypeScript file (`service_worker.ts`) and spec (`spec/service_worker/index.html`). Changes to the spec without corresponding changes to the `.ts` file will not be accepted.

Building the JS version of the TypeScript API description isn't essential, but here's how:

```sh
# From the root of the project directory
npm install
# From the root of the project directory
make
```
