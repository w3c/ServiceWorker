# Web Platform Working Group

## Spec and API development

For the nitty-gritty of the API, the [draft W3C specification](https://w3c.github.io/ServiceWorker/) is authoritative. For implementers and developers who seek a more stable version, [Service Workers 1](https://w3c.github.io/ServiceWorker/v1/) is a right document with which the contributors only focus on fixing bugs and resolving compatibility issues.

Spec development happens via [issues in this repository](https://github.com/w3c/ServiceWorker/issues). For general discussion, please use the [public-webapps@w3.org mailing list](http://lists.w3.org/Archives/Public/public-webapps/) with a `Subject:` prefix of `[service-workers]`.

Updates to the spec must reference [resolved issues marked `needs spec`](https://github.com/w3c/ServiceWorker/issues?q=is%3Aclosed+label%3A%22needs+spec%22).

To make edits to the design, please send pull requests against the Nightly spec on the master branch. We use [bikeshed](https://github.com/tabatkins/bikeshed). So, change and submit `docs/index.bs`. When your pull request is merged, Travis CI will automatically build the spec.

For normative changes, a corresponding [web-platform-tests](https://github.com/web-platform-tests/wpt) PR is highly appreciated. Typically, both PRs will be merged at the same time. Note that a test change that contradicts the spec should not be merged before the corresponding spec change. If testing is not practical, please explain why and if appropriate [file an issue](https://github.com/web-platform-tests/wpt/issues/new) to follow up later. Add the `type:untestable` or `type:missing-coverage` label as appropriate.

Contributions to this repository are intended to become part of Recommendation-track documents
governed by the [W3C Patent Policy](http://www.w3.org/Consortium/Patent-Policy-20040205/) and
[Software and Document License](http://www.w3.org/Consortium/Legal/copyright-software). To contribute, you must
either participate in the relevant W3C Working Group or make a non-member patent licensing
commitment.

If you are not the sole contributor to a contribution (pull request), please identify all
contributors in the pull request's body or in subsequent comments.

 To add a contributor (other than yourself, that's automatic), mark them one per line as follows:

 ```
 +@github_username
 ```

 If you added a contributor by mistake, you can remove them in a comment with:

 ```
 -@github_username
 ```

 If you are making a pull request on behalf of someone else but you had no part in designing the
 feature, you can remove yourself with the above syntax.
