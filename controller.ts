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
//      handshaking isn't left as an exercise as a user. For a survey of the
//      current pain, see the dances around init in Oasis:
//        https://github.com/tildeio/oasis.js/blob/master/lib/oasis.js
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
//             Requests are modeled by the Request class (defined below).
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
//    * "resource" requests are dispatched for *ALL* resources of a a
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
// Document APIs
////////////////////////////////////////////////////////////////////////////////

navigator.controller = {
  register: function(scope: string /* or URL */,
                       url: string /* or URL */): Future {
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

    return accepted();
  },

  ready: function(): Future {
    // Resolves successfully when a controller is found and initialized for the
    // document. If no controller is registered, the "update" event for it fails,
    // or the URL is cross-origin, we reject. If no controller is currently
    // running but one is registered, this method starts it.
    return accepted();
  }
};

////////////////////////////////////////////////////////////////////////////////
// The Controller
////////////////////////////////////////////////////////////////////////////////

class InstalledEvent extends _Event {
  previousVersion: string = "";
  previous: MessagePort = null;

  // Ensures that the controller is used in place of existing controllers for
  // the currently controlled set of window instances.
  replace(): void {}

  // Delay treating the installing controller until the passed Future resolves
  // successfully. This is primarlialy used to ensure that a
  // NavigationController is not active until all of the "core" Caches it
  // depends on are populated.
  waitUntil(f: Future): Future { return accepted(); }
}

