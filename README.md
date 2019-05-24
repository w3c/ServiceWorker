## What’s going on here?

Service workers are a new browser feature that provide event-driven scripts that run independently of web pages. Unlike other workers, service workers can be shut down at the end of events, note the lack of retained references from documents, and they have access to domain-wide events such as network fetches.

Service workers also have scriptable caches. Along with the ability to respond to network requests from certain web pages via script, this provides a way for applications to “go offline”.

Service workers are meant to replace the ([oft maligned](http://alistapart.com/article/application-cache-is-a-douchebag)) [HTML5 Application Cache](https://html.spec.whatwg.org/multipage/browsers.html#offline). Unlike AppCache, service workers are comprised of scriptable primitives with an extensive use of [Promises](//developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) that make it possible for application developers to build URL-friendly, always-available applications in a sane and layered way.

To understand the design and how you might build apps with service workers, see the [explainer document](explainer.md).

## Spec and API development

For the nitty-gritty of the API, the draft W3C specifications are authoritative. [Service Workers Nightly](https://w3c.github.io/ServiceWorker/) is a living document. [Service Workers 1](https://w3c.github.io/ServiceWorker/v1/) is a subset of the nightly version that is advancing toward a W3C Recommendation. For implementers and developers who seek all the latest features, [Service Workers Nightly](https://w3c.github.io/ServiceWorker/) is a right document that is constantly reflecting new requirements. For version 1, contributors plan to focus on fixing bugs and resolving compatibility issues without including new features from the nightly version.

Spec development happens via [issues in this repository](https://github.com/w3c/ServiceWorker/issues). For general discussion, please use the [public-webapps@w3.org mailing list](http://lists.w3.org/Archives/Public/public-webapps/) with a `Subject:` prefix of `[service-workers]`.

Updates to the spec must reference [resolved issues marked `needs spec`](https://github.com/w3c/ServiceWorker/issues?q=is%3Aclosed+label%3A%22needs+spec%22).

To make edits to the design, please send pull requests against the Nightly spec on the master branch. We use [bikeshed](https://github.com/tabatkins/bikeshed). So, change `docs/index.bs` and submit it with the corresponding bikesheded `index.html`.

## Examples

The W3C Web Mobile Group have defined a [series of use-cases where service worker is particularly useful](https://github.com/w3c-webmob/ServiceWorkersDemos). You can help by adding more use cases, draft implementation code, or even working examples once browsers support the required APIs.


## About labels and milestones on issues
This is to explain how we use labels and milestones to triage the issues. Note: This is a draft, suggestions for improvements are welcomed.


### Prioritization
- **enhancement**: is for anything that was assessed as not having any impact on the decisions for the current milestone and can therefore be safely discussed, rejected or prioritized later.
- **milestone**: is used to mark issues we agreed to get done in principle by a given revision. For the sake of efficiency, we tend to only focus on the current milestone and leave everything else without specific milestones.
- **impacts MVP**: is used to mark issues impacting the “Minimal Viable Product”. The MVP is the minimal scope of API that can solve actual use cases. These issues have the highest priority.

*Risk labels for impacts MVP issues*

- **medium risk**: to further refine the “impacts MVP” issues. It indicates that the issue is moderately complex and that reaching a conclusion might take some time. These are of higher priority than issues with no risk label but are of lower priority than issues with a “high risk” label.
- **high risk**: to further refine the “impacts MVP” issues. It indicates that the issue is significantly complex and that reaching a conclusion might take a lot of time and effort. These are of higher priority than issues with no risk label or a “medium risk” label.



### Actions
- **needs spec**: a decision has been made and the spec needs to be updated.
- **spec detail**: has no significant implications for implementers nor web developers.
- **decided**: to record that a decision has been made.
- **invalid**: when something doesn’t constitute a valid issue.
- **wontfix**: a decision has been made not to pursue this issue further.
- **duplicate**: when a similar issue has already been filed.
- **bug**: an oversight that needs to be fixed.


### Areas
- **fetch**: relates to Fetch
- **lifecycle**: relates to lifecycle aspects of service worker
- **cache**: relevant to the Cache APIs
- **question**: not an actual issue. Items that have been filed in order to gain a better understanding of service worker.
