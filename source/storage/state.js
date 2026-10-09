/**
 * Load/save progress + game + library meta to localStorage.
 * Book bodies never go into localStorage — only IndexedDB via idb.js.
 *
 * Envelope key: rq_v1 = {
 *   schemaVersion,
 *   progress,
 *   game,
 *   library   // userBooks without .text
 * }
 * Settings: rq_set (unchanged from v6)
 */
import {
  SCHEMA_VERSION,
  KEYS,
  emptyEnvelope,
  migrate,
  hydrateProgress,
  hydrateGame,
  hydrateLibrary,
  hydrateSettings,
  stripBookBody,
  mergeFlat,
  splitLegacyState,
} from './schema.js';
import * as idb from './idb.js';

let saveWarned = false;

function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function lsSet(key, value) {
  localStorage.setItem(key, value);
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

/**
 * Load versioned envelope. Does NOT run legacy migration — call migrateFromV6 first.
 */
export function loadEnvelope() {
  const raw = lsGet(KEYS.envelope);
  if (!raw) return emptyEnvelope();
  try {
    const parsed = JSON.parse(raw);
    const fromV =
      parsed && typeof parsed.schemaVersion === 'number'
        ? parsed.schemaVersion
        : 0;
    const migrated = migrate(fromV, parsed);
    delete migrated._pendingBodies;
    return {
      schemaVersion: SCHEMA_VERSION,
      progress: hydrateProgress(migrated.progress),
      game: hydrateGame(migrated.game),
      library: hydrateLibrary(migrated.library),
    };
  } catch (e) {
    return emptyEnvelope();
  }
}

/**
 * Persist envelope. Strips any accidental .text on userBooks.
 * @returns {{ok:boolean, error?:Error}}
 */
export function saveEnvelope(envelope) {
  const e = envelope || emptyEnvelope();
  const clean = {
    schemaVersion: SCHEMA_VERSION,
    progress: hydrateProgress(e.progress),
    game: hydrateGame(e.game),
    library: hydrateLibrary({
      ...(e.library || {}),
      userBooks: ((e.library && e.library.userBooks) || []).map(stripBookBody),
    }),
  };
  try {
    lsSet(KEYS.envelope, JSON.stringify(clean));
    saveWarned = false;
    return { ok: true };
  } catch (err) {
    if (!saveWarned) {
      saveWarned = true;
      try {
        alert(
          '⚠️ Не удалось сохранить прогресс: память браузера переполнена. Книги теперь в IndexedDB — если ошибка повторяется, сделайте экспорт и удалите часть метаданных/обложек.'
        );
      } catch (_) {}
    }
    return { ok: false, error: err };
  }
}

export function loadSettings() {
  try {
    return hydrateSettings(JSON.parse(lsGet(KEYS.settings) || '{}'));
  } catch (e) {
    return hydrateSettings({});
  }
}

export function saveSettings(set) {
  try {
    lsSet(KEYS.settings, JSON.stringify(hydrateSettings(set)));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/** Flat S-compatible view (no book bodies). */
export function loadFlat() {
  return mergeFlat(loadEnvelope());
}

/**
 * Save from a flat S-like object (adapter for gradual cut).
 * Writes ONLY the rq_v1 envelope (progress / game / library meta). Book bodies are NOT written here
 * (Architect 09.10): a text body goes to IDB exactly once — when the book is added (upsertUserBook),
 * imported (importBackup) or migrated from v6 (migrateFromV6). Calling save() 10× writes 0 bodies.
 */
export async function saveFlat(flat, opts) {
  const options = opts || {};
  const src = flat || {};

  // Re-split using migrate/split path (book .text is stripped from library meta here; never persisted)
  const split = splitLegacyState(src);

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    progress: split.progress,
    game: split.game,
    library: split.library,
  };

  // Prefer explicit domain overrides if provided
  if (options.progress) envelope.progress = hydrateProgress(options.progress);
  if (options.game) envelope.game = hydrateGame(options.game);
  if (options.library) envelope.library = hydrateLibrary(options.library);

  return saveEnvelope(envelope);
}

/**
 * Add / update a user book: meta in envelope, body in IDB.
 * @param {object} bookMeta - without relying on .text persistence
 * @param {{text?:string, pdf?:ArrayBuffer}} body
 */
export async function upsertUserBook(envelope, bookMeta, body) {
  const e = envelope || loadEnvelope();
  const meta = stripBookBody(bookMeta);
  const list = (e.library.userBooks || []).slice();
  const idx = list.findIndex((x) => x.id === meta.id);
  if (idx >= 0) list[idx] = meta;
  else list.push(meta);
  e.library.userBooks = list;

  if (body) {
    if (body.pdf) await idb.putPdf(meta.id, body.pdf);
    if (typeof body.text === 'string') await idb.putText(meta.id, body.text);
  } else if (bookMeta && bookMeta.text && bookMeta.type !== 'pdf') {
    await idb.putText(meta.id, bookMeta.text);
  }

  const result = saveEnvelope(e);
  return { envelope: loadEnvelope(), ...result };
}

export async function removeUserBook(envelope, bookId, wipeFile) {
  const e = envelope || loadEnvelope();
  e.library.userBooks = (e.library.userBooks || []).filter(
    (x) => x.id !== bookId
  );
  if (wipeFile) await idb.delBookBodies(bookId);
  const result = saveEnvelope(e);
  return { envelope: loadEnvelope(), ...result };
}

/**
 * Export ONE JSON envelope (Architect lock):
 *   { schemaVersion:1, progress, game, library, sessions:[], events:[] }
 * Optional: settings, textBodies (when includeTextBodies), note.
 * No format/readquest flat mirror required — domains + IDB arrays are the contract.
 */
export async function exportBackup(envelope, settings, opts) {
  const options = opts || {};
  const e = envelope || loadEnvelope();
  const set = settings || loadSettings();

  const { listSessions, ensureSessionIds } = await import('./sessions.js');
  const { listReadingEvents } = await import('./events.js');
  await ensureSessionIds(); // every exported row carries a string id (UUID or legacy-…)
  const sessions = await listSessions({});
  const events = await listReadingEvents({});

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    progress: e.progress,
    game: e.game,
    library: e.library,
    sessions: sessions,
    events: events,
    settings: set,
  };

  if (options.includeTextBodies) {
    payload.textBodies = {};
    const books = (e.library && e.library.userBooks) || [];
    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      if (b.type === 'pdf') continue;
      const t = await idb.getText(b.id);
      if (typeof t === 'string') payload.textBodies[b.id] = t;
    }
  }

  payload.note =
    'PDF files stay in IndexedDB (pdf:{id}) and are not included in JSON backup.';
  return payload;
}

