(() => {
  const script = document.currentScript;
  const configuredEndpoint = script ? script.getAttribute("data-endpoint") : "";
  const endpoint = configuredEndpoint || window.HIT_LOGGER_ENDPOINT || "";

  if (!endpoint) {
    return;
  }

  const storageKey = "ositis_anon_user_id";
  let anonUserId = localStorage.getItem(storageKey);
  if (!anonUserId) {
    anonUserId =
      (window.crypto && "randomUUID" in window.crypto && window.crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, anonUserId);
  }

  const payload = {
    event: "pageview",
    page: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || "",
    userAgent: navigator.userAgent,
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: `${window.screen.width}x${window.screen.height}`,
    anonUserId,
    clientTimestamp: new Date().toISOString()
  };

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
})();
