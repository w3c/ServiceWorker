// This API proposal depends on:
//  DOM: http://www.w3.org/TR/domcore/
//  URLs: http://url.spec.whatwg.org/
//  Promises: https://github.com/slightlyoff/DOMPromise/
//  Shared Workers:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers

////////////////////////////////////////////////////////////////////////////////
// Document APIs
////////////////////////////////////////////////////////////////////////////////

interface RegistrationOptionList {
  scope: string;
}
// Semi-private to work around TS. Not for impl.
class _RegistrationOptionList implements RegistrationOptionList {
  scope = "/*";
}

interface ServiceWorkerContainer {
  installing?: ServiceWorker; // worker undergoing the install process
  waiting?: ServiceWorker; // installed worker, waiting to become current
  current?: ServiceWorker; // the worker handling resource requests for this page

  // FIXME: what's the semantic?
  //    https://github.com/slightlyoff/ServiceWorker/issues/170
  getAll(): Promise; // Promise<Array<ServiceWorker>>

  // Returns a Promise<ServiceWorker>
  register(url: string, options?: _RegistrationOptionList): Promise;
    // Resolves for a ServiceWorker instance once the url is parsed and
    // started, at the moment you can deliver a message, but before oninstall.
    //
    // If a worker is in-waiting, and its url & scope matches both url & scope
    //   - resolve the promise
    //   - abort these steps
    // If no worker is in-waiting, and the current active worker's
    // url & scope match
    //   - resolve the promise
    //   - abort these steps
    // Reject the promise if:
    //    - the URL is not same-origin
    //    - no scope is provided or the scope does not resolve/parse correctly
    //    - fetching the event worker returns with an error
    //    - installing the worker (the event the worker is sent) fails
    //      with an unhandled exception
    // TBD: possible error values upon rejection?

  unregister(scope?: string): Promise; // Defaults to "*"
    // Resolves with no value on success. Rejects if scope is mismatch.

  // Returns a Promise that resolves with the associated SW object when it
  // becomes either waiting or current worker for the document. (i.e., sw.state
  // is "installed" or "activating" or "activated", and the promise never
  // rejects in any case.)
  whenReady(): Promise; // Promise<ServiceWorker>

  onupdatefound: (ev: Event) => any;
    // Fires when .installing becomes a new worker

  oncurrentchange: (ev: Event) => any;
    // Fires when .current changes

  onreloadpage: (ev: ReloadPageEvent) => any;
    // FIXME: do we really need tihs?

  onerror: (ev: ErrorEvent) => any;
    // Called for any error from the active or installing SW's
    // FIXME: allow differentiation between active and installing SW's
    //        here, perhaps via .worker?
}

// extensions to window.navigator
interface NavigatorServiceWorker {
  // null if page has no activated worker
  serviceWorker: ServiceWorkerContainer;
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

interface ServiceWorker extends Worker, AbstractWorker {
  // Provides onerror, postMessage, etc.
  scope: string;
  url: string;
  state: string; // "installing" -> "installed" -> "activated" -> "activated" -> "redundant"
  onstatechange: (ev: Event) => any;
}

declare var ServiceWorker: {
  prototype: ServiceWorker;
}

class ReloadPageEvent extends _Event {
  // Delay the page unload to serialise state to storage or get user's
  // permission to reload.
  waitUntil(f: Promise): void {}
}

///////////////////////////////////////////////////////////////////////////////
// The Service Worker
///////////////////////////////////////////////////////////////////////////////
class InstallPhaseEvent extends _Event {
  // Delay treating the installing worker until the passed Promise resolves
  // successfully. This is primarily used to ensure that an ServiceWorker is not
  // active until all of the "core" Caches it depends on are populated.
  // TODO: what does the returned promise do differently to the one passed in?
  waitUntil(f: Promise): Promise { return accepted(); }
}

class InstallEvent extends InstallPhaseEvent {
  activeWorker: ServiceWorker = null;

