Service Workers Algorithms
===
> **NOTE:**
>
> - **Register** and **_Update** honor HTTP caching rule.
> - Underscored function and attribute are UA-internal properties.

--
**Register**(_scriptUrl_, _scope_)

1. Let _promise_ be a newly-created Promise.
1. Return _promise_.
1. Run the following steps asynchronously.
  1. Let _scope_ be _scope_ resolved against the document url.
  1. Let _scriptUrl_ be _scriptUrl_ resolved against the document url.
  1. If the protocol of the document's url is not https, then
    1. SHOULD reject _promise_ with a new SecurityError. Browsers may provide an option to ignore this rule, for development purposes only.
  1. If the origin of _scriptUrl_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    1. Abort these steps.
  1. If the origin of _scope_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    1. Abort these steps.
  1. Let _serviceWorkerRegistration_ be **_GetRegistration**(_scope_).
  1. If _serviceWorkerRegistration_ is not null and _scriptUrl_ is equal to _serviceWorkerRegistration_.*scriptUrl*, then
    1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
      1. Resolve promise with _serviceWorkerRegistration_.*updatePromise*.
      1. Abort these steps.
    1. Else,
      1. Resolve _promise_ with **_GetNewestWorker**(_serviceWorkerRegistration_).
      1. Abort these steps.
  1. If _serviceWorkerRegistration_ is null, then
    1. Let _serviceWorkerRegistration_ be a newly-created *_ServiceWorkerRegistration* object.
    1. Set _serviceWorkerRegistration_ to the value of key _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
    1. Set _serviceWorkerRegistration_.*scope* to _scope_.
  1. Set _serviceWorkerRegistration_.*scriptUrl* to _scriptUrl_.
  1. Resolve _promise_ with **_Update**(_serviceWorkerRegistration_).

--
**_Update**(_serviceWorkerRegistration_)

1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Reject _serviceWorkerRegistration_.*updatePromise* with a new AbortError.
  1. The browser may abort in-flight requests, parsing or worker execution relating to _serviceWorkerRegistration_.*updatePromise*.
1. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Terminate _serviceWorkerRegistration_.*pendingWorker*.
  1. Set _serviceWorkerRegistration_.*pendingWorker* to null
  1. The user agent may abort any in-flight requests triggered by _serviceWorkerRegistration_.*pendingWorker*.
1. Let _promise_ be a newly-created Promise.
1. Set _serviceWorkerRegistration_.*updatePromise* to _promise_.
1. Return _promise_.
1. Run the following steps asynchronously.
  1. Perform a fetch of _serviceWorkerRegistration_.*scriptUrl*, forcing a network fetch if cached entry is greater than 1 day old.
  1. If _promise_ has been rejected (eg, another registration has aborted it), then
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Abort these steps.
  1. If fetching the script fails due to the server returning a 4xx response, then
    1. Reject _promise_ with **_Unregister**(_serviceWorkerRegistration_.*scope*).
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Abort these steps.
  1. Else if fetching the script fails due to the server returning 5xx response, or there is a DNS error, or the connection times out, then
    1. Reject _promise_ with a new NetworkError.
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Abort these steps.
  1. Else if the server returned a redirect, then
    1. Reject _promise_ with a new SecurityError.
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Abort these steps.
  1. Let _fetchedScript_ be the fetched script.
  1. Let _activeWorker_ be _serviceWorkerRegistration_.*activeWorker*.
  1. If _activeWorker_ is not null, and _activeWorker_.*url* is equal to _serviceWorkerRegistration_.*scriptUrl* and _fetchedScript_ is a byte-for-byte match with the script of _activeWorker_, then
    1. Resolve _promise_ with _activeWorker_.
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Abort these steps.
  1. Else,
    1. Let _serviceWorker_ be a newly-created ServiceWorker object, using _fetchedScript_.
    1. If _promise_ has been rejected (e.g, another registration has aborted it), then
      1. Set _serviceWorkerRegistration_.*updatePromise* to null.
      1. Abort these steps.
    1. If _serviceWorker_ fails to start up, due to parse errors or uncaught errors, then
      1. Reject _promise_ with the error.
      1. Set _serviceWorkerRegistration_.*updatePromise* to null.
      1. Abort these steps.
    1. Resolve _promise_ with _serviceWorker_.
    1. Set _serviceWorkerRegistration_.*updatePromise* to null.
    1. Queue a task to call **_Install** with _serviceWorkerRegistration_ and _serviceWorker_.

