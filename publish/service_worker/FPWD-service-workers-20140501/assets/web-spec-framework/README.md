Web Spec framework
===========================

This is a [Polymer](http://www.polymer-project.org/)-based HTML framework for
writing W3C-flavored web specifications. It's heavily influenced in both spirit and code by Jeff Yasskin's [HTML Document Framework for writing ISO C++ documents and papers](https://github.com/cplusplus/html-doc-framework). To use it for your document, you should

1. [Install Bower.](http://bower.io/#installing-bower)
2. Install this package by running `bower install slightlyoff/web-spec-framework` in the root directory of your document.
3. Import this package into your main HTML file by adding two lines inside the `<head>` element:

```HTML
<script src="bower_components/platform/platform.js"></script>
<link rel="import" href="bower_components/web-spec-framework/framework.html"/>
```

Before we can accept a contribution to this project, you'll need to sign the
Contributor License Agreement at https://developers.google.com/open-source/cla/individual.

### `<spec-include href="other.html">jk`

This one isn't really C++-specific: it allows partitioning a main document
into multiple pieces. `other.html`'s body will be copied in place of the
`<spec-include>` element.