  // Ensures that the worker is used in place of existing workers for
  // the currently controlled set of window instances.
  // NOTE(TOSPEC): this interacts with waitUntil in the following way:
  //   - replacement only happens upon successful installation
  //   - successful installation can be delayed by waitUntil, perhaps
  //     by subsequent event handlers.
  //   - therefore, replace doesn't happen immediately.
  replace(): void {}
}

interface InstallEventHandler { (e:InstallEvent); }
interface ActivateEventHandler { (e:InstallPhaseEvent); }
interface FetchEventHandler { (e:FetchEvent); }

// FIXME: need custom event types!
interface BeforeCacheEvictionEventHandler { (e:_Event); }
interface CacheEvictionEventHandler { (e:_Event); }

interface OnlineEventHandler { (e:_Event); }
interface OfflineEventHandler { (e:_Event); }

class ServiceWorkerClients {
  // A list of window objects, identifiable by ID, that correspond to windows
  // (or workers) that are "controlled" by this SW
  getServiced(): Promise { // Promise for Array<Client>
    return new Promise(function() {

    });
  }

  // Assists in restarting all windows
  //
  // Return a new Promise
  // For each attached window:
  //   Fire onreloadpage against navigator.serviceWorker
  //   If onreloadpage has default prevented:
  //     Unfreeze any frozen windows
  //     reject returned promise
  //     abort these steps
  //   If waitUntil called on onreloadpage event:
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

// The scope in which worker code is executed
class ServiceWorkerGlobalScope extends WorkerGlobalScope {

  self: ServiceWorkerGlobalScope;
  caches: CacheList;

  // A container for a list of window objects, identifiable by ID, that
  // correspond to windows (or workers) that are "controlled" by this SW
  clients: ServiceWorkerClients;

  // The registration pattern that matched this SW instance. E.g., if the
  // following registrations are made:
  //    navigator.serviceWorker.register("serviceworker.js", "/foo/*");
  //    navigator.serviceWorker.register("serviceworker.js", "/bar/*");
  // And the user navigates to http://example.com/foo/index.html,
  //    self.scope == "/foo/*"
  // SW's can use this to disambiguate which context they were started from.
  scope: string;

  // The url of this serviceworker, can be used as the base for urls
  url: string;

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

  // ServiceWorkerGlobalScope objects act as if they had an implicit MessagePort
  // associated with them. This port is part of a channel that is set up when
  // the worker is created, but it is not exposed. This object must never be
  // garbage collected before the ServiceWorkerGlobalScope object.
  // All messages received by that port must immediately be retargeted at the
  // ServiceWorkerGlobalScope object.
  // The ev.source of these MessageEvents are instances of Client
  onmessage: (ev: MessageEvent) => any;

  // FIXME(slightlyoff): Need to add flags for:
  //  - custom "accept/reject" handling, perhaps with global config
  //  - flag to consult the HTTP cache first?
  fetch(request:Request);
  fetch(request:string); // a URL

  fetch(request:any) : ResponsePromise {
    // Notes:
    //  ResponsePromise resolves as soon as headers are available
    //  The ResponsePromise and the Response object both contain a
    //   toBlob() method that return a Promise for the body content.
    //  The toBlob() promise will reject if the response is a OpaqueResponse
    //  or if the original ResponsePromise is rejected.
    return new ResponsePromise(function(r) {
      r.resolve(_defaultToBrowserHTTP(request));
    });
  }

  // Ping the server for an updated version of this script, without consulting
  // caches. Conceptually the same operation that SW's do max once every 24
  // hours.
  update: () => void;

  unregister: () => void;
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
        this.url = params.url;
      }
      if (typeof params.synchronous != "undefined") {
        this.synchronous = params.synchronous;
      }
      if (typeof params.forcePreflight != "undefined") {
        this.forcePreflight = params.forcePreflight;
      }
      if (typeof params.forceSameOrigin != "undefined") {
        this.forceSameOrigin = params.forceSameOrigin;
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

  // see: http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
  timeout: Number = 0;
  url: string;
  method: string = "GET";
  origin: string;
  // FIXME: mode doesn't seem useful here.
  mode: string; // Can be one of "same origin", "tainted x-origin", "CORS"
  // FIXME: we only provide async!
  synchronous: boolean = false;
  redirectCount: Number = 0;
  forcePreflight: boolean = false;
  forceSameOrigin: boolean = false;
  omitCredentials: boolean = false;
  referrer: URL;
  headers: Map<string, string>; // Needs filtering!
  body: any; /*TypedArray? String?*/
}

// http://fetch.spec.whatwg.org/#responses
class AbstractResponse {
  constructor() {}
}

class OpaqueResponse extends AbstractResponse {
  // This class represents the result of cross-origin fetched resources that are
  // tainted, e.g. <img src="http://cross-origin.example/test.png">

