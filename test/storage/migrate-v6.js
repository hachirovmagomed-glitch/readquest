/**
 * One-shot migration: v6 keys `readquest` + `rq_set` → rq_v1 envelope + IDB text bodies.
 *
 * Safe to call on every boot: no-ops if already migrated or no legacy blob.
 * Does not delete the legacy `readquest` key by default (rollback safety);
 * set opts.removeLegacy=true to clear after success.
 */
import {
  SCHEMA_VERSION,
  KEYS,
  splitLegacyState,
  hydrateSettings,
  emptyEnvelope,
} from './schema.js?v=20261009-2100';
import { saveEnvelope, saveSettings, loadEnvelope, loadSettings } from './state.js?v=20261009-2100';
import * as idb from './idb.js?v=20261009-2100';

function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

export function isMigrated() {
  if (lsGet(KEYS.legacyMigratedFlag) === '1') return true;
  if (lsGet(KEYS.envelope)) return true;
  return false;
}

export function hasLegacy() {
  return !!lsGet(KEYS.legacyState);
}

/**
 * @returns {Promise<{
 *   skipped?: boolean,
 *   reason?: string,
 *   migrated?: boolean,
 *   booksMoved?: number,
 *   envelope?: object
 * }>}
 */
export async function migrateFromV6(opts) {
  const options = opts || {};

  if (isMigrated() && !options.force) {
    return { skipped: true, reason: 'already-migrated', envelope: loadEnvelope() };
  }

  const raw = lsGet(KEYS.legacyState);
  if (!raw) {
    // Fresh install — ensure empty envelope exists
    if (!lsGet(KEYS.envelope)) {
      saveEnvelope(emptyEnvelope());
    }
    lsSet(KEYS.legacyMigratedFlag, '1');
    return { skipped: true, reason: 'no-legacy', envelope: loadEnvelope() };
  }

  let flat;
  try {
    flat = JSON.parse(raw);
  } catch (e) {
    return { skipped: true, reason: 'legacy-parse-error', error: String(e) };
  }

  const split = splitLegacyState(flat);
  let booksMoved = 0;

  for (let i = 0; i < split.bodies.length; i++) {
    const body = split.bodies[i];
    if (body.kind === 'text' && body.id && typeof body.value === 'string') {
      await idb.putText(body.id, body.value);
      booksMoved++;
    }
  }

  // Goal: if legacy still has default 15 and user never customized via sessions,
  // we keep 15 if they had progress with that goal — only new installs get 10.
  // Team lock: default goal MUST be 10 going forward for *defaults*;
  // existing users keep their stored goal (including 15 if they left it).
  // Documented in STORAGE.md.

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    progress: split.progress,
    game: split.game,
    library: split.library,
  };

  const saveResult = saveEnvelope(envelope);
  if (!saveResult.ok) {
    return {
      migrated: false,
      error: saveResult.error,
      reason: 'save-failed',
    };
  }

  // Settings: leave rq_set as-is; hydrate if missing nav
  const setRaw = lsGet(KEYS.settings);
  if (setRaw) {
    try {
      saveSettings(hydrateSettings(JSON.parse(setRaw)));
    } catch (e) {}
  }

  lsSet(KEYS.legacyMigratedFlag, '1');
  if (options.removeLegacy) {
    lsRemove(KEYS.legacyState);
  }

  return {
    migrated: true,
    booksMoved,
    schemaVersion: SCHEMA_VERSION,
    envelope: loadEnvelope(),
  };
}

/**
 * Boot helper: migrate then return envelope + settings.
 */
export async function bootStorage(opts) {
  const mig = await migrateFromV6(opts);
  return {
    migration: mig,
    envelope: loadEnvelope(),
    settings: loadSettings(),
  };
}
