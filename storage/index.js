/**
 * Public entry — Architect save contract (schemaVersion: 1).
 *
 *   import { bootStorage, logSession, listSessions, logReadingEvent } from './storage/index.js?v=20261006-1240';
 */
export {
  SCHEMA_VERSION,
  KEYS,
  PROGRESS_DEF,
  GAME_DEF,
  LIBRARY_DEF,
  SET_DEF,
  IDB_NAME,
  IDB_VERSION,
  IDB_STORE,
  IDB_STORE_SESSIONS,
  IDB_STORE_EVENTS,
  idbKeyPdf,
  idbKeyText,
  emptyEnvelope,
  migrate,
  splitLegacyState,
  mergeFlat,
  stripBookBody,
  hydrateProgress,
  hydrateGame,
  hydrateLibrary,
  hydrateSettings,
} from './schema.js?v=20261006-1240';

export * as idb from './idb.js?v=20261006-1240';

export {
  loadEnvelope,
  saveEnvelope,
  loadSettings,
  saveSettings,
  loadFlat,
  saveFlat,
  upsertUserBook,
  removeUserBook,
  exportBackup,
  importBackup,
  clearAllLocal,
} from './state.js?v=20261006-1240';

export { migrateFromV6, bootStorage, isMigrated, hasLegacy } from './migrate-v6.js?v=20261006-1240';

export {
  logSession,
  listSessions,
  aggregateSessionsByDay,
  daysMeetingThreshold,
  clearSessions,
  dayKey,
  localDay,
  addLocalDays,
  newSessionId,
  legacySessionId,
  withLegacyIds,
  ensureSessionIds,
} from './sessions.js?v=20261006-1240';

export {
  logReadingEvent,
  logAnalyticsEvent,
  listReadingEvents,
  clearReadingEvents,
} from './events.js?v=20261006-1240';
