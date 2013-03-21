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

// Roughly speaking, this is how the controller lifecycle works:
//
//    * Controllers are installed imperatively a globbing URL match
//    * The execution context for controllers is effectively the SharedWorker
//      API, with a few additions:
//        http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers
//    * All communication with the controller happens through events and
//      postMessage. We do need a new MessagePort abstraction to ensure that
//    * We define events for installation and upgrade of the controller,
//      resource loading, and navigation initiated by script or by user action,
//      e.g. clicking a link:
//        - The list of special messages (with payloads defined below) is:
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
//        navigator.controller.ready.then();
//    * Controllers are the only bits of the system that have access to cache
//      groups
//    * In order to handle bringing an app into focus and navigating to some bit
//      of data (instead of opening a new window), Controllers also have access
//      to a list of top-level window objects whose URLs fall within the scope
//      of the URLs "owned" by the controller
//
//  DBK brings up some great points:
//    1.) UAs must ensure that they give controller scripts whatever level of
//    durability in their HTTP caches that they grant to existing AppCache
//    resources and manifests.
//    2.) If resources are evicted from the cache, we should notify (perhaps
//    with a special type of update event or message) the controller so that it
//    can handle the situation on next start. There's no mechanism in place for
//    that now.

////////////////////////////////////////////////////////////////////////////////
// Forward decls to make the TypeScript compiler happy
////////////////////////////////////////////////////////////////////////////////

// http://tc39wiki.calculist.org/es6/map-set/
// http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets
// http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-15.14.4
class Map {
  constructor(iterable?:any[]) {}
  get(key: any): any {}
  has(key: any): Boolean { return true; }
  set(key: any, val: any): void {}
  clear(): void {}
  delete(key: any): Boolean { return true; }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): any[] { return []; }
  keys(): any[] { return []; }
  values(): any[] { return []; }
}

// https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-event
interface EventHandler { (e:_Event); }
interface _EventInit {
  bubbles: Boolean;
  cancelable: Boolean;
}
class _Event {
  type: String;
  target: any;
  currentTarget: any;
  eventPhase: Number;
  bubbles: Boolean = false;
  cancelable: Boolean = true;
  defaultPrevented: Boolean = false;
  isTrusted: Boolean = false;
  timeStamp: Number;
  stopPropagation(): void {}
  stopImmediatePropagation(): void {}
  preventDefault(): void {}
  constructor(type : String, eventInitDict?: _EventInit) {}
}
class _CustomEvent extends _Event {
  // Constructor(DOMString type, optional EventInit eventInitDict
  constructor(type : String, eventInitDict?: _EventInit) {
    super(type, eventInitDict);
  }
}
class _EventTarget {
  dispatchEvent(e:_Event): Boolean {
    return true;
  }
}
// https://github.com/slightlyoff/DOMFuture/blob/master/DOMFuture.idl
class Resolver {
  public accept(v:any): void {}
  public reject(v:any): void {}
  public resolve(v:any): void {}
}
interface InitCallback { (init:Function[]); }
class Future {
  constructor(init : InitCallback) {}
}
// http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers-and-the-sharedworker-interface
class SharedWorker extends _EventTarget {
  constructor(url: String, name?: String) {
    super();
  }
}

// Not part of any public standard but used below:
class WindowList /* extends Array */ {}

////////////////////////////////////////////////////////////////////////////////
// Document APIs
////////////////////////////////////////////////////////////////////////////////

navigator.controller = {
  register: function(scope: String /* or URL */,
                       url: String /* or URL */): Future {
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

    return new Future(function(r) {});
  },

  ready: function(): Future {
    // Resolves successfully when a controller is found and initialized for the
    // document. If no controller is registered, the "update" event for it fails,
    // or the URL is cross-origin, we reject. If no controller is currently
    // running but one is registered, this method starts it.
    return new Future(function(r) {});
  }
};

////////////////////////////////////////////////////////////////////////////////
// The Controller
////////////////////////////////////////////////////////////////////////////////

class ResponseFuture extends Future {}

class InstalledEvent extends _Event {}
interface InstalledEventHandler { (e:InstalledEvent); }

class ReplacedEvent extends _Event {}
interface ReplacedEventHandler { (e:ReplacedEvent); }

class RequestEvent extends _Event {
  respdondWith(response : ResponseFuture) {}
}
interface RequestEventHandler { (e:RequestEvent); }

// The scope in which controller code is executed
class ControllerScope extends SharedWorker {
  // Mirrors navigator.onLine. We also get network status change events
  // (ononline, etc.). The proposed ping() API must be made available here as
  // well.
  onLine: Boolean;
  caches: CacheList;
  get windows(): WindowList {
    return new WindowList();
  }

  // New events:
  oninstalled: InstalledEventHandler;
  onreplaced: ReplacedEventHandler;
  onrequest: RequestEventHandler;

  constructor(url: String, upgrading: Boolean) {
    // Execute user-provided code in this context via super
    super(url);
    if (upgrading) {
      this.dispatchEvent(new _CustomEvent("update"));
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Controller APIs
////////////////////////////////////////////////////////////////////////////////

class Request {
  // TODO
}

class Response {
  url: URL;
  statusCode: Number;
  httpVersion: Number;
  encoding: String;
  method: String;
  headers: {};
  cookies: Map;
  // FIXME: should this be named "data", "payload", or "body"?
  data: any; /*TypedArray? String?*/
}

class XDomainResponse extends Response {
  get data(): void {
    throw new Error("Illegal access to cross-origin resource");
  }
  // FIXME: what other invariants? Should headers still be visible?
}

class RequestEvent extends _Event {
  request: Request;
  type: String = "navigate";
  window: any;
  respondWith(r: Response) {};
  redirectTo(url : String /* or URL */) { };

  constructor() {
    super("request", { cancelable: true, bubbles: false });
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
    this.window = null; // to allow postMessage, window.topLevel, etc
  }
}

// This largely describes the current Application Cache API. It's only available
// inside controller instances (not in regular documents), meaning that caching
// is a feature of the controller.
class Cache extends _EventTarget {
  // Events cribbed from existing AppCache
  onchecking: EventHandler;
  onerror: EventHandler;
  onupdate: EventHandler;
  ondownloading: EventHandler;
  onprogress: EventHandler;
  onupdateready: EventHandler;
  oncached: EventHandler;
  onobsolete: EventHandler;

  items: Map;

  // Allow arrays of URLs or strings
  constructor(...urls:URL[]);
  constructor(...urls:String[]) {
    // Note that items may ONLY contain Response instasnces
    if (urls.length) {
      // Begin fetching on the URLs and storing them in this.items
    }
    super();
  }

  // Match a URL or a string
  match(name:URL);
  match(name:String) {
    // name matches something in items
    if (name) {
      return this.items[name.toString()];
    }
  }

  // Cribbed from Mozilla's proposal, but with sane returns
  add(response:String): Future;
  add(response:URL): Future;
  add(response:Response) : Future {
    // If a URL (or URL string) is passed, a new CachedResponse is added to
    // items upon successful fetching
    return new Future(function(r) {});
  }

  remove(response:String): Future;
  remove(response:URL): Future;
  remove(response:Response) : Future {
    // FIXME: does this need to be async?
    return new Future(function(r) {});
  }

  // For the below, see current AppCache, although we extend with sane returns
  update() : Future { return new Future(function(r) {}); }

  // FIXME: not sure we want to keep swapCache!
  swapCache() : Future { return new Future(function(r) {}); }
}

class CacheList extends Map {
  constructor(iterable: Array) {
    // Overrides to prevent non-URLs to be added go here.
    super();
  }
}
