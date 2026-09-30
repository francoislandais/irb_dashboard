import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildStandaloneHtml,
  getStandaloneModuleDependencies
} from "../app/src/standaloneExport.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = resolve(scriptDirectory, "../app");

export async function exportStandaloneApp(dataFilePath, options = {}) {
  if (!dataFilePath || typeof dataFilePath !== "string") {
    throw new TypeError("dataFilePath doit être le chemin d'un fichier CSV.");
  }

  const appDirectory = resolve(options.appDirectory ?? defaultAppDirectory);
  const absoluteDataPath = resolve(dataFilePath);
  const csvText = await readFile(absoluteDataPath, "utf8");
  if (!csvText.trim()) throw new Error(`Le fichier de données est vide : ${absoluteDataPath}`);
  const institutionDictionaryCsvText = options.institutionDictionaryFilePath
    ? await readFile(resolve(options.institutionDictionaryFilePath), "utf8")
    : "";
  if (options.institutionDictionaryFilePath && !institutionDictionaryCsvText.trim()) {
    throw new Error(`Le dictionnaire des institutions est vide : ${options.institutionDictionaryFilePath}`);
  }

  const bundle = await buildStandaloneBundle(appDirectory);
  const html = await buildStandaloneHtml(bundle, {
    csvText,
    fileName: basename(absoluteDataPath),
    institutionDictionaryCsvText,
    institutionDictionaryFileName: options.institutionDictionaryFilePath
      ? basename(options.institutionDictionaryFilePath)
      : ""
  });
  const outputPath = resolveOutputPath(options.outputPath, absoluteDataPath);
  await writeFile(outputPath, html, "utf8");
  return outputPath;
}

export async function buildStandaloneBundle(appDirectory) {
  const readAppText = (relativePath) => readFile(join(appDirectory, relativePath), "utf8");
  const [indexHtml, stylesCss, creditRiskStylesCss, mappingCsv, taxonomyHistoryCsv, impossibleCombinationsCsv, defaultExpandDepthCsv, templateGroupsCsv, kriDictionaryCsv, highchartsJs, highchartsTreemapJs, moduleSources] = await Promise.all([
    readAppText("index.html"),
    readAppText("src/styles.css"),
    readAppText("src/creditRiskStyles.css"),
    readAppText("assets/ITS_all_dimension_mapping.csv"),
    readAppText("assets/ITS_template_taxonomy_history.csv"),
    readAppText("assets/ITS_impossible_x_y.csv"),
    readAppText("assets/ITS_explorer_default_expand_depth.csv"),
    readAppText("assets/ITS_explorer_template_groups.csv"),
    readAppText("assets/KRI_dictionnary.csv"),
    readAppText("vendor/highcharts.js"),
    readAppText("vendor/highcharts-treemap.js"),
    collectModuleSources("src/main.js", readAppText)
  ]);

  return {
    assets: {
      "assets/ITS_all_dimension_mapping.csv": mappingCsv,
      "assets/ITS_template_taxonomy_history.csv": taxonomyHistoryCsv,
      "assets/ITS_impossible_x_y.csv": impossibleCombinationsCsv,
      "assets/ITS_explorer_default_expand_depth.csv": defaultExpandDepthCsv,
      "assets/ITS_explorer_template_groups.csv": templateGroupsCsv,
      "assets/KRI_dictionnary.csv": kriDictionaryCsv
    },
    highchartsJs,
    highchartsTreemapJs,
    indexHtml,
    moduleSources,
    stylesCss: `${stylesCss}\n${creditRiskStylesCss}`
  };
}

async function collectModuleSources(entryPath, readAppText) {
  const sources = new Map();
  await collectModuleSource(entryPath, sources, readAppText);
  return Object.fromEntries(sources);
}

async function collectModuleSource(path, sources, readAppText) {
  if (sources.has(path)) return;
  const source = await readAppText(path);
  sources.set(path, source);
  const dependencies = getStandaloneModuleDependencies(path, source);
  await Promise.all(dependencies.map((dependencyPath) => collectModuleSource(dependencyPath, sources, readAppText)));
}

function resolveOutputPath(outputPath, dataFilePath) {
  if (outputPath) return isAbsolute(outputPath) ? outputPath : resolve(outputPath);
  const safeName = basename(dataFilePath)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-");
  return resolve(`agora-explorer-${safeName || "portable"}.html`);
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsScript) {
  exportStandaloneApp(process.argv[2])
    .then((outputPath) => process.stdout.write(`${outputPath}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