  get url(): string { return ""; } // Read-only for x-origin
}

class Response extends AbstractResponse {
  constructor(params?) {
    if (params) {
      if (typeof params.status != "undefined") {
        this.status = params.status;
      }
      if (typeof params.statusText != "undefined") {
        this.statusText = params.statusText;
      }
      if (typeof params.method != "undefined") {
        this.method = params.method;
      }
      if (typeof params.headers != "undefined") {
        this.headers = params.headers;
      }
      /*
      // FIXME: What do we want to do about passing in the body?
      if (typeof params.body != "undefined") {
        this.body = params.body;
      }
      */
    }
    super();
  }

  // This class represents the result of all other fetched resources, including
  // cross-origin fetched resources using the CORS fetching mode.
  status: Number;
  statusText: string;
  // Explicitly omitting httpVersion
  method: string;
  // NOTE: the internal "_headers" is not meant to be exposed. Only here for
  //       pseudo-impl purposes.
  _headers: Map<string, string>; // FIXME: Needs filtering!
  get headers() {
    // TODO: outline the whitelist of readable headers
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
  url: string;
  toBlob(): Promise { return accepted(new Blob()); }
}

class CORSResponse extends Response {
  // TODO: slightlyoff: make CORS headers readable but not setable?
  // TODO: outline the whitelist of readable headers
}


class ResponsePromise extends Promise {
  toBlob(): Promise { return accepted(new Blob()); }
}
class RequestPromise extends Promise {}

class FetchEvent extends _Event {
  // The body of the request.
  request: Request;

  // The window issuing the request.
  client: Client;

  // Can be one of:
  //   "connect",
  //   "font",
  //   "img",
  //   "object",
  //   "script",
  //   "style",
  //   "worker",
  //   "popup",
  //   "child",
  //   "navigate"
  purpose: string = "connect";

  // Has the user provided intent for the page to be reloaded fresher than
  // their current view? Eg: pressing the refresh button
  // Clicking a link & hitting back shouldn't be considered a reload.
  // Ctrl+l enter: Left to the UA to decide
  isReload: boolean = false;

  // * If a Promise is provided, it must resolve with a Response, else a
  //   Network Error is thrown.
  // * If the request isTopLevel navigation and the return value
  //   is a CrossOriginResponse (an opaque response body), a Network Error is
  //   thrown.
  // * The final URL of all successful (non network-error) responses is
  //   the *requested* URL.
  // * Renderer-side security checks about tainting for
  //   x-origin content are tied to the transparency (or opacity) of
  //   the Response body, not URLs.
  //
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

