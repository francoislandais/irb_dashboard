// Content-Length is usable only when it describes the bytes exposed by the
// response stream. Browsers decode compressed responses before exposing them.
export async function readResponseTextWithProgress(response, onProgress) {
  if (!onProgress || !response.body?.getReader) return response.text();

  const encoded = Boolean(response.headers?.get("content-encoding"));
  const declaredLength = Number(response.headers?.get("content-length"));
  let total = !encoded && Number.isSafeInteger(declaredLength) && declaredLength > 0
    ? declaredLength
    : 0;
  let loaded = 0;
  const chunks = [];
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  onProgress({ loaded, total, done: false });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      if (total && loaded > total) total = 0;
      chunks.push(decoder.decode(value, { stream: true }));
      onProgress({ loaded, total, done: false });
    }
    chunks.push(decoder.decode());
    onProgress({ loaded, total, done: true });
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}
