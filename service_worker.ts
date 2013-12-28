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
interface NavigatorServiceWorker {
  // null if page has no activated worker
  serviceWorker: SharedServiceWorker;

  registerServiceWorker(scope: string/* or URL */, url: string/* or URL */): Promise;
    // If an event worker is in-waiting, and its url & scope matches both
    // url & scope
    //   - resolve the promise
    //   - abort these steps
    // If no worker is in-waiting, and the current active event worker's
    // url & scope matches url & scope
    //   - resolve the promise
    //   - abort these steps
    // If an event worker with the same scope & url is attempting registration
    //   - resolve the promise depending on the current registration attempt
    //   - abort these steps
    // Reject the promise if:
    //    - the URL is not same-origin
    //    - no scope is provided or the scope does not resolve/parse correctly
    //    - fetching the event worker returns with an error
    //    - installing the worker (the event the worker is sent) fails
    //      with an unhandled exception
    // TBD: possible error values upon rejection!
    //
    // Resolves once the install event is triggered without unhandled exceptions

  unregisterServiceWorker(scope: string): Promise;
    // TODO: if we have a worker-in-waiting & an active worker,
    // what happens? Both removed?
    // TODO: does removal happen immediately or using the same pattern as
    // a worker update?

  // called when a new worker becomes in-waiting
  onserviceworkerinstall: (ev: Event) => any;
    // TODO: needs custom event type?
    // TODO: is this actually useful? Can't simply reload due to other tabs

  // called when a new worker takes over via InstallEvent#replace
  onserviceworkerreplaced: (ev: Event) => any;
    // TODO: needs custom event type?
    // TODO: is this actually useful? Might want to force a reload at this point

  onserviceworkerreloadpage: (ev: ReloadPageEvent) => any;
    // TODO: this event name has gotten way too long
}

interface Navigator extends
  NavigatorServiceWorker,
  EventTarget,
  // the rest is just stuff from the default ts definition
  NavigatorID,
  NavigatorOnLine,
  // NavigatorDoNotTrack,
  // NavigatorAbilities,
  NavigatorGeolocation
  // MSNavigatorAbilities
{ }

interface SharedServiceWorker extends Worker {}
declare var SharedServiceWorker: {
  prototype: SharedServiceWorker;
}

class ReloadPageEvent extends _Event {
  // Delay the page unload to serialise state to storage or get user's permission
  // to reload.
  waitUntil(f: Promise): void {}
}

///////////////////////////////////////////////////////////////////////////////
// The Event Worker
///////////////////////////////////////////////////////////////////////////////
class InstallPhaseEvent extends _Event {
  previousVersion: any = 0;

  // Delay treating the installing worker until the passed Promise resolves
  // successfully. This is primarily used to ensure that an ServiceWorker is not
  // active until all of the "core" Caches it depends on are populated.
  // TODO: what does the returned promise do differently to the one passed in?
  waitUntil(f: Promise): Promise { return accepted(); }
}

class InstallEvent extends InstallPhaseEvent {
  previous: MessagePort = null;

  // Ensures that the worker is used in place of existing workers for
  // the currently controlled set of window instances.
  // TODO: how does this interact with waitUntil? Does it automatically wait?
  replace(): void {}

  // Assists in restarting all windows with the new worker.
  //
  // Return a new Promise
  // For each attached window:
  //   Trigger onserviceworkerreloadpage
  //   If onserviceworkerreloadpage has default prevented:
  //     Unfreeze any frozen windows
  //     reject returned promise
  //     abort these steps
  //   If waitUntil called on onserviceworkerreloadpage event:
  //     frozen windows may wish to indicate which window they're blocked on
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
  // Close all connections between the old worker and windows
  // Activate the new worker
  // Reload all windows asynchronously
  // Resolve promise
  reloadAll(): Promise {
    return new Promise(function() {

    });
  }
}

interface InstallEventHandler { (e:InstallEvent); }
interface ActivateEventHandler { (e:InstallPhaseEvent); }
interface FetchEventHandler { (e:FetchEvent); }

// FIXME: need custom event types!
interface BeforeCacheEvictionEventHandler { (e:_Event); }
interface CacheEvictionEventHandler { (e:_Event); }

interface OnlineEventHandler { (e:_Event); }
interface OfflineEventHandler { (e:_Event); }

// The scope in which worker code is executed
class ServiceWorkerGlobalScope extends WorkerGlobalScope {

  self: ServiceWorkerGlobalScope;

  caches: CacheList;
  get windows(): WindowList {
    return new WindowList();
  }

  // Set by the worker and used to communicate to newer versions what they
  // are replaceing (see InstallEvent::previousVersion)
  version: any = 0; // NOTE: versions must be structured-cloneable!

  //
  // Events
  //

  // "online" and "offline" events are deliveredy via the WorkerGlobalScope
  // contract:
  //    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#workerglobalscope

  // New Events

  // Called when a worker is downloaded and being setup to handle
  // events (navigations, alerts, etc.)
  oninstall: InstallEventHandler;

  // Called when a worker becomes the active event worker for a mapping
  onactivate: ActivateEventHandler;

  // Called whenever this worker is meant to decide the disposition of a
  // request.
  onfetch: FetchEventHandler;

  onbeforeevicted: BeforeCacheEvictionEventHandler;
  onevicted: CacheEvictionEventHandler;

  // FIXME(slightlyoff): Need to add flags for:
  //  - custom "accept/reject" handling, perhaps with global config
  //  - flag to consult the HTTP cache first?
  fetch(request:Request);
  fetch(request:URL); // a URL
  fetch(request:string); // a URL

