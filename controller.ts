// This API proposal depends on:
//  DOM: http://www.w3.org/TR/domcore/
//  URLs: http://url.spec.whatwg.org/
//  Futures: https://github.com/slightlyoff/DOMFuture/
//  Shared Workers:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers

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

  unregister: function(scope: string /* or URL */) : Future {
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
class InstallPhaseEvent extends _Event {
  previousVersion: any = 0;
  // Delay treating the installing controller until the passed Future resolves
  // successfully. This is primarlialy used to ensure that a
  // NavigationController is not active until all of the "core" Caches it
  // depends on are populated.
  waitUntil(f: Future): Future { return accepted(); }
}

class InstalledEvent extends InstallPhaseEvent {
  previous: MessagePort = null;

  // Ensures that the controller is used in place of existing controllers for
  // the currently controlled set of window instances.
  replace(): void {}
}

interface InstalledEventHandler { (e:InstalledEvent); }
interface ActivateEventHandler { (e:InstallPhaseEvent); }
class ReplacedEvent extends _Event {}
interface ReplacedEventHandler { (e:ReplacedEvent); }
interface FetchEventHandler { (e:FetchEvent); }

// FIXME: need custom event types!
interface BeforeCacheEvictionEventHandler { (e:_Event); }
interface CacheEvictionEventHandler { (e:_Event); }

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
  version: any = 0; // NOTE: versions must be structured-cloneable!

  staticRoutes: StaticRouter;

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

  // Called when a controller becomes the active controller for a mapping
  onactivate: ActivateEventHandler;

  // Called when an updated controller verion decides that it wants to take over
  // responsibility for the windows this controller is associated with via
  // InstalledEventHandler::replace()
  onreplaced: ReplacedEventHandler;

  // Called whenever this controller is meant to decide the disposition of a
  // request.
  onfetch: FetchEventHandler;

  onbeforeevicted: BeforeCacheEvictionEventHandler;
  onevicted: CacheEvictionEventHandler;

  networkFetch(url?) : Future {
    return new Future(function(r) {
      r.resolve(_defaultToBrowserHTTP(url));
    });
  }

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

class CrossOriginResponse extends Response {
  // This class represents the result of cross-origin fetched resources that are
  // tainted, e.g. <img src="http://cross-origin.example/test.png">

  // TODO: slightlyoff: make CORS headers readable but not setable?
}

class SameOriginResponse extends Response {
  constructor(params?) {
    if (params) {
      if (typeof params.statusCode != "undefined") {
        this.statusCode = params.statusCode;
      }
      if (typeof params.stausText != "undefined") {
        this.statusText = params.statusText;
      }
      if (typeof params.encoding != "undefined") {
        this.encoding = params.encoding;
      }
      if (typeof params.method != "undefined") {
        this.method = params.method;
      }
      if (typeof params.headers != "undefined") {
        this.headers = params.headers;
      }
      if (typeof params.body != "undefined") {
        this.body = params.body;
      }
    }
    super();
  }

  // This class represents the result of all other fetched resources, including
  // cross-origin fetched resources using the CORS fetching mode.
  statusCode: Number;
  statusText: string;
  // Explicitly omitting httpVersion
  encoding: string;
  method: string;
  // NOTE: the internal "_headers" is not meant to be exposed. Only here for
  //       pseudo-impl purposes.
  _headers: Map; // FIXME: Needs filtering!
  get headers() {
    return this._headers;
  }
  set headers(items) {
    if (items instanceof Map) {
      items.forEach((value, key, map) => this._headers.set(key, value))
    } else {
      // Enumerate own properties and treat them as key/value pairs
      for (var x in items) {
        (function(x) {
          if (items.hasOwnProperty(x)) { this._headers.set(x, items[x]); }
        }).call(this, x);
      }
    }
  }
  body: any; /*TypedArray? String?*/
}

class ResponseFuture extends Future {}
class RequestFuture extends Future {}

class FetchEvent extends _Event {
  // The body of the request.
  request: Request;
  // Can be one of:
  //  "navigate"
  //  "fetch"
  type: string = "navigate";

  // The window issuing the request.
  window: any; // FIXME: should this also have an ID for easier use in ES5?

  // Informs the Controller wether or not the request corresponds to navigation
  // of the top-level window, e.g. reloading a tab or typing a URL into the URL
  // bar.
  isTopLevel: Boolean = false;

  // Future must resolve with a Response. A Network Error is thrown for other
  // resolution types/values.
  respondWith(r: Future) : void;
  respondWith(r: Response) : void;
  // "any" to make the TS compiler happy:
  respondWith(r: any) : void {
    if (!(r instanceof Response) || !(r instanceof Future)) {
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    if (r instanceof Response) {
      r = new Future(function(resolver) { resolver.resolve(r); });
    }
    r.done(_useControllerResponse,
           _defaultToBrowserHTTP);
  }

  forwardTo(url: URL) : Future;
  forwardTo(url: string) : Future;
  // "any" to make the TS compiler happy:
  forwardTo(url: any) : Future {
    if (!(url instanceof _URL) || typeof url != "string") {
      // Should *actually* be a DOMException.NETWORK_ERR
      // Can't be today because DOMException isn't currently constructable
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    return new Future(function(resolver){
      resolver.resolve(new SameOriginResponse({
        statusCode: 302,
        headers: { "Location": url.toString() }
      }));
    });
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
  // "any" to make the TS compiler happy:
  constructor(...urls:any[]) {
    // Note that items may ONLY contain Response instasnces
    if (urls.length) {
      // Begin fetching on the URLs and storing them in this.items
    }
  }

  // Match a URL or a string
  match(name:URL) : Future;
  match(name:string) : Future;
  // "any" to make the TS compiler happy:
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
  // "any" to make the TS compiler happy:
  add(...response:any[]) : Future {
    // If a URL (or URL string) is passed, a new CachedResponse is added to
    // items upon successful fetching
    return accepted();
  }

  // Needed because Response objects don't have URLs.
  addResponse(url, response:Response) : Future {
    return accepted();
  }

  remove(...response:string[]) : Future;
  remove(...response:URL[]) : Future;
  // "any" to make the TS compiler happy:
  remove(...response:any[]) : Future {
    // FIXME: does this need to be async?
    return accepted();
  }

  // For the below, see current AppCache, although we extend with sane returns

  // Update has the effect of checking the HTTP cache validity of all items
  // currently in the cache and updating with new versions if the current item
  // is expired. New items may be added to the cache with the urls that can be
  // passed. The HTTP cache is currently used for these resources but no
  // heuristic caching is applied for these requests.
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
  match(cacheName: String, url: URL) : RequestFuture;
  match(cacheName: String, url: String) : RequestFuture;
  // "any" to make the TS compiler happy
  match(cacheName: any, url: any) : RequestFuture {
    return new RequestFuture(function(){});
  }
}

class StaticRouter extends Map {
  // when URL is a string & ends in *, it acts as a matching prefix
  // sources can be ResponseSource, ResponseFuture, or Response, or String
  // Strings can be 'network', which will fetch the current url from the network
  add(url: any, sources: Array): void {};
  // cache can be string name or cache object
  // fallbackSources are tried if cache extraction fails
  addCache(cache: any, fallbackSources: Array): void {};
}

class StaticRoute {
  sources: Array;
}

class ResponseSource {
  get(): ResponseFuture { return acceptedResponse() };
}

class CacheSource extends ResponseSource {
  constructor(cacheName: String, url: any) { super(); };
}

class NetworkSource extends ResponseSource {
  constructor(url: any) { super(); };
}

////////////////////////////////////////////////////////////////////////////////
// Utility Decls to make the TypeScript compiler happy
////////////////////////////////////////////////////////////////////////////////

// Cause, you know, the stock definition claims that URL isn't a class. FML.
class _URL {
  constructor(url, base) {}
}

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

function acceptedResponse() : ResponseFuture {
  return new ResponseFuture(function(r) {
    r.accept(new Response());
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

var _useControllerResponse = function() : Future { return accepted(); };
var _defaultToBrowserHTTP = function(url?) : Future { return accepted(); };

interface NavigatorController {
  controller: Object;
}

interface Navigator extends NavigatorController,
  NavigatorID,
  NavigatorOnLine,
  NavigatorDoNotTrack,
  NavigatorAbilities,
  NavigatorGeolocation,
  MSNavigatorAbilities {

}