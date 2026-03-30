(function () {
  var CONFIG_URL = new URL("data/megaflash-docs.json", window.location.href).href;

  function loadConfig() {
    return fetch(CONFIG_URL).then(function (r) {
      if (!r.ok) throw new Error("config");
      return r.json();
    });
  }

  function rawUrlFromFile(cfg, fileName) {
    var parts = String(cfg.repo || "").split("/");
    var owner = parts[0];
    var repo = parts[1];
    if (!owner || !repo) throw new Error("bad repo");
    var pathSegs = String(cfg.docsPath || "docs")
      .replace(/\/+/g, "/")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return (
      "https://raw.githubusercontent.com/" +
      owner +
      "/" +
      repo +
      "/" +
      encodeURIComponent(cfg.branch) +
      "/" +
      pathSegs +
      "/" +
      encodeURIComponent(fileName)
    );
  }

  function githubBlobUrlFromFile(cfg, fileName) {
    var parts = String(cfg.repo || "").split("/");
    var owner = parts[0];
    var repo = parts[1];
    if (!owner || !repo) throw new Error("bad repo");
    var dir = String(cfg.docsPath || "docs").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    return (
      "https://github.com/" +
      owner +
      "/" +
      repo +
      "/blob/" +
      encodeURIComponent(cfg.branch) +
      "/" +
      dir.split("/").map(encodeURIComponent).join("/") +
      "/" +
      encodeURIComponent(fileName)
    );
  }

  /**
   * Doc listing cannot use api.github.com from a browser (CORS). We load
   * docs/web-docs-index.json from raw.githubusercontent.com (same CORS as .md),
   * then fall back to same-origin data/megaflash-doc-files.json.
   */
  function loadDocFileList(cfg) {
    var remote = rawUrlFromFile(cfg, "web-docs-index.json");
    return fetch(remote)
      .then(function (r) {
        if (!r.ok) return Promise.reject(new Error("remote index"));
        return r.json();
      })
      .then(function (data) {
        if (data && Array.isArray(data.files) && data.files.length) return data.files;
        return Promise.reject(new Error("empty remote index"));
      })
      .catch(function () {
        return fetch(new URL("data/megaflash-doc-files.json", window.location.href)).then(function (r2) {
          if (!r2.ok) throw new Error("fallback list");
          return r2.json();
        }).then(function (d2) {
          var files = d2 && Array.isArray(d2.files) ? d2.files : [];
          if (!files.length) throw new Error("empty fallback list");
          return files;
        });
      })
      .then(function (files) {
        files = files.filter(function (f) {
          return typeof f === "string" && /\.md$/i.test(f) && !/^\./.test(f);
        });
        if (!files.length) throw new Error("no md files");
        files.sort(function (a, b) {
          return a.localeCompare(b, undefined, { sensitivity: "base" });
        });
        return files;
      });
  }

  function humanizeFileName(fileName) {
    var base = fileName.replace(/\.md$/i, "");
    return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function extractTitle(md) {
    var lines = String(md).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^#\s+(.+)$/);
      if (m) return m[1].trim();
    }
    return "";
  }

  function extractSummary(md) {
    var lines = String(md).split(/\r?\n/);
    var i = 0;
    if (lines[0] && /^#\s/.test(lines[0])) i = 1;
    while (i < lines.length && !String(lines[i]).trim()) i++;
    var buf = [];
    while (i < lines.length && String(lines[i]).trim() && !/^#/.test(lines[i])) {
      buf.push(String(lines[i]).trim());
      i++;
    }
    var s = buf.join(" ").replace(/\s+/g, " ");
    if (s.length > 280) s = s.slice(0, 277) + "…";
    return s;
  }

  /** Strip leading # heading so the page title + rendered body do not duplicate the first H1. */
  function stripLeadingH1(md) {
    return String(md).replace(/^#\s+[^\r\n]+(?:\r?\n)*/, "");
  }

  function fileNameFromDocParam(id) {
    if (!id || typeof id !== "string") return null;
    try {
      id = decodeURIComponent(id.trim());
    } catch (e) {
      return null;
    }
    if (!id) return null;
    if (id.indexOf("/") !== -1 || id.indexOf("\\") !== -1 || id.indexOf("..") !== -1) return null;
    var name = id;
    if (!/\.md$/i.test(name)) name += ".md";
    if (!/^[^/\\]+\.md$/i.test(name) || name.length > 220) return null;
    return name;
  }

  function initIndex() {
    var list = document.getElementById("doc-list");
    if (!list) return;

    loadConfig()
      .then(function (cfg) {
        return loadDocFileList(cfg).then(function (fileNames) {
          return Promise.all(
            fileNames.map(function (name) {
              var raw = rawUrlFromFile(cfg, name);
              return fetch(raw)
                .then(function (r) {
                  if (!r.ok) throw new Error("raw");
                  return r.text();
                })
                .then(function (text) {
                  var title = extractTitle(text) || humanizeFileName(name);
                  var summary = extractSummary(text);
                  if (!summary) {
                    summary = "Latest Markdown from the MegaFlash repository on GitHub.";
                  }
                  return {
                    id: String(name).replace(/\.md$/i, ""),
                    title: title,
                    summary: summary,
                  };
                })
                .catch(function () {
                  return {
                    id: String(name).replace(/\.md$/i, ""),
                    title: humanizeFileName(name),
                    summary: "Latest Markdown from the MegaFlash repository on GitHub.",
                  };
                });
            })
          );
        });
      })
      .then(function (items) {
        list.innerHTML = "";
        items.forEach(function (d) {
          var a = document.createElement("a");
          a.className = "doc-card";
          a.href = "megaflash-doc.html?doc=" + encodeURIComponent(d.id);
          var h2 = document.createElement("h2");
          h2.textContent = d.title || d.id;
          var p = document.createElement("p");
          p.textContent = d.summary || "";
          a.appendChild(h2);
          a.appendChild(p);
          list.appendChild(a);
        });
      })
      .catch(function () {
        list.innerHTML = "";
        var p = document.createElement("p");
        p.className = "doc-error";
        p.textContent =
          "Could not load the documentation list. Check your connection, or open the docs folder on GitHub.";
        list.appendChild(p);
      });
  }

  function initViewer() {
    var params = new URLSearchParams(window.location.search);
    var rawId = params.get("doc");
    if (!rawId) {
      window.location.replace("megaflash-docs.html");
      return;
    }

    var body = document.getElementById("doc-body");
    var err = document.getElementById("doc-error");
    var source = document.getElementById("doc-source-link");
    if (!body) return;

    if (err) {
      err.hidden = true;
      err.textContent = "";
    }

    var fileName = fileNameFromDocParam(rawId);
    if (!fileName) {
      document.title = "Document not found — MegaFlash docs · Ositis Electronics";
      var titleEl = document.getElementById("doc-page-title");
      if (titleEl) titleEl.textContent = "Not found";
      var bc = document.getElementById("doc-breadcrumb-current");
      if (bc) bc.textContent = "Not found";
      if (source) source.hidden = true;
      if (err) {
        err.hidden = false;
        err.textContent =
          "Invalid document name. Return to the index and pick a topic from the list.";
      }
      body.setAttribute("aria-busy", "false");
      return;
    }

    loadConfig()
      .then(function (cfg) {
        var raw = rawUrlFromFile(cfg, fileName);
        if (source) {
          source.href = githubBlobUrlFromFile(cfg, fileName);
          source.hidden = false;
        }

        return fetch(raw)
          .then(function (r) {
            if (!r.ok) throw new Error("raw");
            return r.text();
          })
          .then(function (md) {
            if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
              throw new Error("libs");
            }
            var pageTitle = extractTitle(md) || humanizeFileName(fileName);
            document.title = pageTitle + " — MegaFlash docs · Ositis Electronics";
            var titleEl = document.getElementById("doc-page-title");
            if (titleEl) titleEl.textContent = pageTitle;
            var bc = document.getElementById("doc-breadcrumb-current");
            if (bc) bc.textContent = pageTitle;

            var bodyMd = stripLeadingH1(md);
            var html = marked.parse(bodyMd, { mangle: false, headerIds: true });
            body.innerHTML = DOMPurify.sanitize(html);
            body.setAttribute("aria-busy", "false");
          });
      })
      .catch(function () {
        var titleEl = document.getElementById("doc-page-title");
        if (titleEl && titleEl.textContent === "Loading…") {
          document.title = "Error — MegaFlash docs · Ositis Electronics";
          titleEl.textContent = "Could not load";
          var bc = document.getElementById("doc-breadcrumb-current");
          if (bc) bc.textContent = "Error";
        }
        if (err) {
          err.hidden = false;
          err.textContent =
            "Could not load this document from GitHub. Try again later, or open the Markdown source on GitHub using the link above.";
        }
        body.innerHTML = "";
        body.setAttribute("aria-busy", "false");
      });
  }

  if (document.body && document.body.dataset.page === "megaflash-docs-index") {
    initIndex();
  } else if (document.body && document.body.dataset.page === "megaflash-doc") {
    initViewer();
  }
})();
