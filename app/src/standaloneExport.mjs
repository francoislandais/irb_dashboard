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

export function buildStandaloneHtml(bundle, activeDataset) {
  const appMarkup = extractAppMarkup(bundle.indexHtml);
  const standalonePayload = {
    csvText: activeDataset.csvText,
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
window.__AGORA_STANDALONE_BUNDLE__ = ${serializeForInlineScript(bundle)};
    </script>
    <script type="module">
const bundle = window.__AGORA_STANDALONE_BUNDLE__;
const moduleUrls = new Map();
const nativeFetch = window.fetch.bind(window);

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
