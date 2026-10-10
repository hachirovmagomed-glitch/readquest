/**
 * Thin adapter: expose v6-like S / save() / SET / saveSet() using the new storage.
 * Drop into a future modular app; not auto-wired into v6.html (left intact).
 *
 * Example boot:
 *   import { createAdapter } from './storage/adapter.js?v=20261010-1150';
 *   const api = await createAdapter();
 *   // api.S, api.save(), api.SET, api.saveSet(), api.getBookText(id)
 */
import {
  bootStorage,
  saveEnvelope,
  saveSettings,
  loadEnvelope,
  upsertUserBook,
  removeUserBook,
  stripBookBody,
  mergeFlat,
  idb,
  logSession,
  listSessions,
  logReadingEvent,
  listReadingEvents,
  logAnalyticsEvent,
} from './index.js?v=20261010-1150';

export async function createAdapter(opts) {
  const boot = await bootStorage(opts);
  let envelope = boot.envelope;
  let SET = boot.settings;

  function syncFlat() {
    return mergeFlat(envelope);
  }

  let S = syncFlat();

  function pullFromS() {
    // Rebuild envelope domains from mutated flat S
    const flat = S;
    envelope = {
      schemaVersion: envelope.schemaVersion,
      progress: Object.assign({}, envelope.progress),
      game: Object.assign({}, envelope.game),
      library: Object.assign({}, envelope.library),
    };
    // Shallow copy known keys back — saveFlat does proper split
  }

  async function save() {
    // Persist via saveFlat: envelope only (bodies are written once by addBook → upsertUserBook)
    const { saveFlat } = await import('./state.js?v=20261010-1150');
    const r = await saveFlat(S);
    envelope = loadEnvelope();
    S = syncFlat();
    // Re-attach in-memory text if reader already loaded it
    return r;
  }

  function saveSet() {
    return saveSettings(SET);
  }

  async function getBookText(id) {
    return idb.getText(id);
  }

  async function getBookPdf(id) {
    return idb.getPdf(id);
  }

  async function addBook(book, body) {
    const r = await upsertUserBook(envelope, book, body);
    envelope = r.envelope;
    S = syncFlat();
    return r;
  }

  async function deleteBook(id, wipeFile) {
    const r = await removeUserBook(envelope, id, wipeFile);
    envelope = r.envelope;
    // also clear progress keys on flat
    if (S.progress) delete S.progress[id];
    envelope = loadEnvelope();
    S = syncFlat();
    return r;
  }

  return {
    migration: boot.migration,
    get S() {
      return S;
    },
    set S(v) {
      S = v;
    },
    get SET() {
      return SET;
    },
    set SET(v) {
      SET = v;
    },
    get envelope() {
      return envelope;
    },
    save,
    saveSet,
    getBookText,
    getBookPdf,
    addBook,
    deleteBook,
    stripBookBody,
    /** Architect: sessions[] {date, bookId, minutes, pageTurns} */
    logSession,
    listSessions,
    /** Reader writes pageVisibleMs; game only reads */
    logReadingEvent,
    listReadingEvents,
    logAnalyticsEvent,
    reload() {
      envelope = loadEnvelope();
      S = syncFlat();
      return S;
    },
  };
}
