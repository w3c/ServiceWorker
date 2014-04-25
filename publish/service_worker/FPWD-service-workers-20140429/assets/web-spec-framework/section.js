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
  "use strict";

  Polymer('spec-section', {
    // String section number, like "17.2.3". 1-based.
    sec_num: "?",

    applyAuthorStyles: true,

    checkInvariants: function() {
      if (!this.id) {
        console.error(this, 'is missing an id.');
      }
    },

    update_sec_nums: function(sec_num) {
      this.sec_num = sec_num + '';
      var child_index = 1;
      // Assume there aren't any elements between spec-section levels.
      for (var child = this.firstChild; child; child = child.nextSibling) {
        if (child.localName == "spec-section") {
          child.update_sec_nums(this.sec_num + '.' + (child_index++));
        }
      }
    },

    sec_numChanged: function() {
      if (this.title_element) {
        this.title_element.setAttribute(
          'data-bookmark-label',
          this.sec_num + ' ' + this.title_element.textContent);
      }
    },

    attached: function() {
      var title_element = this.querySelector('h1');
      if (title_element && title_element.parentElement == this) {
        this.title_element = title_element;
      }

      // async() lets the descendant elements upgrade; after which we
      // need to traverse them to assign paragraph numbers.
      this.async(this.numberParagraphChildren);
    },

    numberParagraphChildren: function(rootElement, para_num_start) {
      var para_num = para_num_start || 1;
      for (var child = (rootElement || this).firstElementChild; child;
           child = child.nextElementSibling) {
        if (child instanceof SpecSectionElement) {
          return para_num;
        } else if (child instanceof HTMLParagraphElement &&
             !child.classList.contains('cont')) {
          this.numberParagraph(para_num++, child);
        /*
        } else if (child instanceof SpecFunctionElement) {
          this.numberParagraph(para_num++, child);
          para_num = this.numberParagraphChildren(child, para_num);
        } else if (child instanceof CxxFunctionAttributeElement) {
          this.numberParagraph(para_num++, child);
        */
        }
      }
      return para_num;
    },

    numberParagraph: function(number, element) {
      var id = this.id + '.' + number;
      if (element.id) {
        console.warn('Paragraph already has id:', element);
        var anchor = document.createElement('a');
        anchor.id = id;
        element.insertBefore(anchor, element.firstChild);
      } else {
        element.id = id;
      }
      element.setAttribute('para_num', number);
    }
  })
})();
