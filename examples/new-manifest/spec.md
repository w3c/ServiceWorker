This is a very vague spec based on the information in http://lists.w3.org/Archives/Public/public-webapps/2013JanMar/0977.html

* TODO: any FALLBACK-like behaviour? Doesn’t look like it
* TODO: no resources from other domains?

# Manifest structure

```javascript
{
  // Version of the app, used to control cached item update checking (optional)
  "version": String,
  // Duration the cache is considered "fresh" (optional)
  "expiration": Number,
  // URLs to cache (optional)
  "cache": [
    // Contains zero or more of the following types:
    // URL
    String,
    // or object
    {
      "url": String,
      // optional
      "etag": String,
      // optional
      "last-modified": String
    }
  ],
  "urlmap": [
    // zero or more objects like:
    {
      // string, potentially ending in * to capture url prefixes
      "url": String,
      // or array of the above
      "url": Array, // of String,
      // URL to handle the request
      // TODO: page is a poor name, may not be a page, could be image etc
      // TODO: can "page" be an object like cache entries? Feels like it should be
      "page": String
    }
  ],
  // Flush cache based on cookie value
  "cookie-vary": String
}
```

# Loading a page

* If the requested url is under the control of a manifest:
    * TODO: unsure how manifest selection is performed
    * TODO: can sub manifests become active manifests?
    * Let “active manifest” be the current controlling manifest
    * Let “active cache” be the cache linked to by the manifest (so updates to the manifest & its cache aren’t seen by this page until navigate)
    * Let “sub manifests” be the current sub manifests active in the “active manifest”
    * For each “sub manifest”, take a frozen copy of their caches (so updates to the manifest & its cache aren’t seen by this page until navigate)
* If no “active manifest”
    * Abort these steps and request as usual
* The “active manifest” is checked for updates whenever a page requested, although browser is free to check more frequently (as in, update while user isn’t on the site)
* If navigator.onLine == false
    * If url in “active manifest” cache
        * Let “cached item” equal the item cached from the current url
    * Else if url matches item in “active manifest” “urlmap”
        * Let “cached item” equal the item cached from the url in the “page” key
    * If “cached item” set and is younger than “expiration”
        * If “active manifest” “cookie-vary” absent
            * Serve “cached item” (do not change window.location)
            * Let “active cache” be the cache used by “active manifest”
            * Abort these steps
        * Else if current varying value matches the value used in the original request of “cached item”
            * Serve “cached item” (do not change window.location)
            * Let “active cache” be the cache used by “active manifest”
            * Abort these steps
* Fetch page from network
* If request fails due to network failure
    * Undefined

# Loading subresources on pages retrieved from cache

* If item cached in “active cache”
    * Serve from “active cache”
* Else if url matches item in “active manifest” “urlmap”:
    * Serve “page” from “active cache”
* Else
    * TODO: what if the url is cached by a manifest other than “active manifest”?
    * Fetch as usual via network

# Loading Subresources on pages retrieved from network

* Always retrieve from network
* TODO: if a page is delivered fine from network, but then you lose a connection, the page won’t be able to use any cached resources until reload - worried about this

# Updating

* TODO: does the “expiration” property have any say in the frequency of updates?
* TODO: this process current purges any items cached via the API which is clearly the wrong thing to do, what’s the right thing to do? 
    * What if an api cached item later becomes part of the manifest
    * Are api-added items updated as part of this update, or are they only updatable via the js api?
* Check for update to manifest file using HTTP caching rules (TODO: not sure about this)
    * TODO: any special behaviour for 404ing?
