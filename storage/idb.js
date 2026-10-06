/**
 * IndexedDB helpers for ReadQuest book bodies.
 * DB name/store match v6 so existing pdf:{id} entries keep working.
 */
import {
  IDB_NAME,
  IDB_VERSION,
  IDB_STORE,
  IDB_STORE_SESSIONS,
  IDB_STORE_EVENTS,
  idbKeyPdf,
  idbKeyText,
} from './schema.js?v=20261006-1537';

function ensureStores(db) {
  if (!db.objectStoreNames.contains(IDB_STORE)) {
    db.createObjectStore(IDB_STORE);
  }
  if (!db.objectStoreNames.contains(IDB_STORE_SESSIONS)) {
    const store = db.createObjectStore(IDB_STORE_SESSIONS, {
      keyPath: 'id',
      autoIncrement: true,
    });
    store.createIndex('byDate', 'date', { unique: false });
    store.createIndex('byBookId', 'bookId', { unique: false });
  }
  if (!db.objectStoreNames.contains(IDB_STORE_EVENTS)) {
    const ev = db.createObjectStore(IDB_STORE_EVENTS, {
      keyPath: 'id',
      autoIncrement: true,
    });
    ev.createIndex('byDate', 'date', { unique: false });
    ev.createIndex('byBookId', 'bookId', { unique: false });
  }
}

function openDb() {
  return new Promise(function (res, rej) {
    const r = indexedDB.open(IDB_NAME, IDB_VERSION);
    r.onupgradeneeded = function () {
      ensureStores(r.result);
    };
    r.onsuccess = function () {
      res(r.result);
    };
    r.onerror = function () {
      rej(r.error);
    };
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE, mode);
    const store = tx.objectStore(IDB_STORE);
    let result;
    try {
      result = fn(store);
    } catch (e) {
      rej(e);
      return;
    }
    if (result && typeof result.onsuccess !== 'undefined') {
      result.onsuccess = function () {
        /* wait for tx */
      };
      result.onerror = function () {
        rej(result.error);
      };
      tx.oncomplete = function () {
        res(result.result);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
    } else {
      tx.oncomplete = function () {
        res(result);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
    }
  });
}

export async function put(key, value) {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = function () {
      res();
    };
    tx.onerror = function () {
      rej(tx.error);
    };
  });
}

export async function get(key) {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const g = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
    g.onsuccess = function () {
      res(g.result);
    };
    g.onerror = function () {
      rej(g.error);
    };
  });
}

export async function del(key) {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = function () {
      res();
    };
    tx.onerror = function () {
      rej(tx.error);
    };
  });
}

export async function putPdf(bookId, arrayBuffer) {
  return put(idbKeyPdf(bookId), arrayBuffer);
}

export async function getPdf(bookId) {
  return get(idbKeyPdf(bookId));
}

export async function delPdf(bookId) {
  return del(idbKeyPdf(bookId));
}

export async function putText(bookId, text) {
  return put(idbKeyText(bookId), text);
}

export async function getText(bookId) {
  return get(idbKeyText(bookId));
}

export async function delText(bookId) {
  return del(idbKeyText(bookId));
}

/** Remove all known body keys for a book id */
export async function delBookBodies(bookId) {
  await delPdf(bookId).catch(function () {});
  await delText(bookId).catch(function () {});
}

/**
 * Attach body onto a book meta object for the reader.
 * PDF → leaves text empty (reader uses getPdf).
 * Text formats → fills .text from IDB.
 */
export async function hydrateBook(book) {
  if (!book) return book;
  const b = Object.assign({}, book);
  if (b.type === 'pdf') {
    b.text = b.text || '';
    return b;
  }
  if (!b.text) {
    const t = await getText(b.id);
    if (typeof t === 'string') b.text = t;
  }
  return b;
}

export { openDb, idbKeyPdf, idbKeyText, withStore, ensureStores, IDB_STORE_SESSIONS };
