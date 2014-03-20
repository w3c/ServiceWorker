Service Workers Algorithms
===
> **NOTE:**
>
> - **Register** and **_Update** honor HTTP caching rule.
> - Underscored function and attribute are UA-internal properties.

--
**Register**(_script_, _scope_)

1. Let _promise_ be a newly-created Promise.
2. Return _promise_.
3. Run the following steps asynchronously.
  1. Let _scope_ be _scope_ resolved against the document url.
  2. Let _script_ be _script_ resolved against the document url.
  3. If the origin of _script_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    2. Abort these steps.
  4. If the origin of _scope_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    2. Abort these steps.
  5. Let _serviceWorkerRegistration_ be **_GetRegistration**(_scope_).
  6. If _serviceWorkerRegistration_ is not null and _script_ is equal to _serviceWorkerRegistration_.*scriptUrl*, then
    1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
      1. Resolve promise with _serviceWorkerRegistration_.*updatePromise*.
      2. Abort these steps.
    2. Else,
      1. Resolve _promise_ with **_GetNewestWorker**(_serviceWorkerRegistration_).
      2. Abort these steps.
  7. If _serviceWorkerRegistration_ is null, then
    1. Let _serviceWorkerRegistration_ be a newly-created *_ServiceWorkerRegistration* object.
    2. Set _serviceWorkerRegistration_ to the value of key _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
    3. Set _serviceWorkerRegistration_.*scope* to _scope_.
  8. Set _serviceWorkerRegistration_.*scriptUrl* to _script_.
  9. Resolve _promise_ with **_Update**(_serviceWorkerRegistration_).

--
**_Update**(_serviceWorkerRegistration_)

1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Reject _serviceWorkerRegistration_.*updatePromise* with a new AbortError.
  2. The browser may abort in-flight requests, parsing or worker execution relating to _serviceWorkerRegistration_.*updatePromise*.
2. Let _promise_ be a newly-created Promise.
3. Set _serviceWorkerRegistration_.*updatePromise* to _promise_.
4. Return _promise_.
5. Run the following steps asynchronously.
  1. Perform a fetch of _serviceWorkerRegistration_.*scriptUrl*, forcing a network fetch if cached entry is greater than 1 day old.
  2. If _promise_ has been rejected (eg, another registration has aborted it), then
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    2. Abort these steps.
  3. If fetching the script fails due to the server returns a 4xx or 5xx response or equivalent, or there is a DNS error, or the connection times out, then
    1. Reject _promise_ with a new NetworkError.
    2. Set _serviceWorkerRegistration_.*updatePromise* to null.
    3. Abort these steps.
  4. If the server returned a redirect, then
    1. Reject _promise_ with a new SecurityError.
    2. Set _serviceWorkerRegistration_.*updatePromise* to null.
    3. Abort these steps.
  5. Let _fetchedScript_ be the fetched script.
  6. Let _newestWorker_ be **_GetNewestWorker**(_serviceWorkerRegistration_).
  7. If _newestWorker_ is not null, and _fetchedScript_ is a byte-for-byte match with the script of _newestWorker_, then
    1. Resolve _promise_ with _newestWorker_.
    2. Set _serviceWorkerRegistration_.*updatePromise* to null.
    3. Abort these steps.
  8. Else,
    1. Let _serviceWorker_ be a newly-created ServiceWorker object, using _fetchedScript_.
    2. If _promise_ has been rejected (e.g, another registration has aborted it), then
      1. Set _serviceWorkerRegistration_.*updatePromise* to null.
      2. Abort these steps.
    3. If _serviceWorker_ fails to start up, due to parse errors or uncaught errors, then
      1. Reject _promise_ with the error.
      2. Set _serviceWorkerRegistration_.*updatePromise* to null.
      3. Abort these steps.
    4. Resolve _promise_ with _serviceWorker_.
    5. Set _serviceWorkerRegistration_.*updatePromise* to null.
    6. Queue a task to call **_Install** with _serviceWorkerRegistration_ and _serviceWorker_.

--
**_SoftUpdate**(_serviceWorkerRegistration_)

> The browser may call this as often as it likes to check for updates

1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Abort these steps.
2. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Abort these steps.
3. Queue a task to call **_Update** with _serviceWorkerRegistration_.

--
**_Install**(_serviceWorkerRegistration_, _serviceWorker_)

1. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Terminate _serviceWorkerRegistration_.*pendingWorker*.
  2. The user agent may abort any in-flight requests triggered by _serviceWorkerRegistration_.*pendingWorker*.
2. Set _serviceWorkerRegistration_.*pendingWorker* to _serviceWorker_.
3. Set _serviceWorkerRegistration_.*pendingWorker*.*_state* to _installing_.
4. Fire _install_ event on the associated _ServiceWorkerGlobalScope_ object.
5. Fire _install_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
6. If any handler called _waitUntil()_, then
  1. Extend this process until the associated promises resolve.
  2. If the resulting promise rejects, then
    1. Abort these steps. TODO: we should retry at some point?
7. Set _serviceWorkerRegistration_.*pendingWorker*.*_state* to _installed_.
8. Fire _installend_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
9. If any handler called _replace()_, then
  1. For each document matching _serviceWorkerRegistration_.*scope*
    1. Set _serviceWorkerRegistration_ as the document's service worker registration.
  2. Call **_Activate** with _serviceWorkerRegistration_.
  3. Abort these steps.
10. If no document is using _serviceWorkerRegistration_ as their service worker registration, then
  1. Queue a task to call **_Activate** with _serviceWorkerRegistration_.

--
**_Activate**(_serviceWorkerRegistration_)

