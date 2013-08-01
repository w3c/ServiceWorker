// This API proposal depends on:
//  DOM: http://www.w3.org/TR/domcore/
//  URLs: http://url.spec.whatwg.org/
//  Promises: https://github.com/slightlyoff/DOMPromise/
//  Shared Workers:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers

////////////////////////////////////////////////////////////////////////////////
// Document APIs
////////////////////////////////////////////////////////////////////////////////

// extensions to window.navigator
interface NavigatorController {
  // null if page has no activated controller
  controller: ControllerSharedWorker;

  registerController(scope: string /* or URL */, url: string /* or URL */): Promise;
    // If a controller is in-waiting, and its url & scope matches url & scope
    //   - resolve the promise
    //   - abort these steps
    // If no controller is in-waiting, and the current active controller's
    // url & scope matches url & scope
    //   - resolve the promise
    //   - abort these steps
    // If a controller with the same scope & url is attempting registration
    //   - resolve the promise depending on the current registration attempt
    //   - abort these steps
    // Reject the promise if:
    //    - the URL is not same-origin
    //    - no scope is provided or the scope does not resolve/parse correctly
    //    - fetching the controller returns with an error
    //    - installing the controller (the event the controller is sent) fails
    //      with an unhandled exception
    // TBD: possible error values upon rejection
    //
    // Resolves once the install event is triggered without unhandled exceptions

  unregisterController(scope: string): Promise;
    // TODO: if we have a controller in-waiting & an active controller,
    // what happens? Both removed?
    // TODO: does removal happen immediately or using the same pattern as
    // a controller update?

  // called when a new controller becomes in-waiting
  oncontrollerinstall: (ev: Event) => any;
    // TODO: needs custom event type?
    // TODO: is this actually useful? Can't simply reload due to other tabs

  // called when a new controller takes over via InstalledEvent#replace
  oncontrollerreplace: (ev: Event) => any;
    // TODO: needs custom event type?
    // TODO: is this actually useful? Might want to force a reload at this point
 
  oncontrollerreloadpage: (ev: ReloadPageEvent) => any;
}

interface Navigator extends
  NavigatorController,
  EventTarget,
  // the rest is just stuff from the default ts definition
  NavigatorID,
  NavigatorOnLine,
  NavigatorDoNotTrack,
  NavigatorAbilities,
  NavigatorGeolocation,
  MSNavigatorAbilities {
}

interface ControllerSharedWorker extends Worker {}
declare var ControllerSharedWorker: {
  prototype: ControllerSharedWorker;
}

class ReloadPageEvent extends _Event {
  // Delay the page unload to serialise state to storage or get user's permission
  // to reload.
  waitUntil(f: Promise): void {}
}

////////////////////////////////////////////////////////////////////////////////
// The Controller
////////////////////////////////////////////////////////////////////////////////
class InstallPhaseEvent extends _Event {
  previousVersion: any = 0;

  // Delay treating the installing controller until the passed Promise resolves
  // successfully. This is primarily used to ensure that a
  // NavigationController is not active until all of the "core" Caches it
  // depends on are populated.
  // TODO: what does the returned promise do differently to the one passed in?
  waitUntil(f: Promise): Promise { return accepted(); }
}

class InstalledEvent extends InstallPhaseEvent {
  previous: MessagePort = null;

  // Ensures that the controller is used in place of existing controllers for
  // the currently controlled set of window instances.
  // TODO: how does this interact with waitUntil? Does it automatically wait?
  replace(): void {};

  // Assists in restarting all windows with the new controller.
  // 
  // Return a new Promise
  // For each attached window:
  //   Trigger controllerreloadpage
  //   If controllerreloadpage has default prevented:
  //     Unfreeze any frozen windows
  //     reject returned promise
  //     abort these steps
  //   If waitUntil called on controllerreloadpage event:
  //     frozen windows may wish to indicate which window/tab they're blocked on
  //     yeild until promise passed into waitUntil resolves
  //     if waitUntil promise is accepted:
  //       freeze window (ui may wish to grey it out)
  //     else:
  //       Unfreeze any frozen windows
  //       reject returned promise
  //       abort these steps
  //   Else:
  //     freeze window (ui may wish to grey it out)
  // Unload all windows
  // If any window fails to unload, eg via onbeforeunload:
  //   Unfreeze any frozen windows
  //   reject returned promise
  //   abort these steps
  // Activate controller
  // Reload all windows asynchronously
  // Resolve promise
  reloadAll(): Promise {
    return new Promise(function() {

    });
  }
}

interface InstalledEventHandler { (e:InstalledEvent); }
interface ActivateEventHandler { (e:InstallPhaseEvent); }
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

  // Called whenever this controller is meant to decide the disposition of a
  // request.
  onfetch: FetchEventHandler;

  onbeforeevicted: BeforeCacheEvictionEventHandler;
  onevicted: CacheEvictionEventHandler;

  // FIXME(slightlyoff): Need to add flags for:
  //  - custom "accept/reject" handling, perhaps with global config
  //  - flag to consult the HTTP cache first?
  networkFetch(request:Request);
  networkFetch(request:URL); // a URL
  networkFetch(request:string); // a URL

  networkFetch(request:any) : Promise {
    return new Promise(function(r) {
      r.resolve(_defaultToBrowserHTTP(request));
    });
  }
}

