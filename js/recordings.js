// 家長錄的發音：存在這台裝置的 IndexedDB 裡
const DB_NAME = 'linlin-recordings';
const STORE = 'clips';

// key -> object URL，啟動時先全部載入，播放時就不用等
const urls = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const result = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(result?.result);
        t.onerror = () => reject(t.error);
      })
  );
}

export async function loadAll() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve();
        urls.set(cur.key, URL.createObjectURL(cur.value));
        cur.continue();
      };
      req.onerror = () => resolve();
    });
  } catch {}
}

export const urlFor = (key) => urls.get(key) || null;
export const has = (key) => urls.has(key);
export const count = () => urls.size;

export async function save(key, blob) {
  await tx('readwrite', (s) => s.put(blob, key));
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  urls.set(key, URL.createObjectURL(blob));
}

export async function remove(key) {
  await tx('readwrite', (s) => s.delete(key));
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  urls.delete(key);
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

// 備份用：把所有錄音轉成文字
export async function exportAll() {
  const out = {};
  for (const [key, url] of urls) {
    out[key] = await blobToDataUrl(await (await fetch(url)).blob());
  }
  return out;
}

export async function importAll(data) {
  for (const [key, dataUrl] of Object.entries(data || {})) {
    await save(key, await (await fetch(dataUrl)).blob());
  }
}

// ---------- 錄音 ----------

let recorder = null;
let chunks = [];
let stream = null;

export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

export async function startRecording() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder) return resolve(null);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' });
      recorder = null;
      resolve(blob.size ? blob : null);
    };
    recorder.stop();
  });
}

export const isRecording = () => !!recorder;
