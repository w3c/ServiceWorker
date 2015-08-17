## What's Going On Here?

Service workers are a new browser feature that provide event-driven scripts that run independently of web pages. Unlike other workers, service workers can be shut down at the end of events, note the lack of retained references from documents, and they have access to domain-wide events such as network fetches.

Service worker also have scriptable caches. Along with the ability to respond to network requests from certain web pages via script, this provides a way for applications to "go offline".

Service Workers are meant to replace the ([oft maligned](http://alistapart.com/article/application-cache-is-a-douchebag)) [HTML5 Application Cache](//www.whatwg.org/specs/web-apps/current-work/multipage/offline.html). Unlike AppCache, service workers are comprised of scriptable primitives that make it possible for application developers to build URL-friendly, always-available applications in a sane and layered way.

To understand the design and how you might build apps with service worker, see the [explainer document](explainer.md).

## Spec and API Development

For the nitty-gritty of the API, the [draft W3C specification](//slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html) and [`service_worker.ts`](//github.com/slightlyoff/ServiceWorker/blob/master/service_worker.ts) are authoritative.

Spec development happens via [issues in this repository](https://github.com/slightlyoff/ServiceWorker/issues). For general discussion, please use the [public-webapps@w3.org mailing list](http://lists.w3.org/Archives/Public/public-webapps/) with a `Subject:` prefix of `[service-workers]`.

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

## Examples

The w3c web mobile group have defined a [series of use-cases where service worker is particularly useful](https://github.com/w3c-webmob/ServiceWorkersDemos). You can help by adding more use cases, draft implementation code, or even working examples once browsers support the required APIs.


## About labels and milestones on issues
This is to explain how we use labels and milestones to triage the issues. Note: This is a draft, suggestions for improvements are welcomed.


### Prioritization
**enhancement**: is for anything that was assessed as not having any impact on the decisions for the current milestone and can therefore be safely discussed, rejected or prioritized later.

**milestone**: is used to mark issues we agreed to get done in principle by a given revision. For the sake of efficiency, we tend to only focus on the current milestone and leave everything else without specific milestones.

**impacts MVP**: is used to mark issues impacting the "Minimal Viable Product". The MVP is the minimal scope of API that can solve actual use cases. These issues have the highest priority.

*Risk labels for impacts MVP issues*  
**medium risk**: to further refine the "impacts MVP" issues. It indicates that the issue is moderately complex and that reaching a conclusion might take some time. These are of higher priority than issues with no risk label but are of lower priority than issues with a "high risk" label.

**high risk**: to further refine the "impacts MVP" issues. It indicates that the issue is significantly complex and that reaching a conclusion might take a lot of time and effort. These are of higher priority than issues with no risk label or a "medium risk" label.



### Actions
**needs spec**: a decision has been made and the spec needs to be updated.

**spec detail**: has no significant implications for implementers nor web developers.

**decided**: to record that a decision has been made.

**invalid**: when something doesn't constitute a valid issue.

**wontfix**: a decision has been made not to pursue this issue further.

**duplicate**: when a similar issue has already been filed.

**bug**: an oversight that needs to be fixed.


### Areas

**fetch**: relates to Fetch

**lifecycle**: relates to lifecycle aspects of service worker

**cache**: relevant to the Cache APIs

**question**: not an actual issue. Items that have been filed in order to gain a better understanding of service worker.
