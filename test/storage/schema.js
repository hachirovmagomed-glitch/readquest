/**
 * ReadQuest storage schema — version, defaults, domain splits.
 * Soft streak floor (2 min): TODO — document only; game logic not implemented here.
 */
export const SCHEMA_VERSION = 1;

/** Namespace (build-time, set by build-dist.sh via window.RQ_NS): 'rq' = main app, 'rqt' = test build.
 *  Every key / DB / lock / channel / cache is derived from it so a test build never touches main data. */
export const NS = (typeof globalThis !== 'undefined' && globalThis.RQ_NS) || 'rq';

/** localStorage keys (v1) */
export const KEYS = {
  envelope: NS + '_v1',
  settings: NS + '_set',
  /** legacy v6 monolith */
  legacyState: NS === 'rq' ? 'readquest' : NS + '_readquest',
  legacyMigratedFlag: NS + '_migrated_v1',
};

/** IndexedDB — one DB; never invent separate DBs for focus/anti-cheat */
export const IDB_NAME = NS === 'rq' ? 'readquest' : 'readquest-test';
/** v1 files (v6) → v2 sessions → v3 reading events (pageVisibleMs) */
export const IDB_VERSION = 3;
export const IDB_STORE = 'files';
export const IDB_STORE_SESSIONS = 'sessions';
export const IDB_STORE_EVENTS = 'events';

/** IDB key helpers — pdf: kept for v6 compat; text: for txt/epub/fb2 bodies */
export function idbKeyPdf(bookId) {
  return 'pdf:' + bookId;
}
export function idbKeyText(bookId) {
  return 'text:' + bookId;
}

/**
 * Progress domain — reading habit metrics & per-book reading state.
 * TODO(soft-streak): Architect lock — streak soft floor ≥2 min (logic later).
 * Daily quest / north-star still use goal (defaultMinutes: 10).
 */
export const PROGRESS_DEF = {
  streak: 0,
  lastDay: null,
  /** Architect: goal (defaultMinutes: 10). Was 15 in v6 DEF. */
  goal: 10,
  dayKey: null,
  minToday: 0,
  sessions: 0,
  totalMin: 0,
  totalPages: 0,
  progress: {},
  finished: [],
  hist: {},
  hourHist: null, // normalized to length-24 on hydrate
  finishDates: {},
  lastRead: null,
  planned: {},
  bookStats: {},
  bookDiff: {},
  bookStat: {},
  bookImp: {},
  status: {},
  marks: {},
  quotes: {},
  hl: {},
  stickers: {},
  favs: [],
  lastBackup: null,
};

/**
 * Game domain — RPG / economy / quests. Bodies never live here.
 */
export const GAME_DEF = {
  xp: 0,
  gold: 0,
  goldAllTime: 0,
  xpMult: 1,
  stats: {
    Интеллект: 0,
    Мудрость: 0,
    Харизма: 0,
    Воображение: 0,
    Воля: 0,
  },
  skills: null,
  skillMeta: {},
  badges: [],
  owned: [],
  claimed: {},
  rewards: null,
  cur: null,
  customQuests: [],
  customStats: [],
  customAch: [],
  achUnlocked: [],
  avatar: null,
  heroName: 'Читатель',
  statuses: null,
  talents: {},
  petXp: 0,
  /** LEGACY (claim button, ≤ build 20261006-1240): last claimed MVP daily date — read once by migrateClaimedToPaid, never written */
  dailyClaimed: null,
  /** LEGACY: week key of last claimed weekly — read by migrateClaimedToPaid, never written */
  weeklyClaimed: null,
  /** Auto-paid MVP daily (+30): local days YYYY-MM-DD already paid (build 3, additive; schemaVersion 1) */
  dailyPaidDays: [],
  /** Auto-paid MVP weekly (+120): week keys (Mon YYYY-MM-DD) already paid */
  weeklyPaidWeeks: [],
  /** true once old claim dates (dailyClaimed/weeklyClaimed) were folded into the *Paid lists */
  paidMigrated: false,
  /** Legacy v6 daily-bonus button (full UI) */
  dailyClaim: null,
  boss: null,
  inventory: [],
  invHist: [],
  /** Architect: [{id, title, price, at}] ISO at */
  rewardPurchases: [],
  /** sessions[].id (UUID) already turned into XP — idempotent awards (reload/import safe) */
  awardedSessionIds: [],
  /** Legacy → migrated to rewardPurchases in hydrateGame */
  rewardHist: [],
  ownedGear: [],
  equipped: {},
  hpMax: 50,
  hp: null,
  anti: null,
  notif: null,
  ai: null,
  ux: null,
  appTheme: 'teal',
  pixelOwned: false,
  pixelOn: false,
  lang: 'ru',
  useChar: true,
  char: {},
  vocab: [],
  devMoney: false,
};