1. Let _activatingWorker_ be _serviceWorkerRegistration_.*pendingWorker*.
2. Let _exitingWorker_ be _serviceWorkerRegistration_.*activeWorker*.
3. Set _serviceWorkerRegistration_.*pendingWorker* to null.
4. Set _serviceWorkerRegistration_.*activeWorker* to _activatingWorker_.
5. Set _serviceWorkerRegistration_.*activeWorker*.*_state* to _activating_.
6. If _exitingWorker_ is not null, then
  1. Wait for _exitingWorker_ to finish handling any in-progress requests.
  2. Close and garbage collect _exitingWorker_.
7. Fire _activate_ event on the associated _ServiceWorkerGlobalScope_ object.
8. Fire _activate_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
9. If any handler calls _waitUntil()_, then
  1. Extend this process until the associated promises resolve.
  2. If the resulting promise rejects, then
    1. TODO: what now? We may have in-flight requests that we're blocking. We can't roll back. Maybe send all requests to the network?
    2. Abort these steps.
10. Set _serviceWorkerRegistration_.*activeWorker*.*_state* to _actived_.
11. Fire _activateend_ event on _navigator.serviceWorker_ for all documents which match _scope_.

--
**_OnNavigationRequest**(_request_)

1. If _request_ is a force-refresh (shift+refresh), then
  1. Fetch the resource normally and abort these steps.
2. Let _parsedUrl_ be the result of parsing _request.url_.
3. Let _serviceWorkerRegistration_ be **_ScopeMatch**(_parsedUrl_).
4. If _serviceWorkerRegistration_ is null, then
  1. Fetch the resource normally and abort these steps.
5. Let _matchedServiceWorker_ be _serviceWorkerRegistration_.*activeWorker*.
6. If _matchedServiceWorker_ is null, then
  1. Fetch the resource normally and abort these steps.
7. Document will now use _serviceWorkerRegistration_ as its service worker registration.
8. If _matchedServiceWorker_.*_state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*_state* to become _actived_.
9. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object with a new FetchEvent object.
10. If _respondWith_ was not called, then
  1. Fetch the resource normally.
  2. Queue a task to call **_SoftUpdate** with _serviceWorkerRegistration_.
  3. Abort these steps.
11. Let _responsePromise_ be value passed into _respondWith_ casted to a promise.
12. Wait for _responsePromise_ to resolve.
13. If _responsePromise_ rejected, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
14. If _responsePromise_ resolves to a OpaqueResponse, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
15. If _responsePromise_ resolves to an AbstractResponse, then
  1. Serve the response.
  2. Queue a task to call **_SoftUpdate** with _serviceWorkerRegistration_.
  3. Abort these steps.
16. Fail the resource load as if there had been a generic network error and abort these steps.

--
**_OnResourceRequest**(_request_)

1. Let _serviceWorkerRegistration_ be the registration used by this document.
2. If _serviceWorkerRegistration_ is null, then
  1. Fetch the resource normally and abort these steps.
3. Let _matchedServiceWorker_ be _serviceWorkerRegistration_.*activeWorker*.
4. If _matchedServiceWorker_ is null, then
  1. Fetch the resource normally and abort these steps.
5. If _matchedServiceWorker_.*_state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*_state* to become _actived_.
6. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object with a new FetchEvent object.
7. If _respondWith_ was not called, then
  1. Fetch the resource normally and abort these steps.
8. Let _responsePromise_ be value passed into _respondWith_ casted to a promise.
9. Wait for _responsePromise_ to resolve.
10. If _responsePromise_ rejected, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
11. If _responsePromise_ resolves to an AbstractResponse, then
  1. Serve the response and abort these steps.
12. Fail the resource load as if there had been a generic network error and abort these steps.

--
**_OnDocumentUnload**(_document_)

1. Let _serviceWorkerRegistration_ be the registration used by _document_.
2. If _serviceWorkerRegistration_ is null, then
  1. Abort these steps.
3. If any other document is using _serviceWorkerRegistration_ as their service worker registration, then
  1. Abort these steps.
4. If _serviceWorkerRegistration_.*pendingWorker* is not null
  1. Call **_Activate**(_serviceWorkerRegistration_).

--
**Unregister**(_scope_)

1. Let _promise_ be a newly-created _Promise_.
2. Return _promise_.
3. Run the following steps asynchronously.
  1. Let _scope_ be _scope_ resolved against the document url.
  2. If the origin of _scope_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    2. Abort these steps.
  3. Let _serviceWorkerRegistration_ be **_GetRegistration**(_scope_).
  4. If _serviceWorkerRegistration_ is null, then
    1. Reject _promise_ with a new NotFoundError.
    2. Abort these steps.
  5. For each document using _serviceWorkerRegistration_
    1. Set the document's service worker registration to null.
  6. Delete _scope_ from *_ScopeToServiceWorkerRegistrationMap*.
  7. Let _exitingWorker_ be _serviceWorkerRegistration_.*activeWorker*.
  8. Wait for _exitingWorker_ to finish handling any in-progress requests.
  9. Fire _deactivate_ event on _exitingWorker_ object.
  10. Resolve _promise_.

--
**_ScopeMatch**(_url_)

1. Let _matchingScope_ be the longest key in *_ScopeToServiceWorkerRegistrationMap* that glob-matches _url_.
2. Let _serviceWorkerRegistration_ be **_GetRegistration**(_matchingScope_).
3. Return _serviceWorkerRegistration_.

--
**_GetRegistration**(_scope_)

1. If there is no record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*, then return null.
2. Let _serviceWorkerRegistration_ be the record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
3. Return _serviceWorkerRegistration_.

--
**_GetNewestWorker**(_serviceWorkerRegistration_)

1. Let _newestWorker_ be null.
2. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*pendingWorker*.
3. Else if _serviceWorkerRegistration_.*activeWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*activeWorker*.
4. Return _newestWorker_.
