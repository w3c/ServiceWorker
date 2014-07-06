// This API proposal depends on:
//  DOM: http://www.w3.org/TR/domcore/
//  URLs: http://url.spec.whatwg.org/
//  Promises: https://github.com/slightlyoff/DOMPromise/
//  Shared Workers:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Semi-private to work around TS. Not for impl.
var _RegistrationOptionList = (function () {
    function _RegistrationOptionList() {
        this.scope = "/*";
    }
    return _RegistrationOptionList;
})();

var ReloadPageEvent = (function (_super) {
    __extends(ReloadPageEvent, _super);
    function ReloadPageEvent() {
        _super.apply(this, arguments);
    }
    // Delay the page unload to serialise state to storage or get user's
    // permission to reload.
    ReloadPageEvent.prototype.waitUntil = function (f) {
    };
    return ReloadPageEvent;
})(_Event);

///////////////////////////////////////////////////////////////////////////////
// The Service Worker
///////////////////////////////////////////////////////////////////////////////
var InstallPhaseEvent = (function (_super) {
    __extends(InstallPhaseEvent, _super);
    function InstallPhaseEvent() {
        _super.apply(this, arguments);
    }
    // Delay treating the installing worker until the passed Promise resolves
    // successfully. This is primarily used to ensure that an ServiceWorker is not
    // active until all of the "core" Caches it depends on are populated.
    // TODO: what does the returned promise do differently to the one passed in?
    InstallPhaseEvent.prototype.waitUntil = function (f) {
        return accepted();
    };
    return InstallPhaseEvent;
})(_Event);

var InstallEvent = (function (_super) {
    __extends(InstallEvent, _super);
    function InstallEvent() {
        _super.apply(this, arguments);
        this.activeWorker = null;
    }
    // Ensures that the worker is used in place of existing workers for
    // the currently controlled set of window instances.
    // NOTE(TOSPEC): this interacts with waitUntil in the following way:
    //   - replacement only happens upon successful installation
    //   - successful installation can be delayed by waitUntil, perhaps
    //     by subsequent event handlers.
    //   - therefore, replace doesn't happen immediately.
    InstallEvent.prototype.replace = function () {
    };
    return InstallEvent;
})(InstallPhaseEvent);

var ServiceWorkerClients = (function () {
    function ServiceWorkerClients() {
    }
    // A list of window objects, identifiable by ID, that correspond to windows
    // (or workers) that are "controlled" by this SW
    ServiceWorkerClients.prototype.getServiced = function () {
        return new Promise(function () {
        });
    };

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
    ServiceWorkerClients.prototype.reloadAll = function () {
        return new Promise(function () {
        });
    };
    return ServiceWorkerClients;
})();

// The scope in which worker code is executed
var ServiceWorkerGlobalScope = (function (_super) {
    __extends(ServiceWorkerGlobalScope, _super);
    function ServiceWorkerGlobalScope() {
        _super.apply(this, arguments);
    }
    ServiceWorkerGlobalScope.prototype.fetch = function (request) {
        // Notes:
        //  Promise resolves as soon as headers are available
        //  The Response object contains a toBlob() method that returns a
        //  Promise for the body content.
        //  The toBlob() promise will reject if the response is a OpaqueResponse.
        return new Promise(function (r) {
            r.resolve(_defaultToBrowserHTTP(request));
        });
    };
    return ServiceWorkerGlobalScope;
})(WorkerGlobalScope);