/**
 * Library domain — shelf meta WITHOUT book text/ArrayBuffer bodies.
 * userBooks[].text is stripped; bodies live in IndexedDB.
 */
export const LIBRARY_DEF = {
  userBooks: [],
  hidden: [],
  shelfOrder: [],
  covers: {},
  autoDiff: true,
};

/** Reader settings (same shape as v6 SETDEF) */
export const SET_DEF = {
  font: 0,
  size: 19,
  lh: 1.65,
  theme: 'sepia',
  margin: 24,
  cTxt: null,
  cBg: null,
  align: 'j',
  hyph: true,
  indent: true,
  ls: 0,
  weight: 400,
  dim: 0,
  nav: null,
  mvp: true,
  focusMode: true,
};

const DEFAULT_SKILLS = ['Концентрация', 'Дисциплина', 'Аналитика', 'Скорочтение'];
const DEFAULT_SKILL_LINKS = {
  Концентрация: { Воля: 100, Интеллект: 30 },
  Дисциплина: { Воля: 100 },
  Аналитика: { Интеллект: 100, Мудрость: 40 },
  Скорочтение: { Интеллект: 60 },
};

/** Fields that belong to progress when splitting a flat v6 blob */
export const PROGRESS_KEYS = Object.keys(PROGRESS_DEF);
/** Fields that belong to game */
export const GAME_KEYS = Object.keys(GAME_DEF);
/** Fields that belong to library */
export const LIBRARY_KEYS = Object.keys(LIBRARY_DEF);

/**
 * Normalize nested defaults after merge (mirrors v6 hydrate, without side effects).
 */
export function hydrateProgress(p) {
  const out = Object.assign({}, PROGRESS_DEF, p || {});
  out.progress = out.progress || {};
  out.finished = out.finished || [];
  out.hist = out.hist || {};
  out.hourHist =
    out.hourHist && out.hourHist.length === 24
      ? out.hourHist
      : new Array(24).fill(0);
  out.finishDates = out.finishDates || {};
  out.planned = out.planned || {};
  out.bookStats = out.bookStats || {};
  out.bookDiff = out.bookDiff || {};
  out.bookStat = out.bookStat || {};
  out.bookImp = out.bookImp || {};
  out.status = out.status || {};
  out.marks = out.marks || {};
  out.quotes = out.quotes || {};
  out.hl = out.hl || {};
  out.stickers = out.stickers || {};
  out.favs = out.favs || [];
  if (out.goal == null || out.goal < 5) out.goal = PROGRESS_DEF.goal;
  return out;
}

