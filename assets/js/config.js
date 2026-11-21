(() => {
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  window.API_BASE = isLocal
    ? "http://127.0.0.1:8000"
    : "https://archive-aph.onrender.com";
})();
