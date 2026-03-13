const DB_NAME = 'vibe-news-storage';
const STORE_NAME = 'settings';
const DIR_HANDLE_KEY = 'saveDirHandle';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putToDB(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cachedDirHandle = null;

export function isFileSystemAccessSupported() {
  return typeof window.showDirectoryPicker === 'function';
}

export async function pickSaveDirectory() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  cachedDirHandle = handle;
  await putToDB(DIR_HANDLE_KEY, handle);
  return handle.name;
}

export async function restoreSaveDirectory() {
  try {
    const handle = await getFromDB(DIR_HANDLE_KEY);
    if (!handle) return null;

    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      cachedDirHandle = handle;
      return handle.name;
    }

    return null;
  } catch {
    return null;
  }
}

export async function requestSaveDirectoryPermission() {
  try {
    const handle = await getFromDB(DIR_HANDLE_KEY);
    if (!handle) return null;

    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      cachedDirHandle = handle;
      return handle.name;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearSaveDirectory() {
  cachedDirHandle = null;
  await deleteFromDB(DIR_HANDLE_KEY);
}

export function hasSaveDirectory() {
  return cachedDirHandle !== null;
}

export function getSaveDirectoryName() {
  return cachedDirHandle?.name || null;
}

function formatDateDir(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatTimeDir(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}${min}${s}`;
}

async function getOrCreateSubDir(parentHandle, name) {
  return await parentHandle.getDirectoryHandle(name, { create: true });
}

export async function saveFile(reportTimestamp, filename, content) {
  if (!cachedDirHandle) return false;

  try {
    const dateStr = formatDateDir(reportTimestamp);
    const timeStr = formatTimeDir(reportTimestamp);

    const dateDir = await getOrCreateSubDir(cachedDirHandle, dateStr);
    const sessionDir = await getOrCreateSubDir(dateDir, timeStr);

    const fileHandle = await sessionDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();

    if (content instanceof Blob) {
      await writable.write(content);
    } else {
      await writable.write(new Blob([content], { type: 'text/plain; charset=utf-8' }));
    }

    await writable.close();
    return true;
  } catch (err) {
    console.error('ファイル保存エラー:', err);
    return false;
  }
}