export function hydrateGame(g) {
  const out = Object.assign({}, GAME_DEF, g || {});
  out.stats = Object.assign({}, GAME_DEF.stats, out.stats || {});
  out.badges = out.badges || [];
  out.owned = out.owned || [];
  out.claimed = out.claimed || {};
  out.customQuests = out.customQuests || [];
  out.customStats = out.customStats || [];
  out.customAch = out.customAch || [];
  out.achUnlocked = out.achUnlocked || [];
  out.talents = out.talents || {};
  out.inventory = out.inventory || [];
  out.invHist = out.invHist || [];
  /* Architect fields + compat */
  out.rewardPurchases = Array.isArray(out.rewardPurchases) ? out.rewardPurchases : [];
  out.awardedSessionIds = Array.isArray(out.awardedSessionIds) ? out.awardedSessionIds : [];
  out.dailyPaidDays = Array.isArray(out.dailyPaidDays) ? out.dailyPaidDays : [];
  out.weeklyPaidWeeks = Array.isArray(out.weeklyPaidWeeks) ? out.weeklyPaidWeeks : [];
  out.rewardHist = out.rewardHist || [];
  if (out.rewardHist.length && !out.rewardPurchases.length) {
    out.rewardPurchases = out.rewardHist.map(function (h, i) {
      return {
        id: h.id || ('rp_legacy_' + i),
        title: h.title || h.name || 'Награда',
        price: h.price != null ? h.price : h.cost || 0,
        at: h.at || (h.date ? h.date + 'T12:00:00.000Z' : new Date().toISOString()),
      };
    });
  }
  if (out.dailyClaimed == null && out.dailyClaim) out.dailyClaimed = out.dailyClaim;
  if (out.weeklyClaimed == null) out.weeklyClaimed = null;
  /* migrate claimed mvp_daily / mvp_weekly keys once */
  if (out.claimed && typeof out.claimed === 'object') {
    Object.keys(out.claimed).forEach(function (k) {
      if (!out.claimed[k]) return;
      if (k.indexOf('mvp_daily:') === 0 && !out.dailyClaimed) {
        out.dailyClaimed = k.slice('mvp_daily:'.length);
      }
      if (k.indexOf('mvp_weekly:') === 0 && !out.weeklyClaimed) {
        out.weeklyClaimed = k.slice('mvp_weekly:'.length);
      }
    });
  }

  out.ownedGear = out.ownedGear || [];
  out.equipped = out.equipped || {};
  out.char = out.char || {};
  out.vocab = out.vocab || [];
  out.skillMeta = out.skillMeta || {};
  /* Product 2026-10-06: forgotten-book guard — max 3 min counted per page (was 4) */
  if (!out.anti) out.anti = { minSec: 12, maxMin: 3, v: 2 };
  else if (!out.anti.v) {
    out.anti = Object.assign({}, out.anti, { v: 2 });
    if (out.anti.maxMin === 4) out.anti.maxMin = 3;
  }
  if (!out.skills)
    out.skills = {
      Концентрация: 0,
      Дисциплина: 0,
      Аналитика: 0,
      Скорочтение: 0,
    };
  if (!out.ux) out.ux = { anim: true, wake: false, vibe: true, scale: 100 };
  if (!out.ai) out.ai = { key: '', model: 'gpt-4o-mini' };
  if (!out.cur || !out.cur.icon) out.cur = { icon: '🪙', name: 'золото' };
  if (!out.rewards || !out.rewards.length)
    out.rewards = [
      { name: 'Кофе', tier: 'small', cost: 100, bought: 0 },
      { name: 'Серия сериала', tier: 'small', cost: 100, bought: 0 },
      { name: '', tier: 'small', cost: 100, bought: 0, placeholder: true },
    ];
  else {
    out.rewards.forEach(function (r) {
      if (!r.tier) {
        r.tier = r.cost >= 500 ? 'big' : r.cost >= 250 ? 'mid' : 'small';
      }
      const tierCost = { small: 100, mid: 250, big: 500 };
      if (tierCost[r.tier]) r.cost = tierCost[r.tier];
    });
  }
  if (!out.notif) out.notif = { on: false, time: '20:00' };
  if (!out.statuses)
    out.statuses = [
      [1, 'Новичок'],
      [3, 'Читатель'],
      [5, 'Книжный странник'],
      [8, 'Магистр'],
      [12, 'Архимаг чтения'],
    ];
  if (!out.heroName) out.heroName = 'Читатель';
  if (out.hpMax === undefined) out.hpMax = 50;
  if (out.hp === undefined || out.hp === null) out.hp = out.hpMax;
  if (out.xpMult === undefined) out.xpMult = 1;
  out.goldAllTime = out.goldAllTime || 0;
  out.petXp = out.petXp || 0;
  out.customStats.forEach((s) => {
    if (out.stats[s] === undefined) out.stats[s] = 0;
  });
  DEFAULT_SKILLS.forEach((k) => {
    if (out.skills[k] === undefined) out.skills[k] = 0;
    if (!out.skillMeta[k])
      out.skillMeta[k] = {
        links: Object.assign({}, DEFAULT_SKILL_LINKS[k] || {}),
      };
  });
  Object.keys(out.skills).forEach((k) => {
    if (!out.skillMeta[k]) out.skillMeta[k] = { links: {} };
  });
  return out;
}

