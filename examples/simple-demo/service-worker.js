var Log = function(msg) {
    if (self.lastPort)
        self.lastPort.postMessage({log: msg});
};

oninstall = function(e) {
    e.replace();
}

onfetch = function(e) {
    Log('Got a fetch event');
    var url = e.request.url;
    Log(url);
    if (url == new URL("/generated.txt", self.scope)) {
        return e.respondWith(new Response({
            statusCode: 200,
            headers: {
                ContentType: 'text/plain',
                'X-Service-Worker-Wont-Let-Me-Set-The-Body': 'It works!!!'
            }
        }));
    }
}

// onmessage= doesn't work yet.
self.addEventListener('message', function(e) {
    // e.source.postMessage doesn't work yet.
    var msg = e.data;
    self.lastPort = msg.port;
    if (msg.hasOwnProperty('chat')) {
        msg.port.postMessage({chat: 'Echo: ' + msg.chat});
    }
});

onerror = function(e) {
    if (self.lastPort) {
        self.lastPort.postMessage({error: e});
    }
}
