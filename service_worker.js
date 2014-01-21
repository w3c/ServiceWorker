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


var ReloadPageEvent = (function (_super) {
    __extends(ReloadPageEvent, _super);
    function ReloadPageEvent() {
        _super.apply(this, arguments);
    }
    // Delay the page unload to serialise state to storage or get user's permission
    // to reload.
    ReloadPageEvent.prototype.waitUntil = function (f) {
    };
    return ReloadPageEvent;
})(_Event);

///////////////////////////////////////////////////////////////////////////////
// The Event Worker
///////////////////////////////////////////////////////////////////////////////
var InstallPhaseEvent = (function (_super) {
    __extends(InstallPhaseEvent, _super);
    function InstallPhaseEvent() {
        _super.apply(this, arguments);
        this.previousVersion = 0;
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
        this.previous = null;
    }
    // Ensures that the worker is used in place of existing workers for
    // the currently controlled set of window instances.
    // TODO: how does this interact with waitUntil? Does it automatically wait?
    InstallEvent.prototype.replace = function () {
    };

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
    InstallEvent.prototype.reloadAll = function () {
        return new Promise(function () {
        });
    };
    return InstallEvent;
})(InstallPhaseEvent);


// The scope in which worker code is executed
var ServiceWorkerGlobalScope = (function (_super) {
    __extends(ServiceWorkerGlobalScope, _super);
    function ServiceWorkerGlobalScope() {
        _super.apply(this, arguments);
        // Set by the worker and used to communicate to newer versions what they
        // are replaceing (see InstallEvent::previousVersion)
        this.version = 0;
    }
    Object.defineProperty(ServiceWorkerGlobalScope.prototype, "windows", {
        // A list of window objects, identifiable by ID, that correspond to
        get: function () {
            return new WindowList();
        },
        enumerable: true,
        configurable: true
    });

    ServiceWorkerGlobalScope.prototype.fetch = function (request) {
        return new ResponsePromise(function (r) {
            r.resolve(_defaultToBrowserHTTP(request));
        });
    };

    ServiceWorkerGlobalScope.prototype.postMessage = function (message, ports) {
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
        // FIXME: we don't provide anything but async fetching...
        this.synchronous = false;
        this.redirectCount = 0;
        this.forcePreflight = false;
        this.omitCredentials = false;
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
    return Request;
})();

// http://fetch.spec.whatwg.org/#responses
var Response = (function () {
    function Response() {
    }
    return Response;
})();

var CrossOriginResponse = (function (_super) {
    __extends(CrossOriginResponse, _super);
    function CrossOriginResponse() {
        _super.apply(this, arguments);
    }
    return CrossOriginResponse;
})(Response);

var SameOriginResponse = (function (_super) {
    __extends(SameOriginResponse, _super);
    function SameOriginResponse(params) {
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
        _super.call(this);
    }
    Object.defineProperty(SameOriginResponse.prototype, "headers", {
        get: function () {
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
    return SameOriginResponse;
})(Response);

var ResponsePromise = (function (_super) {
    __extends(ResponsePromise, _super);
    function ResponsePromise() {
        _super.apply(this, arguments);
    }
    return ResponsePromise;
})(Promise);
var RequestPromise = (function (_super) {
    __extends(RequestPromise, _super);
    function RequestPromise() {
        _super.apply(this, arguments);
    }
    return RequestPromise;
})(Promise);

var FetchEvent = (function (_super) {
    __extends(FetchEvent, _super);
    function FetchEvent() {
        _super.call(this, "fetch", { cancelable: true, bubbles: false });
        // Can be one of:
        //  "navigate"
        //  "fetch"
        this.type = "navigate";
        // Does the request correspond to navigation of the top-level window, e.g.
        // reloading a tab or typing a URL into the URL bar?
        this.isTopLevel = false;
        // Does the navigation or fetch come from a document that has been "soft
        // reloaded"? That is to say, the reload button in the URL bar or the
        // back/forward buttons in browser chrome? If true, some apps may choose not
        // to work so hard to get "fresh" content to display.
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
        this.window = null; // to allow postMessage, window.topLevel, etc
    }
    // Promise must resolve with a Response. A Network Error is thrown for other
    // resolution types/values.
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
            resolver.resolve(new SameOriginResponse({
                statusCode: 302,
                headers: { "Location": url.toString() }
            }));
        });
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
    // "any" to make the TS compiler happy:
    function Cache() {
        var urls = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            urls[_i] = arguments[_i + 0];
        }
        // Note that items may ONLY contain Response instasnces
        if (urls.length) {
            // Begin fetching on the URLs and storing them in this.items
        }
    }
    // "any" to make the TS compiler happy:
    Cache.prototype.match = function (name) {
        // name matches something in items
        if (name) {
            return this.items.get(name.toString());
        }
    };

    // "any" to make the TS compiler happy:
    Cache.prototype.add = function () {
        var response = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            response[_i] = arguments[_i + 0];
        }
        // If a URL (or URL string) is passed, a new CachedResponse is added to
        // items upon successful fetching
        return accepted();
    };

    // Needed because Response objects don't have URLs.
    Cache.prototype.addResponse = function (url, response) {
        return accepted();
    };

    // "any" to make the TS compiler happy:
    Cache.prototype.remove = function () {
        var response = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            response[_i] = arguments[_i + 0];
        }
        // FIXME: does this need to be async?
        return accepted();
    };

    Cache.prototype.update = function () {
        var urls = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            urls[_i] = arguments[_i + 0];
        }
        return accepted();
    };

    Cache.prototype.ready = function () {
        return accepted();
    };
    return Cache;
})();

var CacheList = (function () {
    function CacheList(iterable) {
    }
    // "any" to make the TS compiler happy
    CacheList.prototype.match = function (cacheName, url) {
        return new ResponsePromise(function () {
        });
    };

    CacheList.prototype.get = function (key) {
        return accepted();
    };
    CacheList.prototype.has = function (key) {
        return accepted();
    };
    CacheList.prototype.set = function (key, val) {
        return accepted(this);
    };
    CacheList.prototype.clear = function () {
        return accepted();
    };
    CacheList.prototype.delete = function (key) {
        return true;
    };
    CacheList.prototype.forEach = function (callback, thisArg) {
    };
    CacheList.prototype.items = function () {
        return [];
    };
    CacheList.prototype.keys = function () {
        return [];
    };
    CacheList.prototype.values = function () {
        return [];
    };
    Object.defineProperty(CacheList.prototype, "size", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return CacheList;
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
    function _URL(url, base) {
    }
    return _URL;
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
    return Promise;
})();

function accepted(v) {
    if (typeof v === "undefined") { v = true; }
    return new Promise(function (r) {
        r.accept(true);
    });
}

function acceptedResponse() {
    return new ResponsePromise(function (r) {
        r.accept(new Response());
    });
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
var WindowList = (function () {
    function WindowList() {
    }
    return WindowList;
})();

var _useWorkerResponse = function () {
    return accepted();
};
var _defaultToBrowserHTTP = function (url) {
    return accepted();
};
