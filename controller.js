var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
var Future = (function () {
    function Future(init) {
    }
    return Future;
})();
function accepted() {
    return new Future(function (r) {
        r.accept(true);
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
navigator.controller = {
    register: function (scope, url) {
        return accepted();
    },
    ready: function () {
        return accepted();
    }
};
var InstalledEvent = (function (_super) {
    __extends(InstalledEvent, _super);
    function InstalledEvent() {
        _super.apply(this, arguments);

        this.previousVersion = "";
    }
    InstalledEvent.prototype.replace = function () {
    };
    InstalledEvent.prototype.waitUntil = function (f) {
        return accepted();
    };
    return InstalledEvent;
})(_Event);
var ReplacedEvent = (function (_super) {
    __extends(ReplacedEvent, _super);
    function ReplacedEvent() {
        _super.apply(this, arguments);

    }
    return ReplacedEvent;
})(_Event);
var ControllerScope = (function (_super) {
    __extends(ControllerScope, _super);
    function ControllerScope(url, upgrading) {
        _super.call(this, url);
        this.version = "";
        if(upgrading) {
            this.dispatchEvent(new _CustomEvent("update"));
        }
    }
    Object.defineProperty(ControllerScope.prototype, "windows", {
        get: function () {
            return new WindowList();
        },
        enumerable: true,
        configurable: true
    });
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
var XDomainResponse = (function (_super) {
    __extends(XDomainResponse, _super);
    function XDomainResponse() {
        _super.apply(this, arguments);

        this.body = null;
        this.headers = null;
        this.cookies = null;
    }
    return XDomainResponse;
})(Response);
var ResponseFuture = (function (_super) {
    __extends(ResponseFuture, _super);
    function ResponseFuture() {
        _super.apply(this, arguments);

    }
    return ResponseFuture;
})(Future);
var RequestEvent = (function (_super) {
    __extends(RequestEvent, _super);
    function RequestEvent() {
        _super.call(this, "request", {
    cancelable: true,
    bubbles: false
});
        this.type = "navigate";
        this.isTopLevel = false;
        this.window = null;
    }
    RequestEvent.prototype.respondWith = function (r) {
        return accepted();
    };
    RequestEvent.prototype.forwardTo = function (url) {
        return accepted();
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
    Cache.prototype.match = function (name) {
        if(name) {
            return this.items[name.toString()];
        }
    };
    Cache.prototype.add = function (response) {
        return new Future(function (r) {
        });
    };
    Cache.prototype.remove = function (response) {
        return new Future(function (r) {
        });
    };
    Cache.prototype.update = function () {
        var urls = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            urls[_i] = arguments[_i + 0];
        }
        return new Future(function (r) {
        });
    };
    Cache.prototype.swapCache = function () {
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