  fetch(request:any) : Promise {
    return new Promise(function(r) {
      r.resolve(_defaultToBrowserHTTP(request));
    });
  }
}

///////////////////////////////////////////////////////////////////////////////
// Event Worker APIs
///////////////////////////////////////////////////////////////////////////////

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
  synchronous: boolean = false;
  redirectCount: Number = 0;
  forcePreflight: boolean = false;
  omitCredentials: boolean = false;
  referrer: URL;
  headers: Map<string, string>; // Needs filtering!
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
      if (typeof params.statusText != "undefined") {
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
  _headers: Map<string, string>; // FIXME: Needs filtering!
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

  // Does the request correspond to navigation of the top-level window, e.g.
  // reloading a tab or typing a URL into the URL bar?
  isTopLevel: boolean = false;

  // Does the navigation or fetch come from a document that has been "soft
  // reloaded"? That is to say, the reload button in the URL bar or the
  // back/forward buttons in browser chrome? If true, some apps may choose not
  // to work so hard to get "fresh" content to display.
  isReload: boolean = false;

  // Promise must resolve with a Response. A Network Error is thrown for other
  // resolution types/values.
  //  respondWith(r: Promise) : void;
  //  respondWith(r: Response) : void;
  respondWith(r: any) : void { // "any" to make the TS compiler happy:
    if (!(r instanceof Response) || !(r instanceof Promise)) {
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    if (r instanceof Response) {
      r = new Promise(function(resolver) { resolver.resolve(r); });
    }
    r.then(_useWorkerResponse,
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
    // the default browser worker. That is to say, to respond with something
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
// inside worker instances (not in regular documents), meaning that caching is a
// feature of the event worker. This is likely to change!
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
  update(...urls:_URL[]) : Promise;
  update(...urls:string[]) : Promise { return accepted(); }

  ready(): Promise { return accepted(); }
}

class CacheList implements Map<string, any> {
  constructor(iterable: Array<any>) { }

  // Convenience method to get ResponsePromise from named cache.
  match(cacheName: String, url: URL) : ResponsePromise;
  match(cacheName: String, url: String) : ResponsePromise;
  // "any" to make the TS compiler happy
  match(cacheName: any, url: any) : ResponsePromise {
    return new ResponsePromise(function(){});
  }

  // interface Map<any, any>
  get(key: any): any {}
  has(key: any): boolean { return true; }
  set(key: any, val: any): Map<any, any> { return this; }
  clear(): void {}
  delete(key: any): boolean { return true; }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): any[] { return []; }
  keys(): any[] { return []; }
  values(): any[] { return []; }
  get size(): number { return 0; }
}

////////////////////////////////////////////////////////////////////////////////
// Utility Decls to make the TypeScript compiler happy
////////////////////////////////////////////////////////////////////////////////

// See:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#workerglobalscope
interface WorkerLocation {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
}

interface WorkerNavigator extends NavigatorID, NavigatorOnLine {
  // TODO(slightlyoff): ensure these are rolled into the HTML spec's WorkerNavigator!
  // Extensions. See: https://github.com/slightlyoff/ServiceWorker/issues/122
  doNotTrack: string;
  cookieEnabled: boolean;
  mimeTypes: Array<string>;
}

interface WorkerUtils extends WindowTimers, WindowBase64 {
    importScripts: (...urls: string[]) => void;
    navigator: WorkerNavigator;
}

class WorkerGlobalScope extends _EventTarget implements WorkerUtils {
    // WorkerUtils
    importScripts: (...urls: string[]) => void;
    navigator: WorkerNavigator;

    // WindowTimers
    clearTimeout: (handle: number) => void;
    setTimeout(handler: any, timeout?: any, ...args: any[]): number {
      return 0;
    }
    clearInterval: (handle: number) => void;
    setInterval(handler: any, timeout?: any, ...args: any[]): number {
      return 0;
    }
    // WindowTimerExtensions
    msSetImmediate(expression: any, ...args: any[]): number { return 0; }
    clearImmediate: (handle: number) => void;
    msClearImmediate: (handle: number) => void;
    setImmediate(expression: any, ...args: any[]): number { return 0; }

    // WindowBase64
    btoa(rawString: string): string { return ""; }
    atob(encodedString: string): string { return ""; }

    // Base API
    self: WorkerGlobalScope;
    location: WorkerLocation;

    close: () => void;
    onerror: Function;
    onoffline: Function;
    ononline: Function;
}

// Cause, you know, the stock definition claims that URL isn't a class. FML.
class _URL {
  constructor(url, base) {}
}

// http://tc39wiki.calculist.org/es6/map-set/
// http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets
// http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-15.14.4
/*
class Map {
  constructor(iterable?:any[]) {}
  get(key: any): any {}
  has(key: any): boolean { return true; }
  set(key: any, val: any): void {}
  clear(): void {}
  delete(key: any): boolean { return true; }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): any[] { return []; }
  keys(): any[] { return []; }
  values(): any[] { return []; }
}
*/

// https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-event
interface EventHandler { (e:_Event); }
interface _EventInit {
  bubbles: boolean;
  cancelable: boolean;
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
  bubbles: boolean = false;
  cancelable: boolean = true;
  defaultPrevented: boolean = false;
  isTrusted: boolean = false;
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
  dispatchEvent(e:_Event): boolean {
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

var _useWorkerResponse = function() : Promise { return accepted(); };
var _defaultToBrowserHTTP = function(url?) : Promise { return accepted(); };