////////////////////////////////////////////////////////////////////////////////
// Controller APIs
////////////////////////////////////////////////////////////////////////////////

// http://fetch.spec.whatwg.org/#requests
class Request {
  constructor(params?) {
    if (params) {
      if (typeof params.timeout != "undefined") {
        this.timeout = params.timeout;
      }
      if (typeof params.url != "undefined") {
        // should be "new URL(params.url)" but TS won't allow it
        this.url = params.url;
      }
      if (typeof params.synchronous != "undefined") {
        this.synchronous = params.synchronous;
      }
      if (typeof params.encoding != "undefined") {
        this.encoding = params.encoding;
      }
      if (typeof params.forcePreflight != "undefined") {
        this.forcePreflight = params.forcePreflight;
      }
      if (typeof params.omitCredentials != "undefined") {
        this.omitCredentials = params.omitCredentials;
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
  }

  encoding: string;
  // see: http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
  timeout: Number = 0;
  url: URL;
  method: string = "GET";
  origin: string;
  // FIXME: mode doesn't seem useful here.
  mode: string; // Can be one of "same origin", "tainted x-origin", "CORS"
  // FIXME: we don't provide anything but async fetching...
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

class ResponsePromise extends Promise {}
class RequestPromise extends Promise {}

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

  // Promise must resolve with a Response. A Network Error is thrown for other
  // resolution types/values.
  respondWith(r: Promise) : void;
  respondWith(r: Response) : void;
  // "any" to make the TS compiler happy:
  respondWith(r: any) : void {
    if (!(r instanceof Response) || !(r instanceof Promise)) {
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    if (r instanceof Response) {
      r = new Promise(function(resolver) { resolver.resolve(r); });
    }
    r.done(_useControllerResponse,
           _defaultToBrowserHTTP);
  }

  forwardTo(url: URL) : Promise;
  forwardTo(url: string) : Promise;
  // "any" to make the TS compiler happy:
  forwardTo(url: any) : Promise {
    if (!(url instanceof _URL) || typeof url != "string") {
      // Should *actually* be a DOMException.NETWORK_ERR
      // Can't be today because DOMException isn't currently constructable
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    return new Promise(function(resolver){
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
  items: AsyncMap;

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
  match(name:URL) : Promise;
  match(name:string) : Promise;
  // "any" to make the TS compiler happy:
  match(name:any) : Promise {
    // name matches something in items
    if (name) {
      return this.items.get(name.toString());
    }
  }

  // TODO: define type-restricting getters/setters

  // Cribbed from Mozilla's proposal, but with sane returns
  add(...response:string[]) : Promise;
  add(...response:URL[]) : Promise;
  // "any" to make the TS compiler happy:
  add(...response:any[]) : Promise {
    // If a URL (or URL string) is passed, a new CachedResponse is added to
    // items upon successful fetching
    return accepted();
  }

  // Needed because Response objects don't have URLs.
  addResponse(url, response:Response) : Promise {
    return accepted();
  }

  remove(...response:string[]) : Promise;
  remove(...response:URL[]) : Promise;
  // "any" to make the TS compiler happy:
  remove(...response:any[]) : Promise {
    // FIXME: does this need to be async?
    return accepted();
  }

  // For the below, see current AppCache, although we extend with sane returns

  // Update has the effect of checking the HTTP cache validity of all items
  // currently in the cache and updating with new versions if the current item
  // is expired. New items may be added to the cache with the urls that can be
  // passed. The HTTP cache is currently used for these resources but no
  // heuristic caching is applied for these requests.
  update(...urls:URL[]) : Promise;
  update(...urls:string[]) : Promise { return accepted(); }

  ready(): Promise { return accepted(); }
}

class CacheList extends Map {
  constructor(iterable: Array) {
    // Overrides to prevent non-URLs to be added go here.
    super();
  }

  // Convenience method to get ResponsePromise from named cache.
  match(cacheName: String, url: URL) : ResponsePromise;
  match(cacheName: String, url: String) : ResponsePromise;
  // "any" to make the TS compiler happy
  match(cacheName: any, url: any) : ResponsePromise {
    return new ResponsePromise(function(){});
  }
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

// https://github.com/slightlyoff/DOMPromise/blob/master/DOMPromise.idl
class Resolver {
  public accept(v:any): void {}
  public reject(v:any): void {}
  public resolve(v:any): void {}
}

class Promise {
  // Callback type decl:
  //  callback : (n : number) => number
  constructor(init : (r:Resolver) => void ) {

  }
}

function accepted() : Promise {
  return new Promise(function(r) {
    r.accept(true);
  });
}

function acceptedResponse() : ResponsePromise {
  return new ResponsePromise(function(r) {
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
  get(key: any): Promise { return accepted(); }
  has(key: any): Promise { return accepted(); }
  set(key: any, val: any): Promise { return accepted(); }
  clear(): Promise { return accepted(); }
  delete(key: any): Promise { return accepted(); }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): Promise { return accepted(); }
  keys(): Promise { return accepted(); }
  values(): Promise { return accepted(); }
}

var _useControllerResponse = function() : Promise { return accepted(); };
var _defaultToBrowserHTTP = function(url?) : Promise { return accepted(); };