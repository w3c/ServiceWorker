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

(function() {
  Polymer('spec-toc', {
    // Hierarchy :: [{ elem: Element, title: H1, sections: Hierarchy }]
    sections: [],

    // Updated with the list of <spec-clause> elements in the document each
    // time such an element is attached or detached.
    clauses: [],

    collectSections: function(root) {
      var sections = [];
      for (var child = root.firstElementChild;
          child;
          child = child.nextElementSibling) {
        if (child.tagName.toUpperCase() != 'SPEC-SECTION') {
          continue;
        }
        sections.push(this.collectSections(child));
      }
      return {elem: root,
              title: root.querySelector('h1'),
              sections: sections};
    },

    clausesChanged: function() {
      this.sections = this.clauses.array().map(function(clause, index) {
        clause.set_clause_num(index + 1);
        return this.collectSections(clause);
      }, this);
    },

    attached: function() {
      this.clauses = document.querySelectorAll('spec-clause');
    }
  })
})();
