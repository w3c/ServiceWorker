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
  1. If _serviceWorkerRegistration_ is not null, then
    1. Set _serviceWorkerRegistration_.*uninstalling* to false.
    1. If _scriptUrl_ is equal to _serviceWorkerRegistration_.*scriptUrl*, then
      1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
        1. Resolve promise with _serviceWorkerRegistration_.*updatePromise*.
        1. Abort these steps.
      1. Let _newestWorker_ be **_GetNewestWorker**(_serviceWorkerRegistration_).
      1. If _newestWorker_ is not null, then
        1. Resolve _promise_ with _newestWorker_.
        1. Abort these steps.
  1. If _serviceWorkerRegistration_ is null, then
    1. Let _serviceWorkerRegistration_ be a newly-created *_ServiceWorkerRegistration* object.
    1. Set _serviceWorkerRegistration_ to the value of key _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
    1. Set _serviceWorkerRegistration_.*scope* to _scope_.
    1. Set _serviceWorkerRegistration_.*uninstalling* to false.
  1. Set _serviceWorkerRegistration_.*scriptUrl* to _scriptUrl_.
  1. Resolve _promise_ with **_Update**(_serviceWorkerRegistration_).

--
**_Update**(_serviceWorkerRegistration_)

1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Reject _serviceWorkerRegistration_.*updatePromise* with a new AbortError.
  1. The browser may abort in-flight requests, parsing or worker execution relating to _serviceWorkerRegistration_.*updatePromise*.
1. If _serviceWorkerRegistration_.*installingWorker* is not null, then
  1. Terminate _serviceWorkerRegistration_.*installingWorker*.
  1. Call **_StateChange** with _serviceWorkerRegistration_.*installingWorker* and _redundant_
  1. Set _serviceWorkerRegistration_.*installingWorker* to null
  1. The user agent may abort any in-flight requests triggered by _serviceWorkerRegistration_.*installingWorker*.
1. Let _promise_ be a newly-created Promise.
1. Set _serviceWorkerRegistration_.*updatePromise* to _promise_.
1. Return _promise_.
1. Run the following steps asynchronously.
  1. Perform a fetch of _serviceWorkerRegistration_.*scriptUrl*, forcing a network fetch if cached entry is greater than 1 day old.
  1. If _promise_ has been rejected (eg, another registration has aborted it), then
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
  1. Let _newestWorker_ be **_GetNewestWorker**(_serviceWorkerRegistration_).
  1. If _newestWorker_ is not null, and _newestWorker_.*url* is equal to _serviceWorkerRegistration_.*scriptUrl* and _fetchedScript_ is a byte-for-byte match with the script of _newestWorker_, then
    1. Resolve _promise_ with _newestWorker_.
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

1. If _serviceWorkerRegistration_.*uninstalling* is true, then
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*installingWorker* is not null, then
  1. Abort these steps.
1. Queue a task to call **_Update** with _serviceWorkerRegistration_.

--
**_Install**(_serviceWorkerRegistration_, _serviceWorker_)

1. Set _serviceWorkerRegistration_.*installingWorker* to _serviceWorker_.
1. Set _serviceWorkerRegistration_.*installingWorker*.*state* to _installing_.
1. Fire _install_ event on the associated _ServiceWorkerGlobalScope_ object.
1. Fire _updatefound_ event on _navigator.serviceWorker_ for all documents which match _serviceWorkerRegistration_.*scope*.
1. If the event handler causes a script error, then
  1. Fire _error_ event on _serviceWorkerRegistration_.*currentWorker*
  1. Call **_StateChange** with _serviceWorkerRegistration_.*installingWorker* and _redundant_
  1. Set _serviceWorkerRegistration_.*installingWorker* to null
  1. Abort these steps.
1. If any handler called _waitUntil()_, then
  1. Extend this process until the associated promises settle.
  1. If the resulting promise rejects, then
    1. Call **_StateChange** with _serviceWorkerRegistration_.*installingWorker* and _redundant_
    1. Set _serviceWorkerRegistration_.*installingWorker* to null
    1. Abort these steps.
1. If _serviceWorkerRegistration_.*waitingWorker* is not null, then
  1. Call **_StateChange** with _serviceWorkerRegistration_.*waitingWorker* and _redundant_.
