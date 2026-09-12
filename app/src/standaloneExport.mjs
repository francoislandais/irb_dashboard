export function getStandaloneModuleDependencies(fromPath, source) {
  const dependencies = new Set();
  [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ].forEach((pattern) => {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const dependencyPath = resolveStandaloneModulePath(fromPath, match[1]);
      if (dependencyPath) dependencies.add(dependencyPath);
    }
  });
  return [...dependencies];
}

export function resolveStandaloneModulePath(fromPath, specifier) {
  const cleanSpecifier = String(specifier ?? "").split("?")[0].split("#")[0];
  if (!cleanSpecifier.startsWith(".")) return "";
  return new URL(cleanSpecifier, `https://standalone.local/${fromPath}`).pathname.slice(1);
}

export async function buildStandaloneHtml(bundle, activeDataset) {
  const appMarkup = extractAppMarkup(bundle.indexHtml);
  const compressedCsv = await compressStandaloneCsv(activeDataset.csvText);
  const compressedBundle = await compressStandaloneText(JSON.stringify(bundle));
  const standalonePayload = {
    csvCompression: "gzip-base64",
    csvBase64: compressedCsv.base64,
    csvByteLength: compressedCsv.originalByteLength,
    fileName: activeDataset.fileName || "embedded-data.csv",
    loadedAt: new Date().toISOString()
  };

  return `<!doctype html>
<html lang="fr" data-standalone="true">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Agora Explorer portable</title>
    <style>
${bundle.stylesCss}
    </style>
  </head>
  <body>
${appMarkup}
    <script>
${escapeInlineScriptSource(bundle.highchartsJs ?? "")}
    </script>
    <script>
${escapeInlineScriptSource(bundle.highchartsTreemapJs ?? "")}
    </script>
    <script>
window.__AGORA_STANDALONE_DATA__ = ${serializeForInlineScript(standalonePayload)};
window.__AGORA_STANDALONE_BUNDLE_GZIP__ = ${serializeForInlineScript(compressedBundle.base64)};
    </script>
    <script type="module">
setStartupStage("decompressing");
const bundle = JSON.parse(await decompressStandaloneText(window.__AGORA_STANDALONE_BUNDLE_GZIP__));
window.__AGORA_STANDALONE_BUNDLE__ = bundle;
const moduleUrls = new Map();
const nativeFetch = window.fetch.bind(window);

function setStartupStage(activeStage) {
  const labels = {
    downloading: "Downloading...",
    decompressing: "Decompressing...",
    indexing: "Indexing..."
  };
  const status = document.querySelector("#startup-stage");
  if (status && labels[activeStage]) status.textContent = labels[activeStage];
}

async function decompressStandaloneText(base64) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Ce navigateur ne permet pas de décompresser cette application portable.");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

window.fetch = async (resource, options) => {
  const url = typeof resource === "string" ? resource : resource?.url ?? "";
  const assetKey = Object.keys(bundle.assets).find((key) => url.includes(key) || url.endsWith(key.split("/").at(-1)));
  if (assetKey) {
    return new Response(bundle.assets[assetKey], {
      headers: { "content-type": "text/csv;charset=utf-8" },
      status: 200
    });
  }
  return nativeFetch(resource, options);
};

function getModuleUrl(path) {
  if (moduleUrls.has(path)) return moduleUrls.get(path);
  const source = bundle.moduleSources[path];
  if (!source) throw new Error(\`Module introuvable dans le fichier portable: \${path}\`);

  const transformed = source
    .replace(/(\\bfrom\\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return \`\${prefix}\${getModuleUrl(resolveModulePath(path, specifier))}\${suffix}\`;
    })
    .replace(/(\\bimport\\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return \`\${prefix}\${getModuleUrl(resolveModulePath(path, specifier))}\${suffix}\`;
    })
    .replace(/(\\bimport\\s*\\(\\s*["'])([^"']+)(["']\\s*\\))/g, (match, prefix, specifier, suffix) => {
      return \`\${prefix}\${getModuleUrl(resolveModulePath(path, specifier))}\${suffix}\`;
    });

  const url = URL.createObjectURL(new Blob([transformed], { type: "text/javascript;charset=utf-8" }));
  moduleUrls.set(path, url);
  return url;
}

function resolveModulePath(fromPath, specifier) {
  const cleanSpecifier = specifier.split("?")[0].split("#")[0];
  if (!cleanSpecifier.startsWith(".")) return cleanSpecifier;
  return new URL(cleanSpecifier, \`https://standalone.local/\${fromPath}\`).pathname.slice(1);
}

await import(getModuleUrl("src/main.js"));
    </script>
  </body>
</html>`;
}

export async function compressStandaloneCsv(csvText) {
  return compressStandaloneText(csvText);
}

export async function compressStandaloneText(text) {
  if (typeof CompressionStream !== "function") {
    throw new Error("Ce navigateur ne prend pas en charge la compression nécessaire à l’export portable.");
  }
  const source = new TextEncoder().encode(String(text ?? ""));
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return {
    base64: uint8ArrayToBase64(compressed),
    originalByteLength: source.byteLength
  };
}

function uint8ArrayToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function escapeInlineScriptSource(source) {
  return String(source).replace(/<\/script/gi, "<\\/script");
}

export function extractAppMarkup(indexHtml) {
  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    throw new Error("Impossible de préparer l'export portable : structure HTML non reconnue.");
  }

  return bodyMatch[1]
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "")
    .trim();
}
