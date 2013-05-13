<h2>Navigation Controller Design</h2>

## What's Going On Here?

Navigation Controllers are a new system in browsers that provide scriptable caches and the ability to respond to network requests from certain web pages via script, responding either the contents of these caches or programmatically-generated content.

Controllers aren't a new version of the [rightfully-loathed](http://alistapart.com/article/application-cache-is-a-douchebag) [HTML5 Application Cache](http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html). Instead, they are comprised of scriptable primtives that make it possible for application developers to build URL-friendly, always-available applications in a sane and layered way.

To understand the design and how you might build apps with Navigation Controllers, see the [explainer document](https://github.com/slightlyoff/NavigationController/blob/master/explainer.md)

For the nitty-gritty of the API, see [`controller.ts`](https://github.com/slightlyoff/NavigationController/blob/master/controller.ts), a [TypeScript](http://www.typescriptlang.org/) description of the major bits of the callable interface.

## Building & Contributing

Most decisions regarding the API and finer points of the design are handled through issues in this repository. Feel free to open one if you don't see an obvious answer to your question in the explainer.

To make edits to the design, change the TypeScript file (`controller.ts`); the JavaScript file is built from it. Building the JS version yourself isn't essential, but here's how:

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