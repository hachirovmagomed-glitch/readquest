/**
 * Public entry — Architect save contract (schemaVersion: 1).
 *
 *   import { bootStorage, logSession, listSessions, logReadingEvent } from './storage/index.js';
 */
export {
  NS,
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
} from './schema.js';

export * as idb from './idb.js';

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
} from './state.js';

export { migrateFromV6, bootStorage, isMigrated, hasLegacy } from './migrate-v6.js';

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
  setSessionXp,
} from './sessions.js';

export {
  logReadingEvent,
  logAnalyticsEvent,
  listReadingEvents,
  clearReadingEvents,
} from './events.js';
