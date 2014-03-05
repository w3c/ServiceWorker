Service Workers Algorithms
===
> **NOTE:**
>
> - **Register** and **_Upgrade** honor HTTP caching rule.
> - Underscored function and attribute are UA-internal properties.
> - The details are still vague especially exception handling parts.

--
**Register**(_script_, _scope_)

1. Let _promise_ be a newly-created Promise.
2. Return _promise_.
3. Run the following steps asynchronously.
  1. Fetch _script_.
  2. Let _fetchedScript_ be the fetched script.
  3. Let _matchedServiceWorker_ be **_ScopeMatch**(_scope_).
  4. If _matchedServiceWorker_ is not _null_, then
    1. If _fetchedScript_ is byte-for-byte match with the script of _matchedServiceWorker_, then
      1. Resolve _promise_ with _matchedServiceWorker_.
  5. Let _serviceWorker_ be a newly-created ServiceWorker object.
  6. Run a worker for _script_.
  7. Queue a task to call **_Install** with _scope_ and _serviceWorker_.
  8. Resolve _promise_ with _serviceWorker_.

--
**_Upgrade**(_scope_, _script_)

1. Fetch _script_.
2. Let _fetchedScript_ be the fetched script.
3. Let _matchedServiceWorker_ be **_ScopeMatch**(_scope_).
4. If _matchedServiceWorker_ is not _null_, then
  1. If _fetchedScript_ is byte-for-byte match with the script of _matchedServiceWorker_, then return.
5. Let _serviceWorker_ be a newly-created ServiceWorker object.
6. Run a worker for _script_.
7. Queue a task to call **_Install** with _scope_ and _serviceWorker_.
8. Return.

--
**_Install**(_scope_, _serviceWorker_)

1. Fire _install_ event on the associated _ServiceWorkerGlobalScope_ object.
2. Fire _install_ event on _navigator.serviceWorker_ for all documents which match _scope_.
3. Set _serviceWorker_ to the value of the record keyed _scope_ in *_ScopeToServiceWorkerMap*.
4. If any handler calls _waitUntil()_, then
  1. Extend this process until the associated promises resolve.
5. Fire _installend_ event on _navigator.serviceWorker_ for all documents which match _scope_.
6. Set _serviceWorker_.*_state* to _waiting_.
7. Queue a task to call **_Activate** with _scope_ and _serviceWorker_.
8. Return.

--
**_Activate**(_scope_, _serviceWorker_)

1. If _serviceWorker_.*_state* is _waiting_, then
  1. If any handler calls _waitUntil()_ or any documents loaded with previous version of _ServiceWorker_ are not closed, then
    1. Extend this process until the associated promises resolve and all the associated documents are closed.
  2. Fire _activate_ event on the associated _ServiceWorkerGlobalScope_ object.
  3. Fire _activate_ event on _navigator.serviceWorker_ for all documents which match _scope_.
  5. Set _serviceWorker_.*_state* to _active_.
2. Else, throw an _DOMException_ whose name is InvalidStateError.
3. Fire _activateend_ event on _navigator.serviceWorker_ for all documents which match _scope_.
4. Return.

--
**Replace**()

1. Return and run the following steps asynchronously.
  1. If any handler calls _waitUntil()_, then
    1. Extend this process until they all resolve.
  2. Set _serviceWorker_.*_state* to _active_.

> FIXME: Should we fire install(end), activate(end) events?

--
**_NavigationMatch**(_request_)

1. Let _parsedUrl_ be the result of parsing _request.url_.
2. Let _matchedServiceWorker_ be **_ScopeMatch**(_parsedUrl_).
3. If _matchedServiceWorker_ is not null, then
  1. If _matchedServiceWorker_.*_state* is _active_, then
    1. Fire _fetch_ event on the associated _ServiceWorkerGlobalScope_ object.
4. Return.

--
**Unregister**(_scope_)

1. Let _promise_ be a newly-created _Promise_.
2. Return _promise_.
3. Run the following steps asynchronously.
  1. Let _matchedServiceWorker_ be **_ScopeMatch**(_scope_).
  2. If _matchedServiceWorker_ is not null, then
    1. If _matchedServiceWorker_.*_state* is _active_, then
      1. Set _serviceWorker_.*_state* to _invalid_.
      2. Set the key and the value of this record in *_ScopeToServiceWorkerMap* to empty.
      3. Fire _deactivate_ event on _serviceWorker_ object.
      4. Resolve _promise_ with _serviceWorker_.

--
**_ScopeMatch**(_url_)

1. Let _valueServiceWorker_ be the return value of finding the most specifically matched record keyed _url_ from *_ScopeToServiceWorkerMap*.
2. Return _valueServiceWorker_.
