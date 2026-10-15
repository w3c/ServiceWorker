CR Plan for V1
---

At TPAC 2017, Service Workers WG [decided](https://www.w3.org/2017/11/07-serviceworker-minutes.html#item19) to move [Service Workers V1](https://w3c.github.io/ServiceWorker/v1) to CR with the reasons that we have three implementations (+ an ongoing work) and good WPT coverage for the interop.

We use this document to:
- Check WPT coverage.
- Check if more than two browsers implemented the features.
- Track the issues that should be resolved for this version.
- Remove the features that are not ready for this version.

Test environments
---
- Chromium: Chrome 61
- Gecko: Firefox 58
- EdgeHTML: Edge 40

Feature and Test|Chromium|Gecko|EdgeHTML|WebKit
-- | ------ | --- | ------ | -----
**ServiceWorker.scriptURL**
/service-workers/service-worker/serviceworkerobject-scripturl.https.html | | | | 
/service-workers/service-worker/registration-script-url.https.html | | | | 
**ServiceWorker.state**
/service-workers/service-worker/state.https.html | | | | 
**ServiceWorker.postMessage(message, transfer)**
/service-workers/service-worker/postmessage.https.html | | | | 
**ServiceWorker.onstatechange**
/service-workers/service-worker/state.https.html | | | | 
**ServiceWorkerRegistration.installing**
/service-workers/service-worker/registration-service-worker-attributes.https.html | | | | 
**ServiceWorkerRegistration.waiting**
/service-workers/service-worker/registration-service-worker-attributes.https.html | | | | 
**ServiceWorkerRegistration.active**
/service-workers/service-worker/registration-service-worker-attributes.https.html | | | | 
**ServiceWorkerRegistration.scope**
/service-workers/service-worker/registration-scope.https.html | | | | 
**ServiceWorkerRegistration.updateViaCache**
/service-workers/service-worker/registration-updateviacache.https.html | | | | 
**ServiceWorkerRegistration.update()**
/service-workers/service-worker/update.https.html | | | | 
**ServiceWorkerRegistration.unregister()**
/service-workers/service-worker/unregister.https.html | | | | 
**ServiceWorkerRegistration.onupdatefound**
/service-workers/service-worker/ServiceWorkerGlobalScope/update.https.html | | | | 
**navigator.serviceWorker**
/service-workers/service-worker/interfaces-window.https.html | | | | 
/service-workers/service-worker/registration-end-to-end.https.html | | | | 
**ServiceWorkerContainer.controller**
/service-workers/service-worker/controller-on-disconnect.https.html | | | | 
/service-workers/service-worker/controller-on-load.https.html | | | | 
/service-workers/service-worker/controller-on-reload.https.html | | | | 
**ServiceWorkerContainer.ready**
/service-workers/service-worker/ready.https.html | | | | 
**ServiceWorkerContainer.register(scriptURL, options)**
/service-workers/service-worker/registration-basic.https.html | | | | 
/service-workers/service-worker/registration-scope.https.html | | | | 
/service-workers/service-worker/registration-script.https.html | | | | 
/service-workers/service-worker/registration-script-url.https.html | | | | 
**ServiceWorkerContainer.getRegistration(clientURL)**
/service-workers/service-worker/getregistration.https.html | | | | 
**ServiceWorkerContainer.getRegistrations()**
/service-workers/service-worker/getregistrations.https.html | | | | 
**ServiceWorkerContainer.startMessages()**
No test yet | | | | 
**ServiceWorkerContainer.oncontrollerchange**
/service-workers/service-worker/skip-waiting-using-registration.https.html | | | | 
**ServiceWorkerContainer.onmessage**
/service-workers/service-worker/postmessage-to-client.https.html | | | | 
**ServiceWorkerContainer.onmessageerror**
No test yet | | | | 
**statechange event**
Test | | | | 
**updatefound event**
Test | | | | 
**controllerchange event**
Test | | | | 
**ServiceWorkerGlobalScope**
/service-workers/service-worker/interfaces-sw.https.html | | | | 
**ServiceWorkerGlobalScope.clients**
/service-workers/service-worker/interfaces-sw.https.html | | | | 
**ServiceWorkerGlobalScope.registration**
/service-workers/service-worker/ServiceWorkerGlobalScope/registration-attribute.https.html | | | | 
**ServiceWorkerGlobalScope.skipWaiting()**
/service-workers/service-worker/skip-waiting.https.html | | | | 
**ServiceWorkerGlobalScope.oninstall**
/service-workers/service-worker/install-event-type.https.html | | | | 
**ServiceWorkerGlobalScope.onactivate**
/service-workers/service-worker/registration-events.https.html | | | | 
/service-workers/service-worker/ServiceWorkerGlobalScope/registration-attribute.https.html | | | | 
**ServiceWorkerGlobalScope.onfetch**
Test | | | | 
**ServiceWorkerGlobalScope.onmessage**
/service-workers/service-worker/postmessage.https.html | | | | 
**ServiceWorkerGlobalScope.onmessageerror**
No test yet | | | | 
**Client.url**
/service-workers/service-worker/clients-get.https.html | | | | 
**Client.id**
/service-workers/service-worker/client-id.https.html | | | | 
**Client.type**
/service-workers/service-worker/clients-get.https.html | | | | 
**Client.reserved**
Should be removed | | | | 
**Client.postMessage(message, transfer)**
 Test | | | | 
**WindowClient.visibilityState**
/service-workers/service-worker/clients-get.https.html | | | | 
**WindowClient.focused**
/service-workers/service-worker/clients-get.https.html | | | | 
**WindowClient.ancestorOrigins**
No test yet | | | | 
**WindowClient.focus()**
No test yet | | | | 
**WindowClient.navigate(url)**
/service-workers/service-worker/client-navigate.https.html | | | | 
**Clients.get(id)**
/service-workers/service-worker/clients-get.https.html | | | | 
/service-workers/service-worker/clients-get-client-types.https.html | | | | 
/service-workers/service-worker/clients-get-cross-origin.https.html | | | | 
**Clients.matchAll(options)**
/service-workers/service-worker/clients-matchall.https.html | | | | 
/service-workers/service-worker/clients-matchall-client-types.https.html | | | | 
/service-workers/service-worker/clients-matchall-exact-controller.https.html | | | | 
/service-workers/service-worker/clients-matchall-include-uncontrolled.https.html | | | | 
/service-workers/service-worker/clients-matchall-on-evaluation.https.html | | | | 
/service-workers/service-worker/clients-matchall-order.https.html | | | | 
**Clients.openWindow(url)**
No test yet | | | | 
**Clients.claim()**
/service-workers/service-worker/claim-using-registration.https.html | | | | 
/service-workers/service-worker/claim-not-using-registration.https.html | | | | 
/service-workers/service-worker/claim-affect-other-registration.https.html | | | |
/service-workers/service-worker/claim-fetch.https.html | | | | 
/service-workers/service-worker/claim-with-redirect.https.html | | | | 
/service-workers/service-worker/claim-worker-fetch.https.html | | | | 
**ExtendableEvent.waitUntil(f)**
/service-workers/service-worker/extendable-event-waituntil.https.html | | | | 
/service-workers/service-worker/extendable-event-async-waituntil.https.html | | | | 
**FetchEvent.request**
Test | | | | 
**FetchEvent.clientId**
/service-workers/service-worker/clients-get.https.html | | | | 
**FetchEvent.reservedClientId**
Should be removed | | | | 
**FetchEvent.targetClientId**
Should be removed | | | | 
**FetchEvent.respondWith(r)**
/service-workers/service-worker/fetch-event-async-respond-with.https.html | | | | 
/service-workers/service-worker/fetch-event-respond-with-argument.https.html | | | | 
/service-workers/service-worker/fetch-event-respond-with-partial-stream.https.html | | | | 
/service-workers/service-worker/fetch-event-respond-with-readable-stream.https.html | | | | 
/service-workers/service-worker/fetch-event-respond-with-response-body-with-invalid-chunk.https.html | | | | 
/service-workers/service-worker/fetch-event-respond-with-stops-propagation.https.html | | | | 
**ExtendableMessageEvent.data**
/service-workers/service-worker/ServiceWorkerGlobalScope/extendable-message-event.https.html | | | | 
**ExtendableMessageEvent.origin**
/service-workers/service-worker/ServiceWorkerGlobalScope/extendable-message-event.https.html | | | | 
**ExtendableMessageEvent.lastEventId**
/service-workers/service-worker/ServiceWorkerGlobalScope/extendable-message-event.https.html | | | | 
**ExtendableMessageEvent.source**
/service-workers/service-worker/ServiceWorkerGlobalScope/extendable-message-event.https.html | | | | 
**ExtendableMessageEvent.ports**
/service-workers/service-worker/ServiceWorkerGlobalScope/extendable-message-event.https.html | | | | 
**Events**
Test | | | | 
**self.caches**
/service-workers/service-worker/interfaces-sw.https.html | | | | 
**Cache.match(request, options)**
/service-workers/cache-storage/serviceworker/cache-match.https.html | | | | 
/service-workers/cache-storage/window/cache-match.https.html | | | | 
/service-workers/cache-storage/worker/cache-match.https.html | | | | 
**Cache.matchAll(request, options)**
/service-workers/cache-storage/serviceworker/cache-matchAll.https.html | | | | 
/service-workers/cache-storage/window/cache-matchAll.https.html | | | | 
/service-workers/cache-storage/worker/cache-matchAll.https.html | | | | 
**Cache.add(request)**
/service-workers/cache-storage/serviceworker/cache-add.https.html | | | | 
/service-workers/cache-storage/window/cache-add.https.html | | | | 
/service-workers/cache-storage/worker/cache-add.https.html | | | | 
**Cache.addAll(requests)**
/service-workers/cache-storage/serviceworker/cache-add.https.html | | | | 
/service-workers/cache-storage/window/cache-add.https.html | | | | 
/service-workers/cache-storage/worker/cache-add.https.html | | | | 
**Cache.put(request, response)**
/service-workers/cache-storage/serviceworker/cache-put.https.html | | | | 
/service-workers/cache-storage/window/cache-put.https.html | | | | 
/service-workers/cache-storage/worker/cache-put.https.html | | | | 
**Cache.delete(request, options)**
/service-workers/cache-storage/serviceworker/cache-delete.https.html | | | | 
/service-workers/cache-storage/window/cache-delete.https.html | | | | 
/service-workers/cache-storage/worker/cache-delete.https.html | | | | 
**Cache.keys(request, options)**
/service-workers/cache-storage/serviceworker/cache-keys.https.html | | | | 
/service-workers/cache-storage/window/cache-keys.https.html | | | | 
/service-workers/cache-storage/worker/cache-keys.https.html | | | | 
**CacheStorage.match(request, options)**
/service-workers/cache-storage/serviceworker/cache-storage-match.https.html | | | | 
/service-workers/cache-storage/window/cache-storage-match.https.html | | | | 
/service-workers/cache-storage/worker/cache-storage-match.https.html | | | | 
**CacheStorage.has(cacheName)**
/service-workers/cache-storage/serviceworker/cache-storage.https.html | | | | 
/service-workers/cache-storage/window/cache-storage.https.html | | | | 
/service-workers/cache-storage/worker/cache-storage.https.html | | | | 
**CacheStorage.open(cacheName)**
/service-workers/cache-storage/serviceworker/cache-storage.https.html | | | | 
/service-workers/cache-storage/window/cache-storage.https.html | | | | 
/service-workers/cache-storage/worker/cache-storage.https.html | | | | 
**CacheStorage.delete(cacheName)**
/service-workers/cache-storage/serviceworker/cache-storage.https.html | | | | 
/service-workers/cache-storage/window/cache-storage.https.html | | | | 
/service-workers/cache-storage/worker/cache-storage.https.html | | | | 
**CacheStorage.keys()**
/service-workers/cache-storage/serviceworker/cache-storage-keys.https.html | | | | 
/service-workers/cache-storage/window/cache-storage-keys.https.html | | | | 
/service-workers/cache-storage/worker/cache-storage-keys.https.html | | | | 
**importScripts(urls)**
Test | | | | 
**Install algorithm**
/service-workers/service-worker/activate-event-after-install-state-change.https.html | | | | 
/service-workers/service-worker/activation-after-registration.https.html | | | | 
**Activate algorithm**
/service-workers/service-worker/active.https.html | | | | 
/service-workers/service-worker/appcache-ordering-main.https.html | | | | 
**Handle Fetch algorithm**
/service-workers/service-worker/claim-shared-worker-fetch.https.html | | | | 
/service-workers/service-worker/fetch-event-after-navigation-within-page.https.html | | | | 
/service-workers/service-worker/fetch-event-network-error.https.html | | | | 
/service-workers/service-worker/fetch-event-throws-after-respond-with.https.html | | | | 
/service-workers/service-worker/fetch-event-within-sw.https.html | | | | 
/service-workers/service-worker/fetch-event.https.html | | | | 
**Accessing JS objects from detached frame**
/service-workers/service-worker/detached-context.https.html | | | |
**Fetch**
/service-workers/service-worker/fetch-canvas-tainting-cache.https.html | | | | 
/service-workers/service-worker/fetch-canvas-tainting.https.html | | | | 
/service-workers/service-worker/fetch-csp.https.html | | | | 
/service-workers/service-worker/fetch-cors-xhr.https.html | | | | 
/service-workers/service-worker/fetch-event-redirect.https.html | | | | 
/service-workers/service-worker/fetch-event-referrer-policy.https.html | | | | 
**HTML**
/service-workers/service-worker/fetch-event-within-sw-manual.https.html | | | | 