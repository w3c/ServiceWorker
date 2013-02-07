// This API proposal depends on:
//  DOM: http://www.w3.org/TR/domcore/
//  URLs: http://url.spec.whatwg.org/
//  Futures: https://github.com/slightlyoff/DOMFuture/
//  Shared Workers:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers
//
// In an effort to provide an API that explains it, we liberally reference and
// steal from:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/offline.html
//
// See WebKit's Navigation Controllers to understand how it all works today:
//    http://code.google.com/searchframe#OAMlx_jo-ck/src/content/public/browser/navigation_controller.h
//    http://code.google.com/searchframe#OAMlx_jo-ck/src/content/public/browser/navigation_details.h
//    http://code.google.com/searchframe#OAMlx_jo-ck/src/third_party/WebKit/Source/WebCore/loader/cache/CachedResource.h
//
// This API is described below in the style of ES6 classes. See:
//   http://wiki.ecmascript.org/doku.php?id=strawman:maximally_minimal_classes

// Roughly speaking, this is how it's gonna go down:
//
//    * Controllers are installed declaratively against a globbing URL match
//    * The execution context for controllers is effectively the SharedWorker
//      API, with a few additions:
//        http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers
//    * All communication with the controller happens through events and Message
//      Ports: http://www.w3.org/TR/webmessaging/#messageport
//    * We define events for installation and upgrade of the controller,
//      resource loading, and navigation initiated by script or by user action,
//      e.g. clicking a link:
//        - The list of special messages (with payloads defined below) is:
//          "hashchange"
//            Sent for non-page transition navigations, and only in the case
//            when a browser does not prevetDefault() on a page-level hashchange
//            event.
//          "request"
//            All forms of resource loading loading including top-level
//            navigations. These are distinguished internally in the Event
//            object by a "type" field which can have values of:
//              "toplevel"
//                Synchrously Within toplevel request handlers, a window object
//                may be focus()'d, however this throws an error at any other
//                time.
//              "resource"
//                All sub-resource requests for a page are of this type.
//             Requets are modeled by the Request class (defined below).
//             Responses need not be provided synchronously.
//          "update"
//            A new controller receives this message upon installation. This can
//            be a *different version* of a controller or a brand new controller
//            installation.
//          "upgraded"
//            Sent to existing controller instances which are "alive" when a new
//            controller version is installed. The timing of this message is
//            defined to be: some time after the update hander of a new
//            version of the controller returns without error or exception.
//    * "toplevel" requests are *only* dispatched to a handler for URLs that
//      fall within the declared set of URLs "owned" by a controller. This is a
//      subset of "same-origin" and akin to the visibility of cookies.
//    * "resource" requrests are dispatched for *ALL* resources of a a
//      document claimed by a navigation controller, regardless of the domain of
//      the sub-resource. This is to say, a controller for foo.com/*, in
//      response to a "request" event dispatched from and instance of the
//      document foo.com/index.html for cdn.com/example.js, may override (and
//      block) the loading of that resource. As this behavior is per-resource-
//      load and does not affect default caching behavior in any way, there is
//      no risk of cache poisioning.
//    * Pages can open up channels to controllers via:
//        window.controller.ready.then();
//    * Controllers are the only bits of the system that have access to cache
//      groups
//    * In order to handle bringing an app into focus and navigating to some bit
//      of data (instead of opening a new window), Controllers also have access
//      to a list of top-level window objects whose URLs fall within the scope
//      of the URLs "owned" by the controller


////////////////////////////////////////////////////////////////////////////////
// Document APIs
////////////////////////////////////////////////////////////////////////////////

window.controller.register = function(/*URL|String*/ scope,
                                       /*URL|String*/ url) {
  // Install the controller specified at the URL.
  // This future is rejected if:
  //    - the URL is not same-origin
  //    - no scope is provided or the scope does not resolve/parse correctly
  //    - fetching the controller returns with an eror
  //    - installing the controller (the event the controller is sent) fails
  //      with an unhandled exception
  // TBD: possible error values upon rejection
  //
  // Else the future resolves successfully when controller.ready()'s Future
  // would

  return new Future();
};

