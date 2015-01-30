(function() {
  "use strict";

  function capture(window) {
    // Todo: Support other browsers
    // Firefox currently has a different post-webcomponent-markup structure
    if(navigator.userAgent.indexOf("Chrome") != -1 ) {
      ;
    } else {
      alert("Capture is yet to be supported in this browser.");
      return;
    }

    var snapshot = new Snapshot(window);

    snapshot.replaceSpecSection();
    snapshot.replaceSpecClause();
    snapshot.replaceSpecAlgorithm();
    snapshot.replaceCode();
    snapshot.replaceIDL();
    snapshot.setSectionNumber();
    snapshot.setSectionAnchor();
    snapshot.replaceSpecToc();
    snapshot.replaceHeader();

    snapshot.download();
  }

  function Snapshot(window) {
    this.document = window.document.cloneNode(true);
  };

  Snapshot.prototype.replaceSpecSection = function() {
    var specClauses = this.document.querySelectorAll("spec-clause");

    for (var i = 0, n = specClauses.length; i < n; ++i) {
      var specSections = specClauses[i].querySelectorAll("spec-section");

      for (var j = 0, m = specSections.length; j < m; ++j) {
        var section = this.document.createElement("section");
        section.innerHTML = '<header><span class="section-number">{{sec_num}}</span> <content select="h1"></content><span class="anchor"><a style="text-decoration: none;" href="#{{id}}">&para;</a></span></header><content></content>';

        var sectionID = specSections[j].getAttribute("id");
        var header = specSections[j].querySelector("h1");
        var node = header.cloneNode(true);

        var contents = [];
        var firstChild = specSections[j].firstChild;
        while (firstChild) {
          if (firstChild.nodeName != "H1")
            contents.push(firstChild);
          firstChild = firstChild.nextSibling;
        }

        specSections[j].parentNode.replaceChild(section, specSections[j]);
        section.setAttribute("id", sectionID);
        var targetContents = section.querySelectorAll("content");
        targetContents[0].parentNode.replaceChild(node, targetContents[0]);

        contents.forEach(function(content) {
          targetContents[1].parentNode.appendChild(content);
        });
        targetContents[1].parentNode.removeChild(targetContents[1]);
      }
    }
  };

  Snapshot.prototype.replaceSpecClause = function() {
    var specClauses = this.document.querySelectorAll("spec-clause");

    for (var i = 0, n = specClauses.length; i < n; ++i) {
      var section = this.document.createElement("section");
      section.innerHTML = '<header><span class="section-number">{{sec_num}}</span> <content select="h1"></content><span class="anchor"><a style="text-decoration: none;" href="#{{id}}">&para;</a></span></header><content></content>';

      var sectionID = specClauses[i].getAttribute("id");
      var header = specClauses[i].querySelector("h1");
      var node = header.cloneNode(true);

      var contents = [];
      var firstChild = specClauses[i].firstChild;
      while (firstChild) {
        if (firstChild.nodeName != "H1")
          contents.push(firstChild);
        firstChild = firstChild.nextSibling;
      }

      specClauses[i].parentNode.replaceChild(section, specClauses[i]);
      section.setAttribute("id", sectionID);
      var targetContents = section.querySelectorAll("content");
      targetContents[0].parentNode.replaceChild(node, targetContents[0]);

      contents.forEach(function(content) {
        targetContents[1].parentNode.appendChild(content);
      });
      targetContents[1].parentNode.removeChild(targetContents[1]);
    }
  };

  Snapshot.prototype.replaceSpecAlgorithm = function() {
    var specAlgorithms = this.document.querySelectorAll("spec-algorithm");

    for (var i = 0, n = specAlgorithms.length; i < n; ++i) {
      var div = this.document.createElement("div");
      div.innerHTML = '<content></content>';
      div.setAttribute("class", "algorithm");

      var contents = [];
      var firstChild = specAlgorithms[i].firstChild;
      while (firstChild) {
        contents.push(firstChild);
        firstChild = firstChild.nextSibling;
      }

      specAlgorithms[i].parentNode.replaceChild(div, specAlgorithms[i]);
      var targetContent = div.querySelector("content");

      contents.forEach(function(content) {
        targetContent.parentNode.appendChild(content);
      });
      targetContent.parentNode.removeChild(targetContent);
    }
  };

  Snapshot.prototype.replaceCode = function() {
    var specCodes = this.document.querySelectorAll("spec-code");

    for (var i = 0, n = specCodes.length; i < n; ++i) {
      var pre = this.document.createElement("pre");
      pre.innerHTML = '<code><content></content></code>';

      var contents = [];
      var firstChild = specCodes[i].firstChild;
      while (firstChild) {
        contents.push(firstChild);
        firstChild = firstChild.nextSibling;
      }

      specCodes[i].parentNode.replaceChild(pre, specCodes[i]);
      var targetContent = pre.querySelector("content");

      contents.forEach(function(content) {
        targetContent.parentNode.appendChild(content);
      });
      targetContent.parentNode.removeChild(targetContent);
    }
  };

  Snapshot.prototype.replaceIDL = function() {
    var specIDL = this.document.querySelectorAll("spec-idl");

    for (var i = 0, n = specIDL.length; i < n; ++i) {
      var pre = this.document.createElement("pre");
      pre.innerHTML = '<code><content></content></code>';

      var contents = [];
      var firstChild = specIDL[i].firstChild;
      while (firstChild) {
        contents.push(firstChild);
        firstChild = firstChild.nextSibling;
      }

      specIDL[i].parentNode.replaceChild(pre, specIDL[i]);
      var targetContent = pre.querySelector("content");

      contents.forEach(function(content) {
        targetContent.parentNode.appendChild(content);
      });
      targetContent.parentNode.removeChild(targetContent);
    }
  };

  Snapshot.prototype.setSectionNumber = function() {
    var sections = this.document.querySelectorAll("section");

    for (var i = 0, n = sections.length; i < n; ++i) {
      var header = sections[i].querySelector("header");
      var span = header.querySelector("span");
      var h1 = header.querySelector("h1");
      var secNum = h1.getAttribute("data-bookmark-label");
      if (secNum != null) {
        span.textContent = secNum.substr(0, secNum.indexOf(' '));
      } else { // fixme: data-bookmark-label is not set for this element
        if (h1.innerHTML == "Cross-Origin Resources and CORS") {
          span.textContent = "6.2";
        }
      }
    }
  };

  Snapshot.prototype.setSectionAnchor = function() {
    var sections = this.document.querySelectorAll("section");

    for (var i = 0, n = sections.length; i < n; ++i) {
      var a = sections[i].querySelector("a");
      var id = sections[i].getAttribute("id");
      a.setAttribute("href", "#" + id);
    }
  };

  Snapshot.prototype.replaceSpecToc = function() {
    var specToc = this.document.querySelector("spec-toc");
    var sections = this.document.querySelectorAll("section");

    var nav = this.document.createElement("nav");
    var h2 = this.document.createElement("h2");
    h2.setAttribute("id", "toc");
    h2.innerHTML = "Table of Contents";
    var ol = this.document.createElement("ol");
    nav.appendChild(h2);
    nav.appendChild(ol);

    var lastNode = ol;
    var lastHierarchy = "section";
    var hierarchy = "section";

    for (var i = 0, n = sections.length; i < n; ++i) {
      var sectionID = sections[i].id;
      var secNum = sections[i].querySelector("span").innerHTML;
      var secTitle = sections[i].querySelector("h1");

      if (secTitle.firstChild.nodeName == "CODE")
        secTitle = secTitle.firstChild.innerHTML;
      else
        secTitle = secTitle.innerHTML;

      var li = this.document.createElement("li");
      var span = this.document.createElement("span");
      span.setAttribute("class", "marker");
      span.innerHTML = secNum + " ";
      var a = this.document.createElement("a");
      a.setAttribute("href", "#" + sectionID);
      a.innerHTML = secTitle;
      li.appendChild(span);
      li.appendChild(a);


      var re = /\./g;
      var dot = secNum.match(re);

      if (dot == null) hierarchy = "section";
      else if (dot.length == 1) hierarchy = "subsection";
      else if (dot.length == 2) hierarchy = "subsubsection";

      if (lastHierarchy == "section") {
        if (hierarchy == "section") {
          ol.appendChild(li);
        } else if (hierarchy == "subsection") {
          var subOl = this.document.createElement("ol");
          subOl.appendChild(li);
          lastNode.appendChild(subOl);
        }
      } else if (lastHierarchy == "subsection") {
        if (hierarchy == "section") {
          ol.appendChild(li);
        } else if (hierarchy == "subsection") {
          lastNode.parentNode.appendChild(li);
        } else if (hierarchy == "subsubsection") {
          var subsubOl = this.document.createElement("ol");
          subsubOl.appendChild(li);
          lastNode.appendChild(subsubOl);
        }
      } else if (lastHierarchy == "subsubsection") {
        if (hierarchy == "section") {
          ol.appendChild(li);
        } else if (hierarchy == "subsection") {
          lastNode.parentNode.parentNode.parentNode.appendChild(li);
        } else if (hierarchy == "subsubsection") {
          lastNode.parentNode.appendChild(li);
        }
      }

      lastNode = li;
      lastHierarchy = hierarchy;
    }

    specToc.parentNode.replaceChild(nav, specToc);
  };

  Snapshot.prototype.replaceHeader = function() {
    var head = this.document.querySelector("head");
    var scripts = head.querySelectorAll("script");

    for (var i = 0, n = scripts.length; i < n; ++i) {
      scripts[i].parentNode.removeChild(scripts[i]);
    }

    var captureButton = this.document.querySelector("#capture-button");
    captureButton.parentNode.removeChild(captureButton);

    var styles = head.querySelectorAll("style");

    for (var i = 0, n = styles.length; i < n; ++i) {
      styles[i].parentNode.removeChild(styles[i]);
    }

    var style = this.document.createElement("style");
    style.innerHTML = mainStyle;

    var meta = head.querySelector("meta");
    meta.nextSibling.parentNode.insertBefore(style, meta.nextSibling);

    var w3css = this.document.createElement("link");
    w3css.setAttribute("rel", "stylesheet");
    w3css.setAttribute("href", "https://www.w3.org/StyleSheets/TR/W3C-ED");
    w3css.setAttribute("type", "text/css");

    var link = head.querySelector("link");
    link.parentNode.replaceChild(w3css, link);
  };

  Snapshot.prototype.download = function() {
    var x = window.open();
    var a = x.document.createElement("a");
    a.text = "Document captured. Download!";
    a.setAttribute("href",  "data:text/html;charset=utf-8," + encodeURIComponent("<!doctype html>\n" + this.document.querySelector("html").outerHTML));
    a.setAttribute("download", "serviceworker-snapshot.html");
    x.document.body.appendChild(a);
    x.document.close();
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelector("#capture-button")
            .addEventListener("click", function() { capture(self); });
  });

  var mainStyle = "body {\n" +
  "/*  padding: 2em 1em 2em 70px;\n" +
  "  margin: 0; */\n" +
  "  color: black;\n" +
  "  background: white;\n" +
  "  background-position: top left;\n" +
  "  background-attachment: fixed;\n" +
  "  background-repeat: no-repeat;\n" +
  "\n" +
  "/*  line-height: 1.5em;*/\n" +
  "}\n" +
  "\n" +
  ".logo > a {\n" +
  "  border-bottom: none;\n" +
  "}\n" +
  "\n" +
  "article, aside, footer, header, hgroup, main, nav, section {\n" +
  "  display: block;\n" +
  "}\n" +
  "\n" +
  "header {\n" +
  "  font-weight: bold;\n" +
  "  margin-top: 20px;\n" +
  "  margin-bottom: 20px;\n" +
  "}\n" +
  "\n" +
  "header::after {\n" +
  "clear: both;\n" +
  "display: block;\n" +
  "content: \" \";\n" +
  "height: 0;\n" +
  "}\n" +
  "\n" +
  "section > header > h1, section > header > h2, section > header > h3, section > header > h4, section > header > h5 {\n" +
  "  display: inline;\n" +
  "  font-size: 100%;\n" +
  "  font-weight: bold;\n" +
  "}\n" +
  "\n" +
  "body > pre.prettyprint,\n" +
  "body > section pre {\n" +
  "  background-color: #eee;\n" +
  "  padding: 0 2em 1em 2em;\n" +
  "  margin: 0;\n" +
  "  border: none;\n" +
  "}\n" +
  "\n" +
  "header > ul {\n" +
  "  font-size: 0.8em;\n" +
  "  list-style: none;\n" +
  "  margin: 0 -1em;\n" +
  "  padding: 0.3em 0;\n" +
  "  background-color: #eee;\n" +
  "}\n" +
  "\n" +
  "header > ul > li {\n" +
  "  display: inline;\n" +
  "  margin: 0 0 0 1em;\n" +
  "}\n" +
  "\n" +
  "header > ul > li:nth-of-type(3) {\n" +
  "  display: inline;\n" +
  "  margin: 0 0 0 5em;\n" +
  "}\n" +
  "\n" +
  "var {\n" +
  "  color: #005A9C;\n" +
  "  font-style: normal;\n" +
  "}\n" +
  "\n" +
  ".section-number, .anchor > a {\n" +
  "color: #005A9C;\n" +
  "}\n" +
  "\n" +
  ".anchor {\n" +
  "padding-right: 1em;\n" +
  "font-size: 0.8em;\n" +
  "float: right;\n" +
  "text-decoration: none;\n" +
  "}\n" +
  "\n" +
  ".fixme {\n" +
  "  display: block;\n" +
  "  padding: 10px 0 0 20px;\n" +
  "  border-left: 5px solid #E05252;\n" +
  "}\n" +
  "\n" +
  "\n" +
  ".fixme:before {\n" +
  "  content: 'To be addressed';\n" +
  "  float: right;\n" +
  "  display: block;\n" +
  "  padding: 2px 10px;\n" +
  "  background-image: -webkit-linear-gradient(top left, #FFFFFF 0%, #FBE9E9 100%);\n" +
  "  background-image: linear-gradient(to bottom right, #FFFFFF 0%, #FBE9E9 100%);\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "\n" +
  ".note {\n" +
  "  color: green;\n" +
  "  font-weight: bold;\n" +
  "  font-style: italic;\n" +
  "  padding-left: 2em;\n" +
  "}\n" +
  "\n" +
  ".note:before {\n" +
  "  content: \"Note: \";\n" +
  "}\n" +
  "\n" +
  ".warning:before {\n" +
  "  content: \"WARNING: \";\n" +
  "  font-weight: bold;\n" +
  "}\n" +
  "\n" +
  ".warning {\n" +
  "  padding: 10px 10px;\n" +
  "  width: 100%;\n" +
  "  background: #fffaba;\n" +
  "  box-sizing: border-box;\n" +
  "}\n" +
  "\n" +
  "dfn {\n" +
  "  font-style: normal;\n" +
  "  font-weight: bold;\n" +
  "  background-color: #f9f9f9;\n" +
  "  padding: 0 2px;\n" +
  "  outline: 1px solid #eee;\n" +
  "}\n" +
  "\n" +
  "dfn > code {\n" +
  "  background-color: transparent;\n" +
  "}\n" +
  "\n" +
  "dfn.no-references {\n" +
  "  background-color: #ffefef;\n" +
  "}\n" +
  "\n" +
  "dfn:target, a:target {\n" +
  "  background-color: #FFFF91;\n" +
  "}\n" +
  "\n" +
  "a[href*=dfn-] {\n" +
  "  border-bottom: 1px dotted #ccc;\n" +
  "}\n" +
  "\n" +
  "div.informative:before {\n" +
  "  content: 'Informative';\n" +
  "  float: right;\n" +
  "  display: block;\n" +
  "  padding: 2px 10px;\n" +
  "  background-image: -webkit-linear-gradient(top left, #FFFFFF 0%, #D3EEDF 100%);\n" +
  "  background-image: linear-gradient(to bottom right, #FFFFFF 0%, #D3EEDF 100%);\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "\n" +
  "div.informative {\n" +
  "  padding: 10px 0 0 20px;\n" +
  "  border-left: 5px solid #D3EEDF;\n" +
  "}\n" +
  "\n" +
  "div.monkeypatch:before {\n" +
  "  content: 'Monkeypatch';\n" +
  "  float: right;\n" +
  "  display: block;\n" +
  "  padding: 2px 10px;\n" +
  "  background-image: -webkit-linear-gradient(top left, #FFFFFF 0%, #D3EEDF 100%);\n" +
  "  background-image: linear-gradient(to bottom right, #FFFFFF 0%, #D3EEDF 100%);\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "\n" +
  "div.monkeypatch {\n" +
  "  padding: 10px 0 0 20px;\n" +
  "  border-left: 5px solid #EEE5D3;\n" +
  "}\n" +
  "\n" +
  "div.deprecated:before {\n" +
  "  content: 'Deprecated parts';\n" +
  "  float: right;\n" +
  "  display: block;\n" +
  "  padding: 2px 10px;\n" +
  "  background-image: -webkit-linear-gradient(top left, #FFFFFF 0%, #fffaba 100%);\n" +
  "  background-image: linear-gradient(to bottom right, #FFFFFF 0%, #fffaba 100%);\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "\n" +
  "div.deprecated {\n" +
  "  opacity: 0.6;\n" +
  "}\n" +
  "\n" +
  "table {\n" +
  "  border: 1px solid #ccc;\n" +
  "}\n" +
  "table code {\n" +
  "  background-color: transparent;\n" +
  "}\n" +
  "td, th {\n" +
  "  padding: 0.5em;\n" +
  "  vertical-align: top;\n" +
  "}\n" +
  "td {\n" +
  "  border-bottom: 1px solid #ddd;\n" +
  "}\n" +
  "tr:last-of-type td {\n" +
  "  border-bottom: none;\n" +
  "}\n" +
  "th {\n" +
  "  text-align: left;\n" +
  "  background-color: #eee;\n" +
  "}\n" +
  "/*\n" +
  "dt, dd {\n" +
  "  margin-top: 0;\n" +
  "  margin-bottom: 0;\n" +
  "}\n" +
  "dt {\n" +
  "  font-weight: bold;\n" +
  "}\n" +
  "dd {\n" +
  "  padding-bottom: 7px;\n" +
  "}\n" +
  "*/\n" +
  "div.algorithm {\n" +
  "  padding: 0 0 0 20px;\n" +
  "  border-left: 5px solid #EAF7F9;\n" +
  "}\n" +
  "pre {\n" +
  "  background-color: #eee;\n" +
  "  padding: 0.5em 1em 0.5em 1em;\n" +
  "  margin: 0;\n" +
  "  border: none;\n" +
  "}\n" +
  "code {\n" +
  "  background-color: #eee;\n" +
  "  font-family: 'Droid Sans Mono', monospace;\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "code > ins {\n" +
  "  background-color: #BBFFDF;\n" +
  "  text-decoration: none;\n" +
  "}\n" +
  "code > del {\n" +
  "  background-color: #FF979D;\n" +
  "}\n" +
  "nav > ol {\n" +
  "  font-size: 0.9em;\n" +
  "}\n" +
  "nav ol {\n" +
  "  font-weight: normal;\n" +
  "  padding-left:0;\n" +
  "  margin-left: 0;\n" +
  "}\n" +
  "\n" +
  "/* Browsers don't support ::marker or display:marker, so emulate it. */\n" +
  "nav li {\n" +
  "  list-style-type: none;\n" +
  "}\n" +
  "nav.marker { display: inline-block; }\n" +
  "nav li .marker { width: 1em; text-align: left; }\n" +
  "nav ol ol { margin-left: 1.75em; }\n" +
  "nav li li .marker { width: 2em; }\n" +
  "nav ol ol ol { margin-left: 2em; }\n" +
  "nav li li li .marker { width: 3em; }\n" +
  "nav ol ol ol ol { margin-left: 3em; }\n" +
  "nav li li li li .marker { width: 3.25em; }\n";
})();
