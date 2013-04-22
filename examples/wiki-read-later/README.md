# Wikipedia offline

This example will demonstrate how a site like Wikipedia could use the controller to offer an offline experience, where the user selects articles they'd like to be availble offline.

## Behaviour draft

* User clicks “read later” on an article for the first time
    * Bootstrap code and related imagery requests added to cache, this process fails if any request fails
    * Article html include (different url to article) & device-dependant inline images requests saved, this process fails if any request fails
    * Confirmation given when bootstrap and article caching has completed
    * Otherwise, meaningful error message displayed (by the site, not browser UI)
* User visits homepage
    * Page structure is pulled from bootstrap cache
    * Content such as “article of the day” is fetched via XHR
        * If XHR fails, unobtrusive message indicating the user is offline is displayed in place of content
    * “Available offline” list is populated with articles the user has cached, along with “remove” buttons
* User visits cached article
    * Page structure is pulled from bootstrap cache
    * Cached content is injected into the content area of the page
    * “read later” button displays spinner
    * Additional online-only content fetched via XHR, eg login state
        * Fails silently, or displays small “offline mode” as login state
    * Article html include requested
        * If request succeeds, update content on page and replace cached content with new content
        * If fails, fail silently
        * Remove spinner from “read later” button
* User visits uncached article
    * Page requested from the server (normal request behaviour)
        * If fails due to network failure (no connection), friendly error message displayed, explaining the user is offline, listing article that are available offline
* On navigate, if a check hasn’t been made for 10 minutes, look for updates to the bootstrap and page templates, update accordingly