export function hydrateLibrary(lib) {
  const out = Object.assign({}, LIBRARY_DEF, lib || {});
  out.userBooks = (out.userBooks || []).map(stripBookBody);
  out.hidden = out.hidden || [];
  out.shelfOrder = out.shelfOrder || [];
  out.covers = out.covers || {};
  if (out.autoDiff === undefined) out.autoDiff = true;
  return out;
}

export function hydrateSettings(s) {
  const out = Object.assign({}, SET_DEF, s || {});
  if (!out.nav) out.nav = { btns: false, tap: true, invert: false, swipe: true };
  return out;
}

/** Remove heavy body fields from a book meta object (mutates copy). */
export function stripBookBody(book) {
  if (!book || typeof book !== 'object') return book;
  const meta = Object.assign({}, book);
  delete meta.text;
  // toc stays (offsets only, small); PDF has empty text already
  return meta;
}

/**
 * Split a flat v6-style state object into domain envelopes.
 * Returns { progress, game, library, bodies: [{id, kind, value}] }
 * bodies are extracted for IDB write by migrate.
 */
export function splitLegacyState(flat) {
  const src = flat || {};
  const progress = {};
  const game = {};
  const library = {};
  const bodies = [];

  PROGRESS_KEYS.forEach((k) => {
    if (src[k] !== undefined) progress[k] = src[k];
  });
  GAME_KEYS.forEach((k) => {
    if (src[k] !== undefined) game[k] = src[k];
  });
  // vocab alias
  if (src.vocab !== undefined) game.vocab = src.vocab;

  LIBRARY_KEYS.forEach((k) => {
    if (src[k] !== undefined) library[k] = src[k];
  });

  const books = Array.isArray(src.userBooks) ? src.userBooks : [];
  library.userBooks = books.map((b) => {
    if (b && b.text && b.type !== 'pdf') {
      bodies.push({ id: b.id, kind: 'text', value: b.text });
    }
    // PDF bodies already in IDB under pdf:{id}; nothing to extract from blob
    return stripBookBody(b);
  });

  return {
    progress: hydrateProgress(progress),
    game: hydrateGame(game),
    library: hydrateLibrary(library),
    bodies,
  };
}

/**
 * Merge domains back into a flat S-like object for gradual v6 adapter use.
 * Book .text is NOT rehydrated here — caller uses idb.getText.
 */
export function mergeFlat(envelope) {
  const e = envelope || {};
  return Object.assign(
    {},
    e.game || {},
    e.progress || {},
    e.library || {},
    { schemaVersion: e.schemaVersion || SCHEMA_VERSION }
  );
}

/**
 * Migrate envelope data between schema versions.
 * fromVersion 0 / missing = legacy flat or pre-versioned.
 */
export function migrate(fromVersion, data) {
  let v = fromVersion == null ? 0 : fromVersion;
  let cur = data;

  if (v < 1) {
    // Flat v6 blobs also have a `progress` map (per-book ratios) — do NOT
    // treat that as an envelope. Envelope has domain objects + no top-level xp/userBooks.
    const looksEnvelope = !!(
      cur &&
      cur.library &&
      cur.game &&
      cur.progress &&
      cur.userBooks === undefined &&
      cur.xp === undefined
    );
    if (looksEnvelope) {
      cur = {
        schemaVersion: 1,
        progress: hydrateProgress(cur.progress),
        game: hydrateGame(cur.game),
        library: hydrateLibrary(cur.library),
      };
    } else {
      const split = splitLegacyState(cur || {});
      cur = {
        schemaVersion: 1,
        progress: split.progress,
        game: split.game,
        library: split.library,
        _pendingBodies: split.bodies,
      };
    }
    // Existing user goal preserved via split; new installs get PROGRESS_DEF.goal (10).
    v = 1;
  }

  // Future: if (v < 2) { ... }
  cur.schemaVersion = SCHEMA_VERSION;
  return cur;
}

export function emptyEnvelope() {
  return {
    schemaVersion: SCHEMA_VERSION,
    progress: hydrateProgress({}),
    game: hydrateGame({}),
    library: hydrateLibrary({}),
  };
}
