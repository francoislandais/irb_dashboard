import { mkdir, readdir } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportStandaloneApp } from "./exportStandaloneApp.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const defaultDatasetsDirectory = join(projectDirectory, "datasets");
const defaultOutputsDirectory = join(projectDirectory, "outputs");

export async function exportAllStandaloneApps(options = {}) {
  const datasetsDirectory = resolve(options.datasetsDirectory ?? defaultDatasetsDirectory);
  const outputsDirectory = resolve(options.outputsDirectory ?? defaultOutputsDirectory);

  await Promise.all([
    mkdir(datasetsDirectory, { recursive: true }),
    mkdir(outputsDirectory, { recursive: true })
  ]);

  const entries = await readdir(datasetsDirectory, { withFileTypes: true });
  const csvFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".csv")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }));

  const generatedFiles = [];
  for (const csvFileName of csvFiles) {
    const dataFilePath = join(datasetsDirectory, csvFileName);
    const dataFileStem = basename(csvFileName, extname(csvFileName));
    const outputPath = join(outputsDirectory, `Agora Explorer_${dataFileStem}.html`);
    generatedFiles.push(await exportStandaloneApp(dataFilePath, { outputPath }));
  }

  return {
    datasetsDirectory,
    outputsDirectory,
    csvCount: csvFiles.length,
    generatedFiles
  };
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsScript) {
  exportAllStandaloneApps()
    .then((result) => {
      if (result.csvCount === 0) {
        process.stdout.write(`Aucun fichier CSV trouvé dans ${result.datasetsDirectory}\n`);
        return;
      }
      process.stdout.write(`${result.csvCount} application(s) générée(s) dans ${result.outputsDirectory}\n`);
      result.generatedFiles.forEach((path) => process.stdout.write(`- ${path}\n`));
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
