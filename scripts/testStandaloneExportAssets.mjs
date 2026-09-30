import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTaxonomyDimensionData } from "../app/src/data/taxonomyDimensionData.js";
import { buildStandaloneBundle } from "./exportStandaloneApp.mjs";

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../app");
const bundle = await buildStandaloneBundle(appDirectory);
const requestedAssets = new Set(
  Object.values(bundle.moduleSources).flatMap((source) =>
    [...source.matchAll(/(?:\.\/)?assets\/[A-Za-z0-9_.-]+\.csv/g)]
      .map(([match]) => match.replace(/^\.\//, ""))
  )
);

assert.ok(requestedAssets.has("assets/ITS_template_taxonomy_history.csv"));
for (const asset of requestedAssets) {
  assert.equal(bundle.assets[asset], await readFile(resolve(appDirectory, asset), "utf8"), asset);
}
globalThis.fetch = async (resource) => {
  const asset = String(resource).replace(/^\.\//, "");
  if (!(asset in bundle.assets)) return new Response("", { status: 404 });
  return new Response(bundle.assets[asset], { status: 200 });
};
const taxonomy = await loadTaxonomyDimensionData({}, { referenceDate: "2026-06-30" });
assert.equal(taxonomy.selectedTaxonomiesByTemplate["C_01.00"], "4.2");
assert.equal(taxonomy.dimensionMapping.find("C_01.00", "x_axis_rc_code", "0010")?.description, "Amount");
assert.equal(taxonomy.dimensionMapping.find("C_01.00", "y_axis_rc_code", "0010")?.description, "Own funds");
process.stdout.write(`${requestedAssets.size} portable CSV assets verified\n`);
