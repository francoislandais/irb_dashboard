import assert from "node:assert/strict";
import { readResponseTextWithProgress } from "../app/src/data/core/downloadProgress.js";

const encoded = new TextEncoder().encode("Euro: €");
const chunks = [encoded.slice(0, 7), encoded.slice(7, 8), encoded.slice(8)];
const response = new Response(new ReadableStream({
  start(controller) {
    chunks.forEach((chunk) => controller.enqueue(chunk));
    controller.close();
  }
}), { headers: { "content-length": String(encoded.byteLength) } });
const updates = [];
assert.equal(await readResponseTextWithProgress(response, (update) => updates.push(update)), "Euro: €");
assert.deepEqual(updates.map(({ loaded }) => loaded), [0, 7, 8, encoded.byteLength, encoded.byteLength]);
assert.ok(updates.every(({ total }) => total === encoded.byteLength));
assert.equal(updates.at(-1).done, true);

const compressedHeaders = new Response("abc", { headers: {
  "content-length": "2",
  "content-encoding": "gzip"
} });
const unknownLength = [];
assert.equal(await readResponseTextWithProgress(compressedHeaders, (update) => unknownLength.push(update)), "abc");
assert.ok(unknownLength.every(({ total }) => total === 0));

assert.equal(await readResponseTextWithProgress(new Response("fallback")), "fallback");
console.log("PASS: startup download reports streamed bytes and avoids false percentages for encoded responses.");
