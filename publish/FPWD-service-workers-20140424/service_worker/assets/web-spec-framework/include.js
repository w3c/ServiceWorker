/* Copyright 2014 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* The <spec-include href> element replaces itself with the contents at
 * 'href'. It doesn't use a shadow root so that the other document
 * acts exactly as part of the current document. */
(function() {
  "use strict";

  var includeProto = Object.create(HTMLElement.prototype, {
    attachedCallback: {
      value: function() {
        this.link = document.createElement('link');
        this.link.setAttribute('rel', 'import');
        this.link.setAttribute('href', this.getAttribute('href'));
        this.link.onload = this.loaded.bind(this);
        this.link.onerror = function(e) {
          console.error(e);
        }
        document.head.appendChild(this.link);
      },
    },
    loaded: {
      value: function() {
        var imported = this.link.import;
        this.link.parentNode.removeChild(this.link);
        var parent = this.parentNode;
        for (var elem = imported.body.firstChild;
             elem;
             elem = elem.nextSibling) {
          parent.insertBefore(elem.cloneNode(true), this);
        }
        parent.removeChild(this);
      },
    },

  });
  document.registerElement('spec-include', { prototype: includeProto });
})();
