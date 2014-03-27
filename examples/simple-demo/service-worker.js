console.log('Not dead yet!');

oninstall = function(e) {
	e.replace();
}

var origin = new URL(location.origin);

onfetch = function(e) {
	var url = e.request.url;
	console.log(url);
	if (url == new URL("/generated.txt", origin)) {
		return e.respondWith(new Response({
			statusCode: 200, 
			headers: {
				ContentType: 'text/plain',
				'X-Service-Worker-Wont-Let-Me-Set-The-Body': 'It works!!!'
			}
		}));
	}
}

onmessage = function(e) {
	var source = e.source;
	e.source.postMessage({chat: 'Received a message'});
	var msg = e.data;
	if (msg.hasOwnProperty('chat')) {
		source.postMessage({chat: 'Echo: ' + msg.chat});
	}
}
