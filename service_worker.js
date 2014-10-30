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
var _RegistrationOptions = (function () {
    function _RegistrationOptions() {
        this.scope = "/*";
    }
    return _RegistrationOptions;
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
var ExtendableEvent = (function (_super) {
    __extends(ExtendableEvent, _super);
    function ExtendableEvent() {
        _super.apply(this, arguments);
    }
    // Delay treating the installing worker until the passed Promise resolves
    // successfully. This is primarily used to ensure that an ServiceWorker is not
    // active until all of the "core" Caches it depends on are populated.
    ExtendableEvent.prototype.waitUntil = function (f) {
    };
    return ExtendableEvent;
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
})(ExtendableEvent);

var ServiceWorkerClients = (function () {
    function ServiceWorkerClients() {
    }
    ServiceWorkerClients.prototype.getAll = function (options) {
        return new Promise(function () {
            // the objects returned will be new instances every time
        });
    };
    return ServiceWorkerClients;
})();

var ServiceWorkerClient = (function () {
    function ServiceWorkerClient(url) {
        // attempt to open a new tab/window to url
    }
    return ServiceWorkerClient;
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

    Response.redirect = // http://fetch.spec.whatwg.org/#dom-response-redirect
    function (url, status) {
        return new Response();
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
            resolver.resolve(Response.redirect(url.toString(), {
                status: 302
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
    Cache.prototype._query = function (request, options) {
        var ignoreSearch, ignoreMethod, ignoreVary, prefixMatch;

        if (options) {
            ignoreSearch = options.ignoreSearch;
            ignoreMethod = options.ignoreMethod;
            ignoreVary = options.ignoreVary;
            prefixMatch = options.prefixMatch;
        } else {
            ignoreSearch = false;
            ignoreMethod = false;
            ignoreVary = false;
            prefixMatch = false;
        }

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

    Cache.prototype.match = function (request, options) {
        // the UA may do something more optimal than this:
        return this.matchAll(request, options).then(function (responses) {
            return responses[0];
        });
    };

    Cache.prototype.matchAll = function (request, options) {
        var thisCache = this;

        return accepted().then(function () {
            if (request) {
                return thisCache._query(request, options).map(function (requestResponse) {
                    return requestResponse[1];
                });
            } else {
                return thisCache._items.values();
            }
        });
    };

    Cache.prototype.add = function (request) {
        return this.addAll([request]).then(function (responses) {
            return responses[0];
        }).then(function (response) {
            return undefined;
        });
    };

    Cache.prototype.addAll = function (requests) {
        var thisCache = this;
        requests = requests.map(_castToRequest);

        var responsePromises = requests.map(function (request) {
            var requestURL = new _URL(request.url);
            if ((requestURL.protocol !== 'http:') && (requestURL.protocol !== 'https:'))
                return Promise.reject(new Error("Faux NetworkError"));
            return fetch(request);
        });

        // wait for all our requests to complete
        return Promise.all(responsePromises).then(function (responses) {
            return thisCache._batch(responses.map(function (response, i) {
                return { type: 'put', request: requests[i], response: response };
            })).then(function (responses) {
                return undefined;
            });
        });
    };

    Cache.prototype.put = function (request, response) {
        var thisCache = this;

        return this._batch([
            { type: 'put', request: request, response: response }
        ]).then(function (results) {
            return undefined;
        });
    };

    // delete zero or more entries
    Cache.prototype.delete = function (request, options) {
        return this._batch([
            { type: 'delete', request: request, options: options }
        ]).then(function (results) {
            if (results) {
                return true;
            } else {
                return false;
            }
        });
    };

    Cache.prototype.keys = function (request, options) {
        var thisCache = this;

        return accepted().then(function () {
            if (request) {
                return thisCache._query(request, options).map(function (requestResponse) {
                    return requestResponse[0];
                });
            } else {
                return thisCache._items.keys();
            }
        });
    };

    Cache.prototype._batch = function (operations) {
        var thisCache = this;

        return Promise.resolve().then(function () {
            var itemsCopy = thisCache._items;
            var addedRequests = [];

            try  {
                return operations.map(function handleOperation(operation, i) {
                    if (operation.type != 'delete' && operation.type != 'put') {
                        throw TypeError("Invalid operation type");
                    }
                    if (operation.type == "delete" && operation.response) {
                        throw TypeError("Cannot use response for delete operations");
                    }

                    var request = _castToRequest(operation.request);
                    var result = thisCache._query(request, operation.options).reduce(function (previousResult, requestResponse) {
                        if (addedRequests.indexOf(requestResponse[0]) !== -1) {
                            throw Error("Batch operation at index " + i + " overrode previous put operation");
                        }
                        return thisCache._items.delete(requestResponse[0]) || previousResult;
                    }, false);

                    if (operation.type == 'put') {
                        if (!operation.response) {
                            throw TypeError("Put operation must have a response");
                        }
                        var requestURL = new _URL(request.url);
                        if ((requestURL.protocol !== 'http:') && (requestURL.protocol !== 'https:')) {
                            throw TypeError("Only http and https schemes are supported");
                        }
                        if (request.method !== 'GET') {
                            throw TypeError("Only GET requests are supported");
                        }
                        if (operation.options) {
                            throw TypeError("Put operation cannot have match options");
                        }
                        if (!(operation.response instanceof AbstractResponse)) {
                            throw TypeError("Invalid response");
                        }

                        addedRequests.push(request);
                        thisCache._items.set(request, operation.response);
                        result = operation.response;
                    }

                    return operation.response;
                });
            } catch (err) {
                // reverse the transaction
                thisCache._items = itemsCopy;
                throw err;
            }
        });
    };
    return Cache;
})();

var CacheStorage = (function () {
    function CacheStorage() {
    }
    CacheStorage.prototype.match = function (request, options) {
        var cacheName;

        if (options) {
            cacheName = options["cacheName"];
        }

        function getMatchFrom(cacheName) {
            return this.get(cacheName).then(function (store) {
                if (!store) {
                    throw Error("Not found");
                }
                return store.match(request, options);
            });
        }

        if (cacheName) {
            return getMatchFrom(cacheName);
        }

        return this.keys().then(function (keys) {
            return keys.reduce(function (chain, key) {
                return chain.catch(function () {
                    return getMatchFrom(key);
                });
            }, Promise.reject()).catch(function () {
                throw Error("No match found");
            });
        });
    };

    CacheStorage.prototype.has = function (cacheName) {
        cacheName = cacheName.toString();
        return Promise.resolve(this._items.has(cacheName));
    };

    CacheStorage.prototype.open = function (cacheName) {
        cacheName = cacheName.toString();

        var cache = this._items.get(cacheName);

        if (!cache) {
            cache = new Cache();
            this._items.set(cacheName, cache);
        }

        return Promise.resolve(cache);
    };

    CacheStorage.prototype.delete = function (cacheName) {
        cacheName = cacheName.toString();
        if (this._items.delete(cacheName)) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve(false);
        }
    };

    CacheStorage.prototype.keys = function () {
        return Promise.resolve(this._items.keys());
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
;

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
    Object.defineProperty(_URL.prototype, "protocol", {
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

    Promise.resolve = function (val) {
        return new Promise(function (r) {
            r.accept(val);
        });
    };

    Promise.reject = function (err) {
        return new Promise(function (r) {
            r.reject(err);
        });
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
