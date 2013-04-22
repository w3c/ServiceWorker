# Game with independently caching levels

A game where each level is a different cache group.

## Behaviour draft

* User visits game’s url
    * If first visit
        * Loading screen delivered (as normal html)
        * Assets for menu screens and non-level specific behaviour (physics engine etc) downloaded and cached
            * If any request fails, error message (not browser UI) shown to user
    * Menu screen shown (using cached assets)
    * Send versions of game logic / menus & each cached level to server, server returns items that are out of date
        * if fail, abort these steps
        * If game logic / menus are out of date
            * Fetch new assets
            * If any request fails, do not cache, abort these steps
            * Once all assets are fetched, cache’em
        * for each out of date level, delete from cache
    * For each undownloaded level (with priority to earlier levels)
        * Download some kind of manifest for level, containing version, level structure and additional assets required
        * Request any additional resources indicated by manifest
        * Once the manifest and all resources have downloaded, commit to cache
        * If any request fails, do not cache, fail silently
* User clicks “play”
    * Level select screen fetched from cache and shown
    * Download progress/success/failure of levels indicated
    * User clicks on level whose download has failed or in progress
        * See “Starting uncached level”
    * User clicks on cached level
        * See “Starting cached level”
* Starting uncached level
    * Show loading screen
    * Restart download if failed
    * Download level data & cache as specified earlier (see “For each undownloaded level”)
    * If succeed
        * See “Starting cached level”
    * Else
        * Show reason as error message
* Starting cached level
    * Load level from cache & begin having fun
    * On level complete
        * If next level cached
            * See “Starting cached level”
        * Else
            * See “Starting uncached level”
