/**
 * Эски версиянинг (битта `index.html`) прогрессини янги калитларга кўчириш.
 * Эски калитлар: `rus-quiz-v2-dars-1`, `-dars-2`, `-dars-m1`, ва энг эскиси `rus-vaqt-havo-quiz-v1`.
 * id'лар ўзгармагани учун (t01, w01, f01, d01) ҳар бир сўз ва машқ бўйича натижа сақланади.
 * Эски сессияни давом эттириб бўлмайди — фақат натижа ва хато қилинган сўзлар кўчирилади.
 */
import {
  LEGACY_OLD_KEY, LEGACY_PREFIX, PREFIX,
  readJson, readRaw, readStats, writeRaw, writeStats,
  type Kind, type SetStats,
} from './progress.ts';

export const MIGRATED_KEY = `${PREFIX}migrated`;

export interface LegacyAnswer {
  id?: string;
  ok?: boolean;
}

export interface LegacyState {
  ans?: LegacyAnswer[];
  phase?: string;
}

/** Эски сўз id'сидан янги луғат тўпламига. */
export function setOfWordId(id: string): string | null {
  if (/^t\d+$/.test(id)) return '001-vaqt';
  if (/^w\d+$/.test(id)) return '002-ob-havo';
  if (/^f\d+$/.test(id)) return '003-feellar';
  return null;
}

/** Эски машқ id'сидан янги машқ тўпламига. */
export function setOfDrillId(id: string): string | null {
  return /^d\d+$/.test(id) ? 'mixed' : null;
}

export interface Target {
  kind: Kind;
  id: string;
  items: Record<string, boolean>;
  finished: boolean;
}

/** Эски ҳолатлардан нимани қаерга ёзиш кераклигини ҳисоблайди (тоза функция). */
export function planMigration(states: Array<LegacyState | null | undefined>): Target[] {
  const targets = new Map<string, Target>();
  for (const state of states) {
    if (!state || !Array.isArray(state.ans)) continue;
    const finished = state.phase === 'end';
    for (const a of state.ans) {
      if (!a || typeof a.id !== 'string' || typeof a.ok !== 'boolean') continue;
      const vocabSet = setOfWordId(a.id);
      const drillSet = vocabSet ? null : setOfDrillId(a.id);
      const kind: Kind | null = vocabSet ? 'vocab' : drillSet ? 'ex' : null;
      const setId = vocabSet ?? drillSet;
      if (!kind || !setId) continue;
      const key = `${kind}:${setId}`;
      let t = targets.get(key);
      if (!t) {
        t = { kind, id: setId, items: {}, finished };
        targets.set(key, t);
      }
      t.finished = t.finished || finished;
      t.items[a.id] = a.ok;
    }
  }
  return [...targets.values()];
}

/** Эски натижани янгисига қўшади: янги маълумот устун туради. */
export function mergeIntoStats(stats: SetStats, target: Target, now = Date.now()): SetStats {
  const merged: SetStats = { v: 1, items: { ...stats.items }, best: stats.best, last: stats.last };
  let correct = 0;
  let total = 0;
  for (const [itemId, ok] of Object.entries(target.items)) {
    total++;
    if (ok) correct++;
    if (!merged.items[itemId]) merged.items[itemId] = { ok, at: now };
  }
  if (target.finished && total > 0 && (!merged.best || correct > merged.best.correct)) {
    merged.best = { correct, total, at: now };
  }
  return merged;
}

export interface MigrationReport {
  ran: boolean;
  sets: Array<{ kind: Kind; id: string; items: number }>;
}

/** Бир марта ишлайди. Эски калитлар ўчирилмайди — эски сайт ҳам ишлашда давом этади. */
export function runMigration(): MigrationReport {
  if (readRaw(MIGRATED_KEY)) return { ran: false, sets: [] };

  const legacy: Array<LegacyState | null> = [
    readJson<LegacyState | null>(`${LEGACY_PREFIX}1`, null),
    readJson<LegacyState | null>(`${LEGACY_PREFIX}2`, null),
    readJson<LegacyState | null>(`${LEGACY_PREFIX}m1`, null),
    readJson<LegacyState | null>(LEGACY_OLD_KEY, null),
  ];

  const targets = planMigration(legacy);
  for (const t of targets) {
    writeStats(t.kind, t.id, mergeIntoStats(readStats(t.kind, t.id), t));
  }
  writeRaw(MIGRATED_KEY, new Date().toISOString());
  return {
    ran: targets.length > 0,
    sets: targets.map((t) => ({ kind: t.kind, id: t.id, items: Object.keys(t.items).length })),
  };
}