///////////////////////////////////////////////////////////////////////////////
// Event Worker APIs
///////////////////////////////////////////////////////////////////////////////
// http://fetch.spec.whatwg.org/#requests
var Request = (function () {
    function Request(params) {
        // see: http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
        this.timeout = 0;
        this.method = "GET";
        // FIXME: we only provide async!
        this.synchronous = false;
        this.forcePreflight = false;
        this.omitCredentials = false;
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
    return Request;
})();

// http://fetch.spec.whatwg.org/#responses
var AbstractResponse = (function () {
    function AbstractResponse() {
    }
    return AbstractResponse;
})();

var OpaqueResponse = (function (_super) {
    __extends(OpaqueResponse, _super);
    function OpaqueResponse() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(OpaqueResponse.prototype, "url", {
        get: // This class represents the result of cross-origin fetched resources that are
        // tainted, e.g. <img src="http://cross-origin.example/test.png">
        function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    return OpaqueResponse;
})(AbstractResponse);

var Response = (function (_super) {
    __extends(Response, _super);
    function Response(params) {
        if (params) {
            if (typeof params.status != "undefined") {
                this.status = params.status;
            }
            if (typeof params.statusText != "undefined") {
                this.statusText = params.statusText;
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
        _super.call(this);
    }
    Object.defineProperty(Response.prototype, "headers", {
        get: function () {
            // TODO: outline the whitelist of readable headers
            return this._headers;
        },
        set: function (items) {
            var _this = this;
            if (items instanceof Map) {
                items.forEach(function (value, key, map) {
                    return _this._headers.set(key, value);
                });
            } else {
                for (var x in items) {
                    (function (x) {
                        if (items.hasOwnProperty(x)) {
                            this._headers.set(x, items[x]);
                        }
                    }).call(this, x);
                }
            }
        },
        enumerable: true,
        configurable: true
    });

    Response.prototype.toBlob = function () {
        return accepted(new Blob());
    };
    return Response;
})(AbstractResponse);

var CORSResponse = (function (_super) {
    __extends(CORSResponse, _super);
    function CORSResponse() {
        _super.apply(this, arguments);
    }
    return CORSResponse;
})(Response);

var FetchEvent = (function (_super) {
    __extends(FetchEvent, _super);
    function FetchEvent() {
        _super.call(this, "fetch", { cancelable: true, bubbles: false });
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
        // TODO: this should go on the request object
        this.context = "connect";
        // Has the user provided intent for the page to be reloaded fresher than
        // their current view? Eg: pressing the refresh button
        // Clicking a link & hitting back shouldn't be considered a reload.
        // Ctrl+l enter: Left to the UA to decide
        this.isReload = false;

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
        this.client = null;
    }
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
    FetchEvent.prototype.respondWith = function (r) {
        if (!(r instanceof Response) || !(r instanceof Promise)) {
            throw new Error("Faux NetworkError because DOM is currently b0rken");
        }

        this.stopImmediatePropagation();

        if (r instanceof Response) {
            r = new Promise(function (resolver) {
                resolver.resolve(r);
            });
        }
        r.then(_useWorkerResponse, _defaultToBrowserHTTP);
    };

    // "any" to make the TS compiler happy:
    FetchEvent.prototype.forwardTo = function (url) {
        if (!(url instanceof _URL) || typeof url != "string") {
            throw new Error("Faux NetworkError because DOM is currently b0rken");
        }

        this.stopImmediatePropagation();

        return new Promise(function (resolver) {
            resolver.resolve(new Response({
                status: 302,
                headers: { "Location": url.toString() }
            }));
        });
    };

    // event.default() returns a Promise, which resolves to…
    // If it's a navigation
    //   If the response is a redirect
    //     It resolves to a OpaqueResponse for the redirect
    //     This is tagged with "other supermagic only-for-this happytime", meaning
    //     this request cannot be used for anything other than a response for this
    //     request (cannot go into cache)
    //   Else resolves as fetch(event.request)
    // Else
    //   Follow all redirects
    //   Tag response as "supermagic change url"
    //   When the page receives this response it should update the resource url to
    //   the response url (for base url construction etc)
    FetchEvent.prototype.default = function () {
        return accepted();
    };
    return FetchEvent;
})(_Event);

// Design notes:
//  - Caches are atomic: they are not complete until all of their resources are
//    fetched
//  - Updates are also atomic: the old contents are visible until all new
//    contents are fetched/installed.
//  - Caches should have version numbers and "update" should set/replace it
// This largely describes the current Application Cache API. It's only available
// inside worker instances (not in regular documents), meaning that caching is a
// feature of the event worker. This is likely to change!
var Cache = (function () {
    function Cache() {
    }
    // also for spec purposes only
    Cache.prototype._query = function (request, params) {
        params = params || {};

        var thisCache = this;
        var ignoreSearch = Boolean(params.ignoreSearch);
        var ignoreMethod = Boolean(params.ignoreMethod);
        var ignoreVary = Boolean(params.ignoreVary);
        var prefixMatch = Boolean(params.prefixMatch);

        request = _castToRequest(request);

        if (!ignoreMethod && request.method !== 'GET' && request.method !== 'HEAD') {
            // we only store GET responses at the moment, so no match
            return [];
        }

        var cachedRequests = this._items.keys().filter(function (cachedRequest) {
            var cachedUrl = new _URL(cachedRequest.url);
            var requestUrl = new _URL(request.url);

            if (ignoreSearch) {
                cachedUrl.search = '';
                requestUrl.search = '';
            }

            if (prefixMatch) {
                // FIXME(slightlyoff): handle globbing?
                cachedUrl.href = cachedUrl.href.slice(0, requestUrl.href.length);
            }

            return cachedUrl.href != cachedUrl.href;
        });

        var cachedResponses = cachedRequests.map(this._items.get.bind(this._items));
        var results = [];

        cachedResponses.forEach(function (cachedResponse, i) {
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

                if (cachedRequests[i].headers.get(varyHeader) != request.headers.get(varyHeader)) {
                    return;
                }
            }

            results.push([cachedRequests[i], cachedResponse]);
        });

        return results;
    };

    Cache.prototype.match = function (request, params) {
        // the UA may do something more optimal than this:
        return this.matchAll(request, params).then(function (responses) {
            if (responses[0]) {
                return responses[0];
            }

            throw new Error("Faux NotFoundError");
        });
    };

    Cache.prototype.matchAll = function (request, params) {
        var thisCache = this;

        return accepted().then(function () {
            if (request) {
                return thisCache._query(request, params).map(function (requestResponse) {
                    return requestResponse[1];
                });
            } else {
                return thisCache._items.values();
            }
        });
    };

    Cache.prototype.add = function () {
        var requests = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            requests[_i] = arguments[_i + 0];
        }
        var thisCache = this;
        requests = requests.map(_castToRequest);

        var responses = requests.map(function (request) {
            return fetch(request);
        });

        // wait for all our requests to complete
        return Promise.all(responses).then(function (responses) {
            // TODO: figure out what we consider success/failure
            responses.forEach(function (response) {
                if (response.status != 200) {
                    throw new Error("Faux NetworkError");
                }
            });

            // these set operations must be sync, so the update is atomic
            responses.forEach(function (response, i) {
                thisCache._query(requests[i]).forEach(function (cachedRequest) {
                    thisCache._items.delete(cachedRequest);
                });
                thisCache._items.set(requests[i], response);
            });

            return;
        });
    };

    Cache.prototype.put = function (request, response) {
        var thisCache = this;

        return accepted().then(function () {
            request = _castToRequest(request);

            if (request.method !== 'GET') {
                throw new TypeError();
            }

            if (!(response instanceof AbstractResponse)) {
                throw new TypeError();
            }

            // this must be atomic
            thisCache._query(request).forEach(function (cachedRequest) {
                thisCache._items.delete(cachedRequest);
            });
            thisCache._items.set(request, response);
        });
    };

    // delete zero or more entries
    Cache.prototype.delete = function (request, params) {
        var thisCache = this;

        return accepted().then(function () {
            return thisCache._query(request, params).reduce(function (previousResult, requestResponse) {
                return previousResult || thisCache._items.delete(requestResponse[0]);
            }, false);
        });
    };

    Cache.prototype.each = function (callback, thisArg) {
        var thisCache = this;

        // FIXME(slightlyoff): this version blocks on keys() and values() before
        // beginning iteration. Instead it should be allowed to begin iteration as
        // soon as the first item(s) are available. Further, developers should be
        // able to extend the lifetime of an item's iteration by returning a
        // Promise.
        return Promise.all([
            this.matchAll()
        ]).then(function (records) {
            return Promise.all(records.map(function (r, i) {
                return callback.call(thisArg, records[0][i], records[1][i], thisCache);
            }));
        }).then(function () {
            return undefined;
        });
    };
    return Cache;
})();

var CacheStorage = (function () {
    function CacheStorage(iterable) {
    }
    // "any" to make the TS compiler happy
    CacheStorage.prototype.match = function (url, cacheName) {
        return new Promise(function () {
        });
    };

    CacheStorage.prototype.get = function (key) {
        return accepted();
    };
    CacheStorage.prototype.has = function (key) {
        return accepted();
    };
    CacheStorage.prototype.set = function (key, val) {
        return accepted(this);
    };
    CacheStorage.prototype.clear = function () {
        return accepted();
    };
    CacheStorage.prototype.delete = function (key) {
        return accepted();
    };
    CacheStorage.prototype.forEach = function (callback, thisArg) {
    };
    CacheStorage.prototype.entries = function () {
        return accepted([]);
    };
    CacheStorage.prototype.keys = function () {
        return accepted([]);
    };
    CacheStorage.prototype.values = function () {
        return accepted([]);
    };
    CacheStorage.prototype.size = function () {
        return accepted(0);
    };
    return CacheStorage;
})();

////////////////////////////////////////////////////////////////////////////////
// Utility Decls to make the TypeScript compiler happy
////////////////////////////////////////////////////////////////////////////////
// See:
//    http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
var BroadcastChannel = (function () {
    function BroadcastChannel(channelName) {
    }
    return BroadcastChannel;
})();

var WorkerGlobalScope = (function (_super) {
    __extends(WorkerGlobalScope, _super);
    function WorkerGlobalScope() {
        _super.apply(this, arguments);
    }
    WorkerGlobalScope.prototype.setTimeout = function (handler, timeout) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 2); _i++) {
            args[_i] = arguments[_i + 2];
        }
        return 0;
    };

    WorkerGlobalScope.prototype.setInterval = function (handler, timeout) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 2); _i++) {
            args[_i] = arguments[_i + 2];
        }
        return 0;
    };

    // WindowTimerExtensions
    WorkerGlobalScope.prototype.msSetImmediate = function (expression) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        return 0;
    };

    WorkerGlobalScope.prototype.setImmediate = function (expression) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        return 0;
    };

    // WindowBase64
    WorkerGlobalScope.prototype.btoa = function (rawString) {
        return "";
    };
    WorkerGlobalScope.prototype.atob = function (encodedString) {
        return "";
    };
    return WorkerGlobalScope;
})(_EventTarget);