  forwardTo(url: string) : Promise; // treated as url
  // "any" to make the TS compiler happy:
  forwardTo(url: any) : Promise {
    if (!(url instanceof _URL) || typeof url != "string") {
      // Should *actually* be a DOMException.NETWORK_ERR
      // Can't be today because DOMException isn't currently constructable
      throw new Error("Faux NetworkError because DOM is currently b0rken");
    }

    this.stopImmediatePropagation();

    return new Promise(function(resolver){
      resolver.resolve(new Response({
        status: 302,
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
    this.client = null; // to allow postMessage, window.topLevel, etc
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
class Cache implements AsyncMap<Request, Response> {
  // this is for spec purposes only, the browser will use something async and disk-based
  _items: Map<Request, Response>;

  constructor() {
  }

  // also for spec purposes only
  _query(request:any, params?) : AbstractResponse[] {
    params = params || {};
    
    var thisCache = this;
    var ignoreQuerystring = Boolean(params.ignoreQuerystring);
    var ignoreMethod = Boolean(params.ignoreMethod);
    var ignoreVary = Boolean(params.ignoreVary);
    var matchLongerPaths = Boolean(params.matchLongerPaths);

    request = _castToRequest(request);

    if (!ignoreMethod && request.method !== 'GET' && request.method !== 'HEAD') {
      // we only store GET responses at the moment, so no match
      return [];
    }

    var cachedRequests = this._items.keys().filter(function(cachedRequest) {
      var cachedUrl = new URL(cachedRequest.url);
      var requestUrl = new URL(request.url);
      
      if (ignoreQuerystring) {
        cachedUrl.search = '';
        requestUrl.search = '';
      }

      if (matchLongerPaths) {
        cachedUrl.pathname = cachedUrl.pathname.slice(0, requestPath.pathname.length);
      }

      return cachedUrl.href != cachedUrl.href;
    });

    var cachedResponses = cachedRequests.map(this._items.get.bind(this._items));
    var results = [];

    cachedResponses.forEach(function(cachedReponse, i) {
      if (!cachedResponse.headers.has('vary') || ignoreVary) {
        results.push([cachedRequests[i], cachedResponse]);
        return;
      }

      var varyHeaders = cachedResponse.headers.get('vary').split(',');
      var varyHeader;

      for (var j = 0; j < varyHeaders.length; j++) {
        varyHeader = varyHeaders[j].trim();

        if (varyHeader == '*') {
          continue;
        }

        // TODO: should this treat headers case insensitive?
        // TODO: should comparison be more lenient than this?
        if (cachedRequests[i].headers.get(varyHeader) != request.headers.get(varyHeader)) {
          return;
        }
      }

      results.push([cachedRequests[i], cachedResponse]);
    });

    return results;
  }

  match(request:any, params?) : Promise {
    // the UA may do something more optimal than this:
    return this.values(request, params).then(function(responses) {
      if (responses[0]) {
        return responses[0];
      }
      throw new NotFoundError();
    });
  }

  values(request?:any, params?) : Promise {
    var thisCache = this;

    return Promise.resolve().then(function() {
      if (request) {
        return thisCache._query(request, params).map(function(requestResponse) {
          return requestResponse[1];
        });
      }
      else {
        return thisCache._items.values();
      }
    });
  }

  get(request:Request) : Promise {
    var thisCache = this;
    
    return Promise.resolve().then(function() {
      return thisCache._items.get(request);
    });
  }

  keys(request?:any, params?) : Promise {
    var thisCache = this;

    return Promise.resolve().then(function() {
      if (request) {
        return thisCache._query(request, params).map(function(requestResponse) {
          return requestResponse[0];
        });
      }
      else {
        return thisCache._items.keys();
      }
    });
  }

  add(...requests:any[]) : Promise {
    var thisCache = this;
    requests = requests.map(_castToRequest);

    var responses = requests.map(function(request) {
      return fetch(request);
    });

    // wait for all our requests to complete
    return Promise.all(responses).then(function(responses) {
      // TODO: figure out what we consider success/failure
      responses.forEach(function(response) {
        if (response.status != 200) {
          throw new NetworkError();
        }
      });

      // these set operations must be sync, so the update is atomic
      responses.forEach(function(response, i) {
        thisCache._query(requests[i]).forEach(function(cachedRequest) {
          thisCache._items.delete(cachedRequest);
        });
        thisCache._items.set(requests[i], response);
      });

      return;
    });
  }

  // TODO: accept ResponsePromise too?
  set(request:any, response:AbstractResponse) : Promise {
    var thisCache = this;
    
    return Promise.resolve().then(function() {
      request = _castToRequest(request);

      if (request.method !== 'GET') {
        throw new TypeError();
      }

      if (!(response instanceof AbstractResponse)) {
        throw new TypeError();
      }      

      // this must be atomic
      thisCache._query(request).forEach(function(cachedRequest) {
        thisCache._items.delete(cachedRequest);
      });
      thisCache._items.set(request, response);
    });
  }

  // delete zero or more entries
  delete(request:any, params?) : Promise {
    var thisCache = this;

    return Promise.resolve().then(function() {
      return thisCache._query(request, params).reduce(function(previousResult, requestResponse) {
        return previousResult || thisCache._items.delete(requestResponse[0]);
      }, false);
    });
  }

  has(request:any, params?) : Promise {
    // The UA will probably do this a more optimal way
    return this.match(request, params).then(function() {
      return true;
    }).catch(function() {
      return false;
    });
  }

  forEach(callback: Function, thisArg?: Object) : Promise {
    var thisCache = this;

    return Promise.all([
      this.values(),
      this.keys()
    ]).then(function(records) {
      return Promise.all(records.map(function(r, i) {
        return callback.call(thisArg, records[0][i], records[1][i], thisCache);
      }));
    }).then(function() {
      return undefined;
    });
  }
}

class CacheList implements AsyncMap<any, any> {
  constructor(iterable: Array<any>) { }

  // Convenience method to get ResponsePromise from caches. Returns the
  // first url match from the fist cache (in insertion order, per ES6 Maps).
  // The second optional cache name parameter invokes a search inside a
  // specific Cache object.

  // If no url is specified, the response is rejected.
  // If a named Cache is not found, the response is rejected.
  // If no matching item is found in a named cache, the response is rjected.
  // If no cacheName is specified and no matching item is found in any cache,
  // the response is rejected.
  match(url: String, cacheName?: String) : ResponsePromise;
  // "any" to make the TS compiler happy
  match(url: any, cacheName?: any) : ResponsePromise {
    return new ResponsePromise(function(){});
  }

  get(key: any): Promise { return accepted(); }
  has(key: any): Promise { return accepted(); }
  set(key: any, val: any): Promise { return accepted(this); }
  clear(): Promise { return accepted(); }
  delete(key: any): Promise { return accepted(); }
  forEach(callback: Function, thisArg?: Object): void {}
  items(): Promise { return accepted([]); }
  keys(): Promise { return accepted([]); }
  values(): Promise { return accepted([]); }
  get size(): number { return 0; }
}

////////////////////////////////////////////////////////////////////////////////
// Utility Decls to make the TypeScript compiler happy
////////////////////////////////////////////////////////////////////////////////

// See:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
class BroadcastChannel {
  constructor(channelName: string) {}
  postMessage: (message: string) => void;
  onmessage: (ev: MessageEvent) => any;
};

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

class WorkerGlobalScope extends _EventTarget
                        implements WorkerUtils, AbstractWorker {
    // AbstractWorker
    onerror: (ev: ErrorEvent) => any;

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
    onoffline: Function;
    ononline: Function;
}

// Cause, you know, the stock definition claims that URL isn't a class. FML.
class _URL {
  constructor(url:any) {}
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
  addEventListener: (t:string, l:EventListener, cap?: boolean) => void;
  removeEventListener: (t:string, l:EventListener, cap?: boolean) => void;
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

  // Not entirely sure what I'm doing here, just trying to keep
  // typescript happy
  then(fulfilled : (val:any) => any) : Promise;
  then(fulfilled : (val:any) => any, rejected : (val:any) => any) : Promise;
  then(fulfilled:any) : Promise {
    return accepted();
  }

  catch(rejected : (val:any) => any) : Promise {
    return accepted();
  }

  static all(...stuff:any[]) : Promise {
    return accepted();
  }
}

function accepted(v: any = true) : Promise {
  return new Promise(function(r) {
    r.accept(true);
  });
}

function acceptedResponse() : ResponsePromise {
  return new ResponsePromise(function(r) {
    r.accept(new Response());
  });
}

function fetch(url:any) : Promise {
  return acceptedResponse();
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
class Client {
  id: number;
  postMessage: (message: any, targetOrigin: string, ports?: any) => void;
}

interface AsyncMap<K, V> {
  // constructor(iterable?:any[]) {}
  get<K>(key: K): Promise;
  has<K>(key: K): Promise;
  set<K>(key: K, val: V): Promise;
  clear(): Promise;
  delete(key: K): Promise;
  forEach(callback: Function, thisArg?: Object): void;
  items(): Promise;
  keys(): Promise;
  values(): Promise;
}

var _useWorkerResponse = function() : Promise { return accepted(); };
var _defaultToBrowserHTTP = function(url?) : Promise { return accepted(); };

function _castToRequest(request:any) {
  if (!(request instanceof Request)) {
    request = new Request({
      'url': new URL(request/*, this script url */).href
    });
  }
  return request;
}