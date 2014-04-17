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

class DocumentInstallPhaseEvent extends _Event {
  worker: ServiceWorker;
}

class DocumentInstallEvent extends DocumentInstallPhaseEvent {
  activeWorker: ServiceWorker = null;
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

interface ServiceWorkerClients {
  // A list of window objects, identifiable by ID, that correspond to windows
  // (or workers) that are "controlled" by this SW
  getServiced(): Promise; // Promise for Array<Client>

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
  fetch(request:URL); // a URL
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
        // should be "new URL(params.url)" but TS won't allow it
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
      if (typeof params.statusCode != "undefined") {
        this.statusCode = params.statusCode;
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
  statusCode: Number;
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
      resolver.resolve(new Response({
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
class Cache {
  // FIXME: need to add some way to get progress out
  _items: AsyncMap<Request, Response>;
  _readyPromise: Promise;

  constructor(...items:any[]) {
    this._readyPromise = this.add.apply(this, items);
  }

  match(request:any) : Promise {
    // the UA will do something more optimal than this:
    return this.matchAll(request).then(function(responses) {
      if (responses[0]) {
        return responses[0];
      }
      throw Error("No match");
    });
    // TODO: is it weird that this rejects on no result whereas matchAll/Keys resolve with empty array?
    // This needs to reject to work well with respondWith
  }

  // TODO: maybe this would be better as a querying method
  // so matchAll(string) would match all entries for that
  // url regardless of vary
  matchAll(request:any) : Promise {
    var thisCache = this;

    return this.keys(request).then(function(keys) {
      return Promise.all(keys.map(function(key) {
        return thisCache._items.get(key);
      }));
    });
  }

  static _cacheItemValid(request:Request, cachedRequest:Request, cachedResponse:Response) : Boolean {
    // filter by request method & url
    if (cachedRequest.method != request.method) return false;
    if (cachedRequest.url != request.url) return false;

    // filter by 'vary':
    // If there's no vary header, we have a match!
    if (!cachedResponse.headers.has('vary')) return true;

    var varyHeaders = cachedResponse.headers.get('vary').split(',');
    var varyHeader;

    for (var i = 0; i < varyHeaders.length; i++) {
      varyHeader = varyHeaders[i].trim();

      if (varyHeader == '*') {
        // TODO: should we just ignore vary: *?
        continue;
      }

      // TODO: should this treat headers case insensitive?
      // TODO: should comparison be more lenient than this?
      if (cachedRequest.headers.get(varyHeader) != request.headers.get(varyHeader)) {
        return false;
      }
    }

    return true;
  }

  keys(filterRequest:any) : Promise {
    var thisCache = this;

    if (!filterRequest) return this._items.keys();

    filterRequest = _castToRequest(filterRequest);

    return this._items.keys().then(function(cachedRequests) {
      // get the response
      return this._items.values().then(function(cachedResponses) {
        return cachedRequests.filter(function(cachedRequest, i) {
          return Cache._cacheItemValid(filterRequest, cachedRequest, cachedResponses[i]);
        });
      });
    });
  }

  add(...items:any[]) : Promise {
    var thisCache = this;
    var newItems:any = items.map(function(item) {
      // if item is a response, pair it with a simple request
      if (item instanceof Response) {
        return {
          'request': new Request({
            'url': item.url,
            'method': item.method
          }),
          'response': item
        };
      }

      item = _castToRequest(item);

      return {
        'request': <Request>item,
        'response': fetch(item)
      };
    });

    // wait for all our requests to complete
    return Promise.all(newItems.map(function(item) { return item.response; })).then(function(responses) {
      // TODO: figure out what we consider success/failure
      responses.forEach(function(response) {
        if (response.statusCode != 200) {
          throw Error('Request failed');
        }
      });

      return Promise.all(
        responses.map(function(response, i) {
          return thisCache.set(newItems[i].request, response);
        })
      );
    });
  }

  // TODO: accept ResponsePromise too?
  set(request:any, response:any) : Promise {
    var thisCache = this;
    request = _castToRequest(request);

    // TODO: if request.method is not GET, throw
    // TODO: cast 'response' to a response
    // Eg, Blob
    // Dataurl string
    // Could cast regular string as text/plain response, but is that useful?

    // TODO: this delete/set implementation isn't atomic, but needs to be.
    // Not sure how to implement it, maybe via a private _locked promise?
    // Deleting is garbage collection, but also ensures "uniqueness"
    return this.delete(request).then(function() {
      return thisCache._items.set(request, response);
    }).then(function() {
      return response;
    });
  }

  // delete zero or more entries
  delete(request) : Promise {
    // TODO: this means cache.delete("/hello/world/") may not delete
    // all entries for /hello/world/, because /hello/world/ will be
    // cast to a GET request. It won't remove entries for that url
    // that have 'vary' headers that don't match.
    //
    // We could special-case strings & urls here.
    var thisCache = this;

    return this.keys(request).then(function(cachedRequests) {
      return Promise.all(cachedRequests.map(function(cachedRequest) {
        return thisCache._items.delete(cachedRequest);
      }))
    });
  }

  // TODO: ready is only useful to validate the items added during construction
  // maybe we should get rid of the constructor param and force people to use
  // add() which returns a promise for that atomic operation
  ready(): Promise { return this._readyPromise; }
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
  match(url: URL, cacheName?: String) : ResponsePromise;
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

// take a string or url and resolve it to a request
function _castToRequest(item:any) : Request {
  // resolve strings to urls with the worker as a base
  if (item instanceof String) {
    item = new _URL(item/*, worker scope url */);
  }

  // create basic GET request from url
  if (item instanceof _URL) {
    item = new Request({
      'url': item
    });
  }

  if (!(item instanceof Request)) {
    throw TypeError("Param must be string/URL/Request");
  }

  return item;
}