this.version = 1.0;
var cacheNames = {
  'static': 'static' + this.version,
  'core': 'core' + this.version
};

// Install process
this.oninstalled = function(event) {
  var staticCache = new Cache();
  var oldStaticCache;
  // TODO: how can we avoid downloading both PNGs?
  // https://github.com/slightlyoff/NavigationController/issues/60
  var staticUrls = [
    '//cdn.example.com/all-v1.css',
    '//cdn.example.com/all-v1.js',
    '//cdn.example.com/whatever-v1.png',
    '//cdn.example.com/whatever-large-v1.png',
    '//cdn.example.com/whatever-v1.woff'
  ];

  if (event.previousVersion) {
    oldStaticCache = caches.get('static' + event.previousVersion);
  }

  staticUrls.forEach(function(staticUrl) {
    // copy from previous cache, if it's there
    if (oldStaticCache && oldStaticCache.has(staticUrl)) {
      staticCache.set(staticUrl, oldStaticCache.get(staticUrl));
    }
    else {
      staticCache.add(staticUrl);
    }
  });

  caches.set(cacheNames['static'], staticCache);

  // core cache entried should be check on each controller update
  caches.set(cacheNames['core'], new Cache([
    '/index.html'
  ]));

  event.waitUntil(Promise.every(
    caches.values().map(function(x) { return x.ready(); })
  )).then(function() {
    // if no previous version, we may as well take over now
    if (!event.previousVersion) {
      event.replace();
    }
  });
};

this.onactivate = function(event) {
  var expectedCaches = Object.keys(cacheNames).map(function(key) {
    return cacheNames[key];
  });

  // remove caches that shouldn't be there
  caches.keys.filter(function(cacheName) {
    return expectedCaches.indexOf(cacheName) == -1;
  }).forEach(caches.delete.bind(caches));
};


// Request handling
this.addEventListener('fetch', function(event) {
  if (event.request.url.host == "cdn.example.com") {
    event.respondWith(caches.match(cacheNames['static'], event.request.url).catch(function() {
      return fetch(event.request);
    }));
  }
  else {
    event.respondWith(caches.match(cacheNames['core'], event.request.url).catch(function() {
      return fetch(event.request);
    }));
  }
});