interface InstalledEventHandler { (e:InstalledEvent); }
class ReplacedEvent extends _Event {}
interface ReplacedEventHandler { (e:ReplacedEvent); }
interface FetchEventHandler { (e:FetchEvent); }
interface OnlineEventHandler { (e:_Event); }
interface OfflineEventHandler { (e:_Event); }

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

  // Set by the controller and used to communicate to newer versions what they
  // are replaceing (see InstalledEvent::previousVersion)
  version: string = "";

  //
  // Events
  //

  // Legacy Events

  // These mirror window.online and window.offline in browsing contexts.
  online: OnlineEventHandler;
  offline: OfflineEventHandler;

  // New Events

  // Called when a controller is downloaded and being setup to handle
  // navigations.
  oninstalled: InstalledEventHandler;

  // Called when an updated controller verion decides that it wants to take over
  // responsibility for the windows this controller is associated with via
  // InstalledEventHandler::replace()
  onreplaced: ReplacedEventHandler;

  // Called whenever this controller is meant to decide the disposition of a
  // request.
  onfetch: FetchEventHandler;

  constructor(url: string, upgrading: Boolean) {
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

// http://fetch.spec.whatwg.org/#requests
class Request {
  url: URL;
  method: string = "GET";
  origin: string;
  mode: string; // Can be one of "same origin", "tainted x-origin", "CORS"
  synchronous: Boolean = false;
  redirectCount: Number = 0;
  forcePreflight: Boolean = false;
  omitCredentials: Boolean = false;
  referrer: URL;
  headers: Map; // Needs filtering!
  body: any; /*TypedArray? String?*/
}

// http://fetch.spec.whatwg.org/#responses
class Response {
  constructor() {}
}

class CORSCrossOriginResponse extends Response {
  // This class represents the result of cross-origin fetched resources that are tainted,
  // such as <img src=http://cross-origin.example/test.png>
}

// FIXME: do we need the x-domain stuff? do http-only cookies solve it?
class CORSSameOriginResponse extends Response {
  // This class represents the result of all other fetched resources, including
  // cross-origin fetched resources using the CORS fetching mode.
  statusCode: Number;
  statusText: string;
  // Explicitly omitting httpVersion
  encoding: string;
  method: string;
  headers: Map; // Needs filtering!
  body: any; /*TypedArray? String?*/
}

class ResponseFuture extends Future {}

class FetchEvent extends _Event {
  // The body of the request.
  request: Request;
  // Can be one of:
  //  "navigate"
  //  "fetch"
  type: string = "navigate";

  // The window issuing the request.
  window: any;

  // Informs the Controller wether or not the request corresponds to navigation
  // of the top-level window, e.g. reloading a tab or typing a URL into the URL
  // bar.
  isTopLevel: Boolean = false;

  // Future must resolve with a Response. A Network Error is thrown for other
  // resolution types/values.
  respondWith(r: Future) : Future;
  respondWith(r: Response) : Future;
  // To make the TS compiler happy:
  respondWith(r: any) : Future { return accepted(); }

  forwardTo(url: URL) : Future;
  forwardTo(url: string) : Future;
  forwardTo(url: any) : Future {
    var r = new Response();
    /*
    statusCode: Number;
    statusText: string;
    // Explicitly omitting httpVersion
    encoding: string;
    method: string;
    headers: Map; // Needs filtering
    body: any;
    */

    return accepted();
  }

  constructor() {
    super("fetch", { cancelable: true, bubbles: false });
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
    //    the FetchEvent instance, you can fulfill the request later.
    this.window = null; // to allow postMessage, window.topLevel, etc
  }
}

// Design notes:
//  - Caches are atomic: they are not complete until all of their resources are
//    fetched
//  - Updates are also atomic: the old contents are visible until all new
//    contents are fetched/installed.
//  - Caches should have version numbers and "update" should set/replace it

// This largely describes the current Application Cache API. It's only available
// inside controller instances (not in regular documents), meaning that caching
// is a feature of the controller.
class Cache {
  items: AsyncMap; // FIXME: can't be sync!

  // Allow arrays of URLs or strings
  constructor(...urls:URL[]);
  constructor(...urls:string[]);
  constructor(...urls:any[]) {
    // Note that items may ONLY contain Response instasnces
    if (urls.length) {
      // Begin fetching on the URLs and storing them in this.items
    }
  }

  // Match a URL or a string
  match(name:URL) : Future;
  match(name:string) : Future;
  // Make the TS compiler happy:
  match(name:any) : Future {
    // name matches something in items
    if (name) {
      return this.items.get(name.toString());
    }
  }

  // TODO: define type-restricting getters/setters

  // Cribbed from Mozilla's proposal, but with sane returns
  add(...response:string[]) : Future;
  add(...response:URL[]) : Future;
  add(...response:Response[]) : Future;
  add(...response:any[]) : Future {
    // If a URL (or URL string) is passed, a new CachedResponse is added to
    // items upon successful fetching
    return accepted();
  }

  remove(...response:string[]) : Future;
  remove(...response:URL[]) : Future;
  remove(...response:Response[]) : Future;
  remove(...response:any[]) : Future {
    // FIXME: does this need to be async?
    return accepted();
  }


  // For the below, see current AppCache, although we extend with sane returns

  // Update has the effect of checking the HTTP cache validity of all items
  // currently in the cache and updating with new versions if the current item
  // is expired. New items may be added to the cache with the urls that can be
  // passed.
  update(...urls:URL[]) : Future;
  update(...urls:string[]) : Future { return accepted(); }

  ready(): Future { return accepted(); }

  // FIXME: not sure we want to keep swapCache!
  swapCache() : Future { return accepted(); }

}

class CacheList extends Map {
  constructor(iterable: Array) {
    // Overrides to prevent non-URLs to be added go here.
    super();
  }

  // Convenience method to get ResponseFuture from named cache.
  request(cacheName: String, url: URL) : RequestFuture;
  request(cacheName: String, url: String) : RequestFuture;
}

////////////////////////////////////////////////////////////////////////////////
// Utility Decls to make the TypeScript compiler happy
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

// the TS compiler is unhappy *both* with re-defining DOM types and with direct
// sublassing of most of them. This is sane (from a regular TS pespective), if
// frustrating. As a result, we describe the built-in Event type with a prefixed
// name so that we can subclass it later.
class _Event {
  type: string;
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
  constructor(type : string, eventInitDict?: _EventInit) {}
}

class _CustomEvent extends _Event {
  // Constructor(DOMString type, optional EventInit eventInitDict
  constructor(type : string, eventInitDict?: _EventInit) {
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

class Future {
  // Callback type decl:
  //  callback : (n : number) => number
  constructor(init : (r:Resolver) => void ) {

  }
}

function accepted() : Future {
  return new Future(function(r) {
    r.accept(true);
  });
}

interface ConnectEventHandler { (e:_Event); }

// http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers-and-the-sharedworker-interface
class SharedWorker extends _EventTarget {
  // To make it clear where onconnect comes from
  onconnect: ConnectEventHandler;

  constructor(url: string, name?: string) {
    super();
  }
}

////////////////////////////////////////////////////////////////////////////////
// Not part of any public standard but used above:
////////////////////////////////////////////////////////////////////////////////
class WindowList /* extends Array */ {}

class AsyncMap {
  constructor(iterable?:any[]) {}
  get(key: any): Future { return accepted(); }
  has(key: any): Future { return accepted(); }
  set(key: any, val: any): Future { return accepted(); }
  clear(): Future { return accepted(); }
  delete(key: any): Future { return accepted(); }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): Future { return accepted(); }
  keys(): Future { return accepted(); }
  values(): Future { return accepted(); }
}