1. Set _serviceWorkerRegistration_.*waitingWorker* to _serviceWorkerRegistration_.*installingWorker*
1. Set _serviceWorkerRegistration_.*installingWorker* to null
1. Call **_StateChange** with _serviceWorkerRegistration_.*waitingWorker* and _installed_.
1. If any handler called _replace()_, then
  1. For each document matching _serviceWorkerRegistration_.*scope*
    1. Set _serviceWorkerRegistration_ as the document's service worker registration.
  1. Call **_Activate** with _serviceWorkerRegistration_.
  1. Abort these steps.
1. If no document is using _serviceWorkerRegistration_ as their service worker registration, then
  1. Queue a task to call **_Activate** with _serviceWorkerRegistration_.

--
**_Activate**(_serviceWorkerRegistration_)

1. Let _activatingWorker_ be _serviceWorkerRegistration_.*waitingWorker*.
1. Let _exitingWorker_ be _serviceWorkerRegistration_.*currentWorker*.
1. If _exitingWorker_ is not null, then
  1. Wait for _exitingWorker_ to finish handling any in-progress requests.
  1. Terminate _exitingWorker_.
  1. Call **_StateChange** with _exitingWorker_ and _redundant_.
1. Set _serviceWorkerRegistration_.*currentWorker* to _activatingWorker_.
1. Set _serviceWorkerRegistration_.*waitingWorker* to null.
1. Call **_StateChange** with _serviceWorkerRegistration_.*currentWorker* and _activating_.
1. Fire _currentchange_ event on _navigator.serviceWorker_ for all documents that have selected _serviceWorkerRegistration_.
1. Fire _activate_ event on the associated _ServiceWorkerGlobalScope_ object.
1. If the event handler leads to a script error, then
  1. Fire _error_ event on _serviceWorkerRegistration_.*currentWorker*
     according to Web Workers spec.
  1. Call **_StateChange** with _serviceWorkerRegistration_.*currentWorker* and _redundant_.
  1. Set _serviceWorkerRegistratin_.*currentWorker* to null.
  1. Abort these steps. **This scope is no longer controlled!**.
1. If any handler calls _waitUntil()_, then
  1. Extend this process until the associated promises settle.
1. Call **_StateChange** with _serviceWorkerRegistration_.*currentWorker* and _activated_.

--
**_OnNavigationRequest**(_request_)

1. If _request_ is a force-refresh (shift+refresh), then
  1. Fetch the resource normally and abort these steps.
1. Let _parsedUrl_ be the result of parsing _request.url_.
1. Let _serviceWorkerRegistration_ be **_ScopeMatch**(_parsedUrl_).
1. If _serviceWorkerRegistration_ is null, then
  1. Fetch the resource normally and abort these steps.
1. Let _matchedServiceWorker_ be _serviceWorkerRegistration_.*currentWorker*.
1. If _matchedServiceWorker_ is null, then
  1. Fetch the resource normally and abort these steps.
1. Document will now use _serviceWorkerRegistration_ as its service worker registration.
1. If _matchedServiceWorker_.*state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*state* to become _activated_.
  1. If activation fails, then
    1. Fetch the resource normally and abort these steps.
1. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object with a new FetchEvent object.
1. If _respondWith_ was not called, then
  1. Fetch the resource normally.
  1. Queue a task to call **_SoftUpdate** with _serviceWorkerRegistration_.
  1. Abort these steps.
1. Let _responsePromise_ be value passed into _respondWith_ casted to a promise.
1. Wait for _responsePromise_ to settle.
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
1. If _matchedServiceWorker_.*state* is _activating_, then
  1. Wait for _matchedServiceWorker_.*state* to become _activated_.
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
1. If _serviceWorkerRegistration_.*uninstalling* is true, then
  1. Delete _serviceWorkerRegistration_.*scope* from *_ScopeToServiceWorkerRegistrationMap*.
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*updatePromise* is null and _serviceWorkerRegistration_.*installingWorker* is null and _serviceWorkerRegistration_.*waitingWorker* is null and _serviceWorkerRegistration_.*currentWorker* is null, then
  1. Delete _serviceWorkerRegistration_.*scope* from *_ScopeToServiceWorkerRegistrationMap*.
  1. Abort these steps.
1. If _serviceWorkerRegistration_.*waitingWorker* is not null
  1. Call **_Activate**(_serviceWorkerRegistration_).

--
**Unregister**(_scope_)

