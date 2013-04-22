# Single page app

This is something the current AppCache spec deals with pretty well. We need to ensure we don't regress here.

## Behaviour draft

* User visits site
    * If site cached
        * Fetch from cache
        * Check for updated application
        * If update found / no cache exists
            * Download new resources
            * Once all downloaded successfully
                * Clear cache
                * Add downloaded content to cache
                * If “interacted with”
                    * Show “Update available” message
                * Else
                    * Refresh page
    * Else
        * Deliver page and resources normally
        * Once all resources are successfully download, add to cache
    * On UI interaction (changing the state of the page)
        * Mark page as “interacted with”
