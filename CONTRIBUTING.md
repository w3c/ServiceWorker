# Web Platform Working Group

## Spec and API development

For the nitty-gritty of the API, the [draft W3C specification](https://w3c.github.io/ServiceWorker/spec/service_worker/) is authoritative. For implementers and developers who seek a more stable version, [Service Workers 1](https://w3c.github.io/ServiceWorker/spec/service_worker_1/) is a right document with which the contributors only focus on fixing bugs and resolving compatibility issues.

Spec development happens via [issues in this repository](https://github.com/w3c/ServiceWorker/issues). For general discussion, please use the [public-webapps@w3.org mailing list](http://lists.w3.org/Archives/Public/public-webapps/) with a `Subject:` prefix of `[service-workers]`.

Updates to the spec must reference [resolved issued marked `needs spec`](https://github.com/w3c/ServiceWorker/issues?q=is%3Aclosed+label%3A%22needs+spec%22).

To edit the spec locally, you’ll need a copy of [the Web Components-based framework which it is built with](https://github.com/slightlyoff/web-spec-framework). To fetch it, clone the repo and run:

```sh
git submodule update --init --recursive
```

To make edits to the design, please send pull requests against the spec (`spec/service_worker/index.html`).

Contributions to this repository are intended to become part of Recommendation-track documents 
governed by the [W3C Patent Policy](http://www.w3.org/Consortium/Patent-Policy-20040205/) and
[Document License](http://www.w3.org/Consortium/Legal/copyright-documents). To contribute, you must 
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
