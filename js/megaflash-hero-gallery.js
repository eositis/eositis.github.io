(function () {
  var root = document.querySelector("[data-hero-gallery]");
  if (!root) return;

  function initCarousel(rootEl) {
    var slides = rootEl.querySelectorAll(".hero__gallery-slide");
    if (slides.length < 2) return;
    var i = 0;
    var ms = parseInt(rootEl.getAttribute("data-interval"), 10) || 5500;
    function next() {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    }
    setInterval(next, ms);
  }

  /** Encode each path segment so spaces and special chars resolve correctly on the server. */
  function fileToUrl(file, baseUrl) {
    var parts = file.split("/").map(function (seg) {
      return encodeURIComponent(seg);
    });
    return new URL(parts.join("/"), baseUrl).href;
  }

  function buildSlides(data) {
    var items = data && Array.isArray(data.items) ? data.items : [];
    var manifestHref =
      root.getAttribute("data-gallery-manifest") || "gallery/megaflash/manifest.json";
    var manifestUrl = new URL(manifestHref, window.location.href);
    var baseUrl = new URL("./", manifestUrl);

    var windowEl = root.querySelector(".hero__gallery-window");
    if (!windowEl) return;

    windowEl.innerHTML = "";

    var isFirst = true;
    items.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var src =
        typeof item.src === "string" && item.src.length
          ? item.src
          : typeof item.file === "string" && item.file.length
            ? fileToUrl(item.file, baseUrl)
            : "";
      if (!src) return;

      var img = document.createElement("img");
      img.className = "hero__gallery-slide";
      if (isFirst) img.classList.add("is-active");
      img.src = src;
      img.alt = typeof item.alt === "string" ? item.alt : "";
      img.loading = isFirst ? "eager" : "lazy";
      img.decoding = "async";
      windowEl.appendChild(img);
      isFirst = false;
    });

    initCarousel(root);
  }

  function loadManifest() {
    var inline = document.getElementById("megaflash-gallery-manifest");
    if (inline) {
      var text = (inline.textContent || "").trim();
      if (text) {
        try {
          buildSlides(JSON.parse(text));
          return;
        } catch (e) {
          /* fall through to fetch */
        }
      }
    }

    var manifestHref = root.getAttribute("data-gallery-manifest");
    if (!manifestHref) {
      initCarousel(root);
      return;
    }

    var manifestUrl = new URL(manifestHref, window.location.href);
    fetch(manifestUrl.href)
      .then(function (res) {
        if (!res.ok) throw new Error("manifest " + res.status);
        return res.json();
      })
      .then(buildSlides)
      .catch(function () {
        initCarousel(root);
      });
  }

  loadManifest();
})();