--
**_SoftUpdate**(_serviceWorkerRegistration_)

> The browser may call this as often as it likes to check for updates

1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Abort these steps.
1. Queue a task to call **_Update** with _serviceWorkerRegistration_.

--
**_Install**(_serviceWorkerRegistration_, _serviceWorker_)

1. Set _serviceWorkerRegistration_.*pendingWorker* to _serviceWorker_.
1. Set _serviceWorkerRegistration_.*pendingWorker*.*_state* to _installing_.
1. Fire _install_ event on the associated _ServiceWorkerGlobalScope_ object.
1. Fire _install_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
1. If any handler called _waitUntil()_, then
  1. Extend this process until the associated promises resolve.
  1. If the resulting promise rejects, then
    1. Set _serviceWorkerRegistration_.*pendingWorker* to null
    1. Abort these steps. TODO: is this what we want?
1. Set _serviceWorkerRegistration_.*pendingWorker*.*_state* to _installed_.
1. Fire _installend_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
1. If any handler called _replace()_, then
  1. For each document matching _serviceWorkerRegistration_.*scope*
    1. Set _serviceWorkerRegistration_ as the document's service worker registration.
  1. Call **_Activate** with _serviceWorkerRegistration_.
  1. Abort these steps.
1. If no document is using _serviceWorkerRegistration_ as their service worker registration, then
  1. Queue a task to call **_Activate** with _serviceWorkerRegistration_.

--
**_Activate**(_serviceWorkerRegistration_)

1. Let _activatingWorker_ be _serviceWorkerRegistration_.*pendingWorker*.
1. Let _exitingWorker_ be _serviceWorkerRegistration_.*activeWorker*.
1. Set _serviceWorkerRegistration_.*pendingWorker* to null.
1. Set _serviceWorkerRegistration_.*activeWorker* to _activatingWorker_.
1. Set _serviceWorkerRegistration_.*activeWorker*.*_state* to _activating_.
1. If _exitingWorker_ is not null, then
  1. Wait for _exitingWorker_ to finish handling any in-progress requests.
  1. Close and garbage collect _exitingWorker_.
1. Fire _activate_ event on the associated _ServiceWorkerGlobalScope_ object.
1. Fire _activate_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
1. If any handler calls _waitUntil()_, then
  1. Extend this process until the associated promises resolve.
  1. If the resulting promise rejects, then
    1. Terminate _activatingWorker_
    1. Set _serviceWorkerRegistration_.*activeWorker* to null
    1. Allow any pending requests to continue as normal (as if there was no ServiceWorker)
    1. Abort these steps. TODO: is this what we want? Note that we've introduced another situation where .active can change through the life of a page
1. Set _serviceWorkerRegistration_.*activeWorker*.*_state* to _actived_.
1. Fire _activateend_ event on _navigator.serviceWorker_ for all documents which match _scope_.

--
**_OnNavigationRequest**(_request_)

1. If _request_ is a force-refresh (shift+refresh), then
  1. Fetch the resource normally and abort these steps.
1. Let _parsedUrl_ be the result of parsing _request.url_.
1. Let _serviceWorkerRegistration_ be **_ScopeMatch**(_parsedUrl_).
1. If _serviceWorkerRegistration_ is null, then
  1. Fetch the resource normally and abort these steps.
1. Let _matchedServiceWorker_ be _serviceWorkerRegistration_.*activeWorker*.
1. If _matchedServiceWorker_ is null, then
  1. Fetch the resource normally and abort these steps.