1. Let _promise_ be a newly-created _Promise_.
1. Return _promise_.
1. Run the following steps asynchronously.
  1. Let _scope_ be _scope_ resolved against the document url.
  1. If the origin of _scope_ does not match the document's origin, then
    1. Reject _promise_ with a new SecurityError.
    1. Abort these steps.
  1. Let _serviceWorkerRegistration_ be **_GetRegistration**(_scope_).
  1. If _serviceWorkerRegistration_ is null, then
    1. Resolve _promise_.
    1. Abort these steps.
  1. Set _serviceWorkerRegistration_.*uninstalling* to true
  1. If _serviceWorkerRegistration_.*updatePromise* is not null, then
    1. Reject _serviceWorkerRegistration_.*updatePromise* with a new AbortError.
    1. The browser may abort in-flight requests, parsing or worker execution relating to _serviceWorkerRegistration_.*updatePromise*.
  1. If _serviceWorkerRegistration_.*installingWorker* is not null, then
    1. Terminate _serviceWorkerRegistration_.*installingWorker*.
    1. Call **_StateChange** with _serviceWorkerRegistration_.*installingWorker* and _redundant_.
    1. Set _serviceWorkerRegistration_.*installingWorker* to null
    1. The user agent may abort any in-flight requests triggered by _serviceWorkerRegistration_.*installingWorker*.
  1. If _serviceWorkerRegistration_.*waitingWorker* is not null, then
    1. Call **_StateChange** with _serviceWorkerRegistration_.*waitingWorker* and _redundant_.
    1. Set _serviceWorkerRegistration_.*waitingWorker* to null
  1. Resolve _promise_.
  1. If no document is using _serviceWorkerRegistration_ as their service worker registration, then
    1. Delete _scope_ from *_ScopeToServiceWorkerRegistrationMap*.

--
**_StateChange**(_worker_, _state_)

1. Set _worker_.*state* to _state_.
1. Fire _statechange_ event on _worker_.

--
**_GetInstalling**()

> This is the getter for `window.navigator.installing`

1. Let _serviceWorkerRegistration_ be the worker registration selected by this document.
1. If _serviceWorkerRegistration_ is null, then
  1. Let _serviceWorkerRegistration_ be **_ScopeMatch**(_parsedUrl_).
1. If _serviceWorkerRegistration_ is null, then
  1. Return null
1. Return _serviceWorkerRegistration_.*installingWorker*

--
**_GetWaiting**()

> This is the getter for `window.navigator.waiting`

1. Let _serviceWorkerRegistration_ be the worker registration selected by this document.
1. If _serviceWorkerRegistration_ is not null, then
  1. Return _serviceWorkerRegistration_.*waitingWorker*
1. Let _serviceWorkerRegistration_ be **_ScopeMatch**(_parsedUrl_).
1. If _serviceWorkerRegistration_ is null, then
  1. Return null
1. If _serviceWorkerRegistration_.*currentWorker* is not null, then
  1. Return _serviceWorkerRegistration_.*currentWorker*
1. Return _serviceWorkerRegistration_.*waitingWorker* (which may be null)

--
**_GetCurrent**()

> This is the getter for `window.navigator.current`

1. Let _serviceWorkerRegistration_ be the worker registration selected by this document.
1. If _serviceWorkerRegistration_ is null, then
  1. Return null
1. Return _serviceWorkerRegistration_.*currentWorker* (which may be null)

--
**_ScopeMatch**(_url_)

1. Let _matchingScope_ be the longest key in *_ScopeToServiceWorkerRegistrationMap* that glob-matches _url_.
1. Let _serviceWorkerRegistration_ be **_GetRegistration**(_matchingScope_).
1. If _serviceWorkerRegistration_ is not null and _serviceWorkerRegistration_.*uninstalling* is true, then
  1. Return null.
1. Return _serviceWorkerRegistration_.

--
**_GetRegistration**(_scope_)

1. If there is no record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*, then return null.
1. Let _serviceWorkerRegistration_ be the record for _scope_ in *_ScopeToServiceWorkerRegistrationMap*.
1. Return _serviceWorkerRegistration_.

--
**_GetNewestWorker**(_serviceWorkerRegistration_)

1. Let _newestWorker_ be null.
1. If _serviceWorkerRegistration_.*installingWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*installingWorker*.
1. Else if _serviceWorkerRegistration_.*waitingWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*waitingWorker*.
1. Else if _serviceWorkerRegistration_.*currentWorker* is not null, then
  1. Set _newestWorker_ to _serviceWorkerRegistration_.*currentWorker*.
1. Return _newestWorker_.
