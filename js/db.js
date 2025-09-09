// =============================
// 🔴 IndexedDB Setup + Fallback
// =============================
const DB_NAME = "linDB";
const DB_VERSION = 2; // versi dinaikkan biar objectStore lengkap
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB tidak tersedia, fallback ke localStorage");
      resolve(null);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      db = e.target.result;

      if (!db.objectStoreNames.contains("reminders")) {
        db.createObjectStore("reminders", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("schedules")) {
        db.createObjectStore("schedules", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("moods")) {
        db.createObjectStore("moods", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pet")) {
        db.createObjectStore("pet", { keyPath: "id" });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = (e) => {
      console.error("DB error:", e);
      reject(e);
    };
  });
}

function dbGetAll(store) {
  return new Promise((resolve) => {
    if (!db) { // fallback localStorage
      if (store === "pet") {
        const p = JSON.parse(localStorage.getItem("pet") || '{"streak":0,"lastActive":""}');
        resolve([p]);
      } else {
        resolve(JSON.parse(localStorage.getItem(store) || "[]"));
      }
      return;
    }
    const tx = db.transaction(store, "readonly");
    const os = tx.objectStore(store);
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

function dbSetAll(store, data) {
  return new Promise((resolve) => {
    if (!db) { // fallback localStorage
      if (store === "pet") {
        localStorage.setItem("pet", JSON.stringify(data[0] || { streak: 0, lastActive: "" }));
      } else {
        localStorage.setItem(store, JSON.stringify(data));
      }
      resolve();
      return;
    }
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    os.clear();
    (data || []).forEach((item) => os.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export { openDB, dbGetAll, dbSetAll };

