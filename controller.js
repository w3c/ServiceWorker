var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
var UpgradeEvent = (function (_super) {
    __extends(UpgradeEvent, _super);
    function UpgradeEvent() {
        _super.apply(this, arguments);

    }
    return UpgradeEvent;
})(_Event);
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
    Map.prototype.delete = function (key) {
        return true;
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
var Future = (function () {
    function Future(init) {
    }
    return Future;
})();
var WindowList = (function () {
    function WindowList() { }
    return WindowList;
})();
var SharedWorker = (function (_super) {
    __extends(SharedWorker, _super);
    function SharedWorker(url, name) {
        _super.call(this);
    }
    return SharedWorker;
})(_EventTarget);
navigator.controller = {
    register: function (scope, url) {
        return new Future(function (r) {
        });
    },
    ready: function () {
        return new Future(function (r) {
        });
    }
};
var ControllerScope = (function (_super) {
    __extends(ControllerScope, _super);
    function ControllerScope(url, upgrading) {
        this.onLine = true;
        _super.call(this, url);
        if(upgrading) {
            this.dispatchEvent(new _CustomEvent("update"));
        }
    }
    return ControllerScope;
})(SharedWorker);
var Request = (function () {
    function Request() { }
    return Request;
})();
var Response = (function () {
    function Response() { }
    return Response;
})();
var CachedResponse = (function (_super) {
    __extends(CachedResponse, _super);
    function CachedResponse() {
        _super.apply(this, arguments);

    }
    return CachedResponse;
})(Response);
var RequestEvent = (function (_super) {
    __extends(RequestEvent, _super);
    function RequestEvent() {
        _super.call(this, "request", {
    cancelable: true,
    bubbles: false
});
        this.type = "navigate";
        this.window = null;
    }
    RequestEvent.prototype.respondWith = function (r) {
    };
    RequestEvent.prototype.redirectTo = function (url) {
    };
    return RequestEvent;
})(_Event);
var Cache = (function (_super) {
    __extends(Cache, _super);
    function Cache() {
        var urls = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            urls[_i] = arguments[_i + 0];
        }
        if(urls.length) {
        }
        _super.call(this);
    }
    Cache.prototype.match = function (urlOrString) {
        if(urlOrString) {
            return this.items[urlOrString];
        }
    };
    Cache.prototype.add = function (urlOrStringOrResponse) {
        return new Future(function (r) {
        });
    };
    Cache.prototype.remove = function (urlOrStringOrResponse) {
        return new Future(function (r) {
        });
    };
    Cache.prototype.swapCache = function () {
        return new Future(function (r) {
        });
    };
    Cache.prototype.update = function () {
        return new Future(function (r) {
        });
    };
    return Cache;
})(_EventTarget);
var CacheList = (function (_super) {
    __extends(CacheList, _super);
    function CacheList(iterable) {
        _super.call(this);
    }
    return CacheList;
})(Map);