* (the following happens even if the manifest hasn’t changed, or comes from http cache)
* If “version” key absent, or different to previous value:
    * Let “items to download” be empty
    * Let “new cache” be empty
    * For each item in cache list:
        * If url does not exist in current cache,
            * Add to “items to download” & continue
        * If manifest contains “cookie-vary” and the current varying value does not match the value used in the original request
            * Add to “items to download” & continue
        * TODO: which gets priority, etag or last-modified?
        * If cache item has an “etag” key and item in “active cache” has matching “etag”
            * Copy current cache item to “new cache” & continue
        * If cache item has a “last-modified” key and item in “active cache” has matching “last-modified” header
            * Copy current cache item to “new cache” & continue
        * Add to “items to download” & continue
    * For each item in urlmap:
        * Add “page” url to “items to download” & continue
        * TODO: should these entries be allowed to have “etag”/”last-modified” options as with cache entries?
        * TODO: what happens if a “page” url is also in “cache”?
        * Request all items listed in “items to download”, observing HTTP cache
    * Run update steps for each “sub-manifest” linked to the old manifest
        * If all items successfully download (including those in sub manifests)
        * Cache the new manifest and link it to the old manifest’s urls (TODO: not sure how a manifest knows which urls its responsible for)
        * Add downloaded items & their request cookie string to “new cache”
        * Form cache using items in “new cache”, link to new manifest
        * Link sub manifests to new manifest
        * set document.appCacheUpdateAvailable to true
        * Fire simple event “appcacheupdateavailable” on document
        * Old manifest, cache & submanifests and their caches may be purged once there are no active pages using them as “active manifest” or “active cache”
    * Else fail silently

# JS API

## navigator.installAppCache(manifestUrl):Future<AppCache>
* Go through updating process, installing new manifest
* Return AppCache object relating to manifest url

## navigator.getAppCache(manifestUrl):Future<AppCache>
* Return AppCache object relating to manifest url

## navigator.removeAppCache(manifestUrl):Future
* Unlink manifest from the URLs its responsible for
* Manifest and cache may be purged once there are no active pages using them as “active manifest” or “active cache”
* TODO: I guess the current page may continue to use the manifest and cache?

## navigator.getAppCacheList():Future<DOMString[]>
* TODO: don’t know what this does

## document.appCache:AppCache
* Return AppCache object relating to “active manifest” or null

## document.appCacheUpdateAvailable:Boolean
* Starts false, set during updates

## appCache.manifest:Object
* Manifest file JSON.parse’d

TODO: any way to get all sub manifests for a particular manifest?

## appCache.getSubManifest(manifestUrl):Object
* TODO: dunno

## appCache.addSubManifest(manifestUrl):Future
* TODO: can sub manifests have sub manifests?
* TODO: what if an existing primary manifest is added as the sub manifest of another primary manifest?
* TODO: how to handle circular dependencies?
* TODO: if I add a sub manifest that’s also another url’s primary manifest, if I `cacheURL()` on one does it affect both?
* TODO: can submanifests be from another domain?
* Run update steps for this manifest url
* On success:
    * Add manifest to this appCache's sub-manifests

## appCache.removeSubManifest(manifestUrl):Future
* Remove manifest from this appCache's sub-manifests

## appCache.cacheURL(url, options:Object):Future
* TODO: how does this interact with “urlmap”
* options contains keys for etag (String) & lastModified (Date)
* TODO: which gets priority, etag or last-modified?
* If url does not exist in current cache,
    * Let “to cache” be url
* Else if manifest contains “cookie-vary” and the current varying value does not match the value used in the original request of this url in cache
    * Let “to cache” be url
* Else if url in “active cache” and has “etag” matching options.etag
    * Resolve future & abort
* Else if url in “active cache” and has “last-modified” equivilent to options[“last-modified”] 
    * Resolve future & abort
* Else
    * Let “to cache” be url
* Fetch “to cache”
* On success:
    * Add url to the “cache” key of the manifest, mark as “api-added”
    * Add resource to the cache
    * Resolve future
* On fail:
    * Reject future

## appCache.removeCachedURL(url):Future
* If url exists in the “cache” key of the manifest
    * If entry was “api-added”
        * Remove entry
    * Else
        * Reject future
* If url is not referenced in “urlmap”
    * Remove resource from cache
* Resolve future

## appCache.isCached(url):Future
* TODO: does this check api-added urls only?
* TODO: if not, does it include urls explicitly cached in “urlmap”
* TODO: does it include url ranges captured by “urlmap”, despite the actual url not being cached?

## appCache.getErrorLog():Future
* TODO: unsure when this log is added to
* TODO: not clear on the lifetime of this log

## appCache.download():void
* TODO: don’t know what this does

## appCache.cancelDownload():void
* TODO: don’t know what this does

Note: I’ve missed off some properties of appCache

## appCache.checkForUpdate():Future
* Run update steps
* Resolve future
* TODO: in which cases should this future reject?
