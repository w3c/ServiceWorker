var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
navigator.controller = {
    register: function (scope, url) {
        return accepted();
    },
    unregister: function (scope) {
        return accepted();
    },
    ready: function () {
        return accepted();
    }
};
var InstallPhaseEvent = (function (_super) {
    __extends(InstallPhaseEvent, _super);
    function InstallPhaseEvent() {
        _super.apply(this, arguments);

        this.previousVersion = 0;
    }
    InstallPhaseEvent.prototype.waitUntil = function (f) {
        return accepted();
    };
    return InstallPhaseEvent;
})(_Event);
var InstalledEvent = (function (_super) {
    __extends(InstalledEvent, _super);
    function InstalledEvent() {
        _super.apply(this, arguments);

        this.previous = null;
    }
    InstalledEvent.prototype.replace = function () {
    };
    return InstalledEvent;
})(InstallPhaseEvent);
var ReplacedEvent = (function (_super) {
    __extends(ReplacedEvent, _super);
    function ReplacedEvent() {
        _super.apply(this, arguments);

    }
    return ReplacedEvent;
})(_Event);
var ControllerScope = (function (_super) {
    __extends(ControllerScope, _super);
    function ControllerScope() {
        _super.apply(this, arguments);

        this.version = 0;
    }
    Object.defineProperty(ControllerScope.prototype, "windows", {
        get: function () {
            return new WindowList();
        },
        enumerable: true,
        configurable: true
    });
    ControllerScope.prototype.networkFetch = function (request) {
        return new Promise(function (r) {
            r.resolve(_defaultToBrowserHTTP(request));
        });
    };
    return ControllerScope;
})(SharedWorker);
var Request = (function () {
    function Request(params) {
        this.timeout = 0;
        this.method = "GET";
        this.synchronous = false;
        this.redirectCount = 0;
        this.forcePreflight = false;
        this.omitCredentials = false;
        if(params) {
            if(typeof params.timeout != "undefined") {
                this.timeout = params.timeout;
            }
            if(typeof params.url != "undefined") {
                this.url = params.url;
            }
            if(typeof params.synchronous != "undefined") {
                this.synchronous = params.synchronous;
            }
            if(typeof params.encoding != "undefined") {
                this.encoding = params.encoding;
            }
            if(typeof params.forcePreflight != "undefined") {
                this.forcePreflight = params.forcePreflight;
            }
            if(typeof params.omitCredentials != "undefined") {
                this.omitCredentials = params.omitCredentials;
            }
            if(typeof params.method != "undefined") {
                this.method = params.method;
            }
            if(typeof params.headers != "undefined") {
                this.headers = params.headers;
            }
            if(typeof params.body != "undefined") {
                this.body = params.body;
            }
        }
    }
    return Request;
})();
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
        if(params) {
            if(typeof params.statusCode != "undefined") {
                this.statusCode = params.statusCode;
            }
            if(typeof params.stausText != "undefined") {
                this.statusText = params.statusText;
            }
            if(typeof params.encoding != "undefined") {
                this.encoding = params.encoding;
            }
            if(typeof params.method != "undefined") {
                this.method = params.method;
            }
            if(typeof params.headers != "undefined") {
                this.headers = params.headers;
            }
            if(typeof params.body != "undefined") {
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
            if(items instanceof Map) {
                items.forEach(function (value, key, map) {
                    return _this._headers.set(key, value);
                });
            } else {
                for(var x in items) {
                    (function (x) {
                        if(items.hasOwnProperty(x)) {
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
        _super.call(this, "fetch", {
    cancelable: true,
    bubbles: false
});
        this.type = "navigate";
        this.isTopLevel = false;
        this.window = null;
    }
    FetchEvent.prototype.respondWith = function (r) {
        if(!(r instanceof Response) || !(r instanceof Promise)) {
            throw new Error("Faux NetworkError because DOM is currently b0rken");
        }
        this.stopImmediatePropagation();
        if(r instanceof Response) {
            r = new Promise(function (resolver) {
                resolver.resolve(r);
            });
        }
        r.done(_useControllerResponse, _defaultToBrowserHTTP);
    };
    FetchEvent.prototype.forwardTo = function (url) {
        if(!(url instanceof _URL) || typeof url != "string") {
            throw new Error("Faux NetworkError because DOM is currently b0rken");
        }
        this.stopImmediatePropagation();
        return new Promise(function (resolver) {
            resolver.resolve(new SameOriginResponse({
                statusCode: 302,
                headers: {
                    "Location": url.toString()
                }
            }));
        });
    };
    return FetchEvent;
})(_Event);
var Cache = (function () {
    function Cache() {
        var urls = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            urls[_i] = arguments[_i + 0];
        }
        if(urls.length) {
        }
    }
    Cache.prototype.match = function (name) {
        if(name) {
            return this.items.get(name.toString());
        }
    };
    Cache.prototype.add = function () {
        var response = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            response[_i] = arguments[_i + 0];
        }
        return accepted();
    };
    Cache.prototype.addResponse = function (url, response) {
        return accepted();
    };
    Cache.prototype.remove = function () {
        var response = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            response[_i] = arguments[_i + 0];
        }
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
    Cache.prototype.swapCache = function () {
        return accepted();
    };
    return Cache;
})();
var CacheList = (function (_super) {
    __extends(CacheList, _super);
    function CacheList(iterable) {
        _super.call(this);
    }
    CacheList.prototype.match = function (cacheName, url) {
        return new RequestPromise(function () {
        });
    };
    return CacheList;
})(Map);
var ReadOnlyCacheList = (function () {
    function ReadOnlyCacheList(iterable) {
    }
    ReadOnlyCacheList.prototype.get = function (key) {
        return accepted();
    };
    ReadOnlyCacheList.prototype.has = function (key) {
        return accepted();
    };
    ReadOnlyCacheList.prototype.forEach = function (callback, thisArg) {
    };
    ReadOnlyCacheList.prototype.items = function () {
        return accepted();
    };
    ReadOnlyCacheList.prototype.keys = function () {
        return accepted();
    };
    ReadOnlyCacheList.prototype.values = function () {
        return accepted();
    };
    ReadOnlyCacheList.prototype.match = function (cacheName, url) {
        return new RequestPromise(function () {
        });
    };
    return ReadOnlyCacheList;
})();
var _URL = (function () {
    function _URL(url, base) {
    }
    return _URL;
})();
var Map = (function () {
    function Map(iterable) {
    }
    Map.prototype.get = function (key) {
    };
    Map.prototype.has = function (key) {
        return true;
    };
    Map.prototype.set = function (key, val) {
    };
    Map.prototype.clear = function () {
    };
    Map.prototype.delete = function (key) {
        return true;
    };
    Map.prototype.forEach = function (callback, thisArg) {
    };
    Map.prototype.items = function () {
        return [];
    };
    Map.prototype.keys = function () {
        return [];
    };
    Map.prototype.values = function () {
        return [];
    };
    return Map;
})();
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
    function _CustomEvent(type, eventInitDict) {
        _super.call(this, type, eventInitDict);
    }
    return _CustomEvent;
})(_Event);
var _EventTarget = (function () {
    function _EventTarget() { }
    _EventTarget.prototype.dispatchEvent = function (e) {
        return true;
    };
    return _EventTarget;
})();
var Resolver = (function () {
    function Resolver() { }
    Resolver.prototype.accept = function (v) {
    };
    Resolver.prototype.reject = function (v) {
    };
    Resolver.prototype.resolve = function (v) {
    };
    return Resolver;
})();
var Promise = (function () {
    function Promise(init) {
    }
    return Promise;
})();
function accepted() {
    return new Promise(function (r) {
        r.accept(true);
    });
}
function acceptedResponse() {
    return new ResponsePromise(function (r) {
        r.accept(new Response());
    });
}
var SharedWorker = (function (_super) {
    __extends(SharedWorker, _super);
    function SharedWorker(url, name) {
        _super.call(this);
    }
    return SharedWorker;
})(_EventTarget);
var WindowList = (function () {
    function WindowList() { }
    return WindowList;
})();
var AsyncMap = (function () {
    function AsyncMap(iterable) {
    }
    AsyncMap.prototype.get = function (key) {
        return accepted();
    };
    AsyncMap.prototype.has = function (key) {
        return accepted();
    };
    AsyncMap.prototype.set = function (key, val) {
        return accepted();
    };
    AsyncMap.prototype.clear = function () {
        return accepted();
    };
    AsyncMap.prototype.delete = function (key) {
        return accepted();
    };
    AsyncMap.prototype.forEach = function (callback, thisArg) {
    };
    AsyncMap.prototype.items = function () {
        return accepted();
    };
    AsyncMap.prototype.keys = function () {
        return accepted();
    };
    AsyncMap.prototype.values = function () {
        return accepted();
    };
    return AsyncMap;
})();
var _useControllerResponse = function () {
    return accepted();
};
var _defaultToBrowserHTTP = function (url) {
    return accepted();
};