// Cause, you know, the stock definition claims that URL isn't a class. FML.
var _URL = (function () {
    function _URL(url) {
    }
    Object.defineProperty(_URL.prototype, "search", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(_URL.prototype, "pathname", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(_URL.prototype, "href", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    return _URL;
})();

// http://tc39wiki.calculist.org/es6/map-set/
// http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets
// http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-15.14.4
var _ES6Map = (function () {
    function _ES6Map(iterable) {
    }
    _ES6Map.prototype.get = function (key) {
    };
    _ES6Map.prototype.has = function (key) {
        return true;
    };
    _ES6Map.prototype.set = function (key, val) {
        return new _ES6Map();
    };
    _ES6Map.prototype.clear = function () {
    };
    _ES6Map.prototype.delete = function (key) {
        return true;
    };
    _ES6Map.prototype.forEach = function (callback, thisArg) {
    };
    _ES6Map.prototype.entries = function () {
        return [];
    };
    _ES6Map.prototype.keys = function () {
        return [];
    };
    _ES6Map.prototype.values = function () {
        return [];
    };
    return _ES6Map;
})();

// the TS compiler is unhappy *both* with re-defining DOM types and with direct
// sublassing of most of them. This is sane (from a regular TS pespective), if
// frustrating. As a result, we describe the built-in Event type with a prefixed
// name so that we can subclass it later.
var _Event = (function () {
    function _Event(type, eventInitDict) {
        this.bubbles = false;
        this.cancelable = true;
        this.defaultPrevented = false;
        this.isTrusted = false;
    }
    _Event.prototype.stopPropagation = function () {
    };
    _Event.prototype.stopImmediatePropagation = function () {
    };
    _Event.prototype.preventDefault = function () {
    };
    return _Event;
})();

var _CustomEvent = (function (_super) {
    __extends(_CustomEvent, _super);
    // Constructor(DOMString type, optional EventInit eventInitDict
    function _CustomEvent(type, eventInitDict) {
        _super.call(this, type, eventInitDict);
    }
    return _CustomEvent;
})(_Event);

var _EventTarget = (function () {
    function _EventTarget() {
    }
    _EventTarget.prototype.dispatchEvent = function (e) {
        return true;
    };
    return _EventTarget;
})();

// https://github.com/slightlyoff/DOMPromise/blob/master/DOMPromise.idl
var Resolver = (function () {
    function Resolver() {
    }
    Resolver.prototype.accept = function (v) {
    };
    Resolver.prototype.reject = function (v) {
    };
    Resolver.prototype.resolve = function (v) {
    };
    return Resolver;
})();

var Promise = (function () {
    // Callback type decl:
    //  callback : (n : number) => number
    function Promise(init) {
    }
    Promise.prototype.then = function (fulfilled) {
        return accepted();
    };

    Promise.prototype.catch = function (rejected) {
        return accepted();
    };

    Promise.all = function () {
        var stuff = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            stuff[_i] = arguments[_i + 0];
        }
        return accepted();
    };
    return Promise;
})();

function accepted(v) {
    if (typeof v === "undefined") { v = true; }
    return new Promise(function (r) {
        r.accept(true);
    });
}

function acceptedResponse() {
    return new Promise(function (r) {
        r.accept(new Response());
    });
}

function fetch(url) {
    return acceptedResponse();
}

// http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html#shared-workers-and-the-sharedworker-interface
var SharedWorker = (function (_super) {
    __extends(SharedWorker, _super);
    function SharedWorker(url, name) {
        _super.call(this);
    }
    return SharedWorker;
})(_EventTarget);

////////////////////////////////////////////////////////////////////////////////
// Not part of any public standard but used above:
////////////////////////////////////////////////////////////////////////////////
var Client = (function () {
    function Client() {
    }
    return Client;
})();

var _useWorkerResponse = function () {
    return accepted();
};
var _defaultToBrowserHTTP = function (url) {
    return accepted();
};

function _castToRequest(request) {
    if (!(request instanceof Request)) {
        request = new Request({
            'url': new _URL(request).href
        });
    }
    return request;
}
