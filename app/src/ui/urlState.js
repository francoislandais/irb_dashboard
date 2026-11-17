const FILE_URL_STATE_PREFIX = "agora?";

export function readUrlStateParams() {
  const hashState = window.location.hash.slice(1);
  const params = new URLSearchParams(window.location.protocol === "file:" ? "" : window.location.search);
  if (hashState.startsWith(FILE_URL_STATE_PREFIX)) {
    for (const [key, value] of new URLSearchParams(hashState.slice(FILE_URL_STATE_PREFIX.length))) {
      params.set(key, value);
    }
  }
  return params;
}

export function createUrlState() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = readUrlStateParams().toString();
  return url;
}

export function replaceUrlState(url) {
  if (window.location.protocol === "file:") {
    const parameters = url.searchParams.toString();
    window.history.replaceState({}, "", `#${FILE_URL_STATE_PREFIX}${parameters}`);
    return;
  }
  window.history.replaceState({}, "", url);
}
