this.version = 1.0;
var cacheNames = {
  'static': 'static' + this.version,
  'core': 'core' + this.version
};

// Install process
this.oninstalled = function(event) {
  caches.set(cacheNames['static'], new Cache(
    '//cdn.example.com/all-v1.css',
    '//cdn.example.com/all-v1.js',
    // TODO: how can we avoid downloading both PNGs?
    // https://github.com/slightlyoff/NavigationController/issues/60
    '//cdn.example.com/whatever-v1.png',
    '//cdn.example.com/whatever-large-v1.png',
    '//cdn.example.com/whatever-v1.woff'
  ));

  // core cache entried should be check on each controller update
  caches.set(cacheNames['core'], new Cache([
    '/'
  ]));

  event.waitUntil(Promise.all(
    caches.values().map(function(x) { return x.ready(); })
  )).then(function() {
    if (event.previousVersion) {
      event.reloadAll();
    }
    else {
      // if no previous version, we may as well take over now
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