1. Document will now use _serviceWorkerRegistration_ as its service worker registration.
1. If _matchedServiceWorker_.*_state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*_state* to become _actived_.
1. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object with a new FetchEvent object.
1. If _respondWith_ was not called, then
  1. Fetch the resource normally.
  1. Queue a task to call **_SoftUpdate** with _serviceWorkerRegistration_.
  1. Abort these steps.
1. Let _responsePromise_ be value passed into _respondWith_ casted to a promise.
1. Wait for _responsePromise_ to resolve.
1. If _responsePromise_ rejected, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
1. If _responsePromise_ resolves to a OpaqueResponse, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
1. If _responsePromise_ resolves to an AbstractResponse, then
  1. Serve the response.
  1. Queue a task to call **_SoftUpdate** with _serviceWorkerRegistration_.
  1. Abort these steps.
1. Fail the resource load as if there had been a generic network error and abort these steps.

--
**_OnResourceRequest**(_request_)

1. Let _serviceWorkerRegistration_ be the registration used by this document.
1. If _serviceWorkerRegistration_ is null, then
  1. Fetch the resource normally and abort these steps.
1. Let _matchedServiceWorker_ be _serviceWorkerRegistration_.*activeWorker*.
1. If _matchedServiceWorker_ is null, then
  1. Fetch the resource normally and abort these steps.
1. If _matchedServiceWorker_.*_state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*_state* to become _actived_.
1. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object with a new FetchEvent object.
1. If _respondWith_ was not called, then
  1. Fetch the resource normally and abort these steps.
1. Let _responsePromise_ be value passed into _respondWith_ casted to a promise.
1. Wait for _responsePromise_ to resolve.
1. If _responsePromise_ rejected, then
  1. Fail the resource load as if there had been a generic network error and abort these steps.
1. If _responsePromise_ resolves to an AbstractResponse, then
  1. Serve the response and abort these steps.
1. Fail the resource load as if there had been a generic network error and abort these steps.

--
**_OnDocumentUnload**(_document_)

1. Let _serviceWorkerRegistration_ be the registration used by _document_.
1. If _serviceWorkerRegistration_ is null, then
  1. Abort these steps.
1. If any other document is using _serviceWorkerRegistration_ as their service worker registration, then
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*pendingWorker* is not null
  1. Call **_Activate**(_serviceWorkerRegistration_).

--
**Unregister**(_scope_)

1. Return **_Unregister**(_scope_).

--
**_Unregister**(_scope_)

1. Let _promise_ be a newly-created _Promise_.
1. Return _promise_.
1. Run the following steps asynchronously.
  1. Let _scope_ be _scope_ resolved against the document url.
  1. If the origin of _scope_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    1. Abort these steps.
  1. Let _serviceWorkerRegistration_ be **_GetRegistration**(_scope_).
  1. If _serviceWorkerRegistration_ is null, then
    1. Reject _promise_ with a new NotFoundError.
    1. Abort these steps.
  1. For each document using _serviceWorkerRegistration_
    1. Set the document's service worker registration to null.
  1. Delete _scope_ from *_ScopeToServiceWorkerRegistrationMap*.
  1. Let _exitingWorker_ be _serviceWorkerRegistration_.*activeWorker*.
  1. Wait for _exitingWorker_ to finish handling any in-progress requests.
  1. Fire _deactivate_ event on _exitingWorker_ object.
  1. Resolve _promise_.

--
**_ScopeMatch**(_url_)

1. Let _matchingScope_ be the longest key in *_ScopeToServiceWorkerRegistrationMap* that glob-matches _url_.
1. Let _serviceWorkerRegistration_ be **_GetRegistration**(_matchingScope_).
1. Return _serviceWorkerRegistration_.

--
**_GetRegistration**(_scope_)

1. If there is no record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*, then return null.
1. Let _serviceWorkerRegistration_ be the record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
1. Return _serviceWorkerRegistration_.

--
**_GetNewestWorker**(_serviceWorkerRegistration_)

1. Let _newestWorker_ be null.
1. If _serviceWorkerRegistration_.*pendingWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*pendingWorker*.
1. Else if _serviceWorkerRegistration_.*activeWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*activeWorker*.
1. Return _newestWorker_.