/**
 * Import REQUIRED. Accepts Architect envelope
 *   { schemaVersion, progress, game, library, sessions, events [, settings] }
 * or legacy { readquest, settings }. Replace mode for sessions/events.
 */
export async function importBackup(data) {
  if (!data) throw new Error('пустой бэкап');
  let envelope;
  let settings;

  if (data.progress || data.game || data.library) {
    envelope = migrate(data.schemaVersion || 1, data);
    delete envelope._pendingBodies;
    settings = data.settings ? hydrateSettings(data.settings) : loadSettings();
  } else if (data.readquest) {
    const split = splitLegacyState(data.readquest);
    for (let i = 0; i < split.bodies.length; i++) {
      const body = split.bodies[i];
      if (body.kind === 'text') await idb.putText(body.id, body.value);
    }
    envelope = {
      schemaVersion: SCHEMA_VERSION,
      progress: split.progress,
      game: split.game,
      library: split.library,
    };
    settings = data.settings ? hydrateSettings(data.settings) : loadSettings();
  } else {
    throw new Error('это не резервная копия ReadQuest');
  }

  if (data.textBodies && typeof data.textBodies === 'object') {
    const ids = Object.keys(data.textBodies);
    for (let i = 0; i < ids.length; i++) {
      await idb.putText(ids[i], data.textBodies[ids[i]]);
    }
  }

  saveEnvelope(envelope);
  saveSettings(settings);

  const { clearSessions, logSession, withLegacyIds } = await import('./sessions.js');
  const { clearReadingEvents, logReadingEvent, logAnalyticsEvent } = await import(
    './events.js'
  );

  /* Replace mode: always clear then restore arrays (empty array = wipe) */
  /* id-less / numeric-id rows (old exports) → deterministic legacy ids → re-import is idempotent */
  const sessions = withLegacyIds(Array.isArray(data.sessions) ? data.sessions : []);
  const events = Array.isArray(data.events) ? data.events : [];

  await clearSessions();
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s || s.bookId == null) continue;
    try {
      await logSession({
        id: s.id,
        date: s.date,
        bookId: s.bookId,
        minutes: s.minutes,
        pageTurns: s.pageTurns != null ? s.pageTurns : s.pages,
        startedAt: s.startedAt,
        xp: s.xp,
      });
    } catch (e) {
      /* skip bad rows */
    }
  }

  await clearReadingEvents();
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    try {
      if (
        ev.type === 'page_visible' ||
        (ev.pageVisibleMs != null && ev.bookId && (!ev.type || ev.type === 'page_visible'))
      ) {
        await logReadingEvent({
          bookId: ev.bookId || '_unknown',
          pageVisibleMs: ev.pageVisibleMs || 0,
          date: ev.date,
          at: ev.at,
          page: ev.page,
          type: ev.type || 'page_visible',
        });
      } else if (ev.type) {
        await logAnalyticsEvent(ev);
      }
    } catch (e) {
      /* skip bad rows */
    }
  }

  return { envelope: loadEnvelope(), settings: loadSettings() };
}

export function clearAllLocal(opts) {
  const options = opts || {};
  lsRemove(KEYS.envelope);
  if (options.settings) lsRemove(KEYS.settings);
  if (options.legacy) {
    lsRemove(KEYS.legacyState);
    lsRemove(KEYS.legacyMigratedFlag);
  }
}

export { SCHEMA_VERSION, KEYS, mergeFlat, idb };