window.controller.ready = function() {
  // Resolves successfully when a controller is found and initialized for the
  // document. If no controller is registered, the "update" event for it fails,
  // or the URL is cross-origin, we reject. If no controller is currently
  // running but one is registered, this method starts it.
  return new Future();
};

////////////////////////////////////////////////////////////////////////////////
// The Controller
////////////////////////////////////////////////////////////////////////////////

// The scope in which controller code is executed
class ControllerScope extends SharedWorker {
  constructor(url) {
    // Mirrors navigator.onLine. We also get network status change events
    // (ononline, etc.). The proposed ping() API must be made available here as
    // well.
    this.onLine = true;

    // New objects in the global scope
    this.caches = new CacheList();
    this.windows = new WindowList();

    // New events:
    this.onupdate = function(/*UpdateEvent*/ e) { };
    this.onupgraded = function(/*UpgradeEvent*/ e) { };
    this.onrequest = function(/*RequestEvent*/ e) { };

    // Execute user-provided code in this context via super
    super(url);

    if (upgrading) {
      this.dispatchEvent("update", ...);
    }

  }
}

////////////////////////////////////////////////////////////////////////////////
// Controller APIs
////////////////////////////////////////////////////////////////////////////////

class Request {
  // TODO
}

class RequestEvent extends Event {
  constructor() {
    super();
    // This is the meat of the API for most use-cases.
    // If preventDefault() is not called on the event, the request is sent to
    // the default browser controller. That is to say, to respond with something
    // from the cache, you must preventDefault() and respond with it manually,
    // digging the resource out of the cache and calling
    // evt.respondWith(cachedItem).
    //
    // Note:
    //    while preventDefault() must be called synchronously to cancel the
    //    default, responding does not need to be synchronous. That is to say,
    //    you can do something async (like fetch contents, go to IDB, whatever)
    //    within whatever the network time out is and as long as you still have
    //    the RequestEvent instance, you can fulfill the request later.
    this.request = new Request(); // filled in by browser, obviously
    this.type = "navigate"; // || "resource"
    this.window = null; // to allow postMessage, window.topLevel, etc
    this.respondWith = function(/*Response*/ r) { };
    this.redirectTo = function(urlOrString) { };
  }
}

class Response {
  // TODO
}

class CachedResponse extends Response {
  // TODO
}

// This largely describes the current Application Cache API. It's only available
// inside controller instances (not in regular documents), meaning that caching
// is a feature of the controller.
class Cache extends EventTarget {
  constructor(/*iterable*/ urls = []) {
    // Note that items may ONLY contain Response instasnces
    this.items = new Map();
    if (urls.length) {
      // Begin fetching on the URLs and storing them in this.items
    }
    // Events cribbed from existing AppCache
    this.onchecking = undefined;
    this.onerror = undefined;
    this.onnoupdate = undefined;
    this.ondownloading = undefined;
    this.onprogress = undefined;
    this.onupdateready = undefined;
    this.oncached = undefined;
    this.onobsolete = undefined;

  }

  match(urlOrString) {
    if (/*urlOrString matches something in items*/) {
      return this.items[urlOrString]
    }
  }

  // Cribbed from Mozilla's proposal, but with sane returns
  add(urlOrStringOrResponse) {
    // If a URL (or URL string) is passed, a new CachedResponse is added to
    // items upon successful fetching
    return new Future();
  }
  remove(urlOrStringOrResponse) {
    // FIXME: does this need to be async?
    return new Future();
  }

  // For the below, see current AppCache, although we extend with sane returns
  swapCache() { return new Future(); }
  update() { return new Future(); }
}

class CacheList extends Map {
  constructor(iterable) {
    super(iterable);
  }
  // Overrides to prevent non-URLs to be added go here.
}
