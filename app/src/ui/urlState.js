const FILE_URL_STATE_PREFIX = "agora?";

export function readUrlStateParams() {
  const hashState = window.location.hash.slice(1);
  if (window.location.protocol === "file:" && hashState.startsWith(FILE_URL_STATE_PREFIX)) {
    return new URLSearchParams(hashState.slice(FILE_URL_STATE_PREFIX.length));
  }
  return new URLSearchParams(window.location.search);
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
