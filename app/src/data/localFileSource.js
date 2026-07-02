const DB_NAME = "local-csv-app";
const DB_VERSION = 1;
const STORE_NAME = "file-handles";
const HANDLE_KEY = "primary-csv";

export function isFileSystemAccessSupported() {
  return "showOpenFilePicker" in window && "indexedDB" in window;
}

export async function openCsvFile() {
  if (isFileSystemAccessSupported()) {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Fichiers CSV",
          accept: {
            "text/csv": [".csv"],
            "text/plain": [".csv"]
          }
        }
      ]
    });

    const file = await readFileFromHandle(handle);
    return { kind: "persistent", handle, file };
  }

  const file = await chooseFileWithInput();
  return file ? { kind: "temporary", file } : null;
}

export async function readFileFromHandle(handle, { requestPermission = true } = {}) {
  if (!handle) {
    throw new Error("Aucun fichier mémorisé.");
  }

  const permission = await ensureReadPermission(handle, requestPermission);
  if (!permission) {
    throw new Error("Le navigateur demande une nouvelle autorisation pour lire ce fichier.");
  }

  return handle.getFile();
}

export async function hasReadPermission(handle) {
  return (await handle.queryPermission({ mode: "read" })) === "granted";
}

export async function storeFileHandle(handle) {
  if (!isFileSystemAccessSupported()) return;
  const db = await openDb();
  await putValue(db, HANDLE_KEY, handle);
  db.close();
}

export async function getStoredFileHandle() {
  if (!isFileSystemAccessSupported()) return null;
  const db = await openDb();
  const handle = await getValue(db, HANDLE_KEY);
  db.close();
  return handle ?? null;
}

export async function clearStoredFileHandle() {
  if (!("indexedDB" in window)) return;
  const db = await openDb();
  await deleteValue(db, HANDLE_KEY);
  db.close();
}

async function ensureReadPermission(handle, requestPermission) {
  const options = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  if (!requestPermission) return false;
  return (await handle.requestPermission(options)) === "granted";
}

function chooseFileWithInput() {
  return new Promise((resolve) => {
    const input = document.querySelector("#fallback-file-input");
    input.value = "";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putValue(db, key, value) {
  return runStoreOperation(db, "readwrite", (store) => store.put(value, key));
}

function getValue(db, key) {
  return runStoreOperation(db, "readonly", (store) => store.get(key));
}

function deleteValue(db, key) {
  return runStoreOperation(db, "readwrite", (store) => store.delete(key));
}

function runStoreOperation(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
