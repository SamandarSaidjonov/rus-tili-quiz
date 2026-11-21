/**
 * Прогресс `localStorage` да сақланади. Калитлар версияланган: `rt2:…`.
 * `localStorage` ишламаса (Telegram браузери, шахсий режим), хотирадаги нусха ишлатилади —
 * сайт синмайди, фақат саҳифа ёпилганда прогресс сақланмайди.
 */

export const PREFIX = 'rt2:';
export const LEGACY_PREFIX = 'rus-quiz-v2-dars-';
export const LEGACY_OLD_KEY = 'rus-vaqt-havo-quiz-v1';

export type Kind = 'vocab' | 'ex' | 'test' | 'topic';

export interface ItemResult {
  ok: boolean;
  at: number;
}

export interface Score {
  correct: number;
  total: number;
  at: number;
}

export interface SetStats {
  v: 1;
  /** Ҳар бир сўз/машқ бўйича охирги натижа. */
  items: Record<string, ItemResult>;
  best?: Score;
  last?: Score;
}

const memory = new Map<string, string>();
let storageOk: boolean | null = null;

function store(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (storageOk === false) return null;
  try {
    const s = window.localStorage;
    const probe = `${PREFIX}probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    storageOk = true;
    return s;
  } catch {
    storageOk = false;
    return null;
  }
}

export function readRaw(key: string): string | null {
  const s = store();
  if (s) {
    try {
      return s.getItem(key);
    } catch {
      /* пастдаги хотирадан ўқилади */
    }
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  const s = store();
  if (!s) return;
  try {
    s.setItem(key, value);
  } catch {
    /* жой тугаган бўлса ҳам сайт ишлашда давом этади */
  }
}

export function removeRaw(key: string): void {
  memory.delete(key);
  const s = store();
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    /* эътиборсиз */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value));
  } catch {
    /* эътиборсиз */
  }
}

export const statsKey = (kind: Kind, id: string): string => `${PREFIX}${kind}:${id}`;
export const sessionKey = (kind: Kind, id: string): string => `${PREFIX}session:${kind}:${id}`;

const emptyStats = (): SetStats => ({ v: 1, items: {} });

export function readStats(kind: Kind, id: string): SetStats {
  const s = readJson<SetStats>(statsKey(kind, id), emptyStats());
  if (!s || typeof s !== 'object' || typeof s.items !== 'object' || !s.items) return emptyStats();
  return { v: 1, items: s.items, best: s.best, last: s.last };
}

export function writeStats(kind: Kind, id: string, stats: SetStats): void {
  writeJson(statsKey(kind, id), stats);
}

export function recordAnswer(kind: Kind, id: string, itemId: string, ok: boolean): SetStats {
  const stats = readStats(kind, id);
  const at = Date.now();
  stats.items[itemId] = { ok, at };
  writeStats(kind, id, stats);
  markActive(at);
  return stats;
}

/** Фаол кунлар рўйхати (кетма-кет кунларни ҳисоблаш учун). */
export const DAYS_KEY = `${PREFIX}days`;
const DAYS_MAX = 400;

/** Маҳаллий сана: `2026-11-21`. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function readDays(): string[] {
  const days = readJson<unknown>(DAYS_KEY, []);
  return Array.isArray(days) ? days.filter((d): d is string => typeof d === 'string') : [];
}

export function markActive(at: number = Date.now()): void {
  const key = dayKey(at);
  const days = readDays();
  if (days.includes(key)) return;
  days.push(key);
  writeJson(DAYS_KEY, days.slice(-DAYS_MAX));
}

export function recordScore(kind: Kind, id: string, correct: number, total: number): SetStats {
  const stats = readStats(kind, id);
  const score: Score = { correct, total, at: Date.now() };
  stats.last = score;
  if (!stats.best || correct > stats.best.correct) stats.best = score;
  writeStats(kind, id, stats);
  return stats;
}

/** Охирги марта хато қилинган сўз/машқлар. */
export function mistakeIds(kind: Kind, id: string): string[] {
  const { items } = readStats(kind, id);
  return Object.entries(items)
    .filter(([, r]) => r && r.ok === false)
    .map(([itemId]) => itemId);
}

export function answeredCount(stats: SetStats): { answered: number; correct: number } {
  const all = Object.values(stats.items);
  return { answered: all.length, correct: all.filter((r) => r.ok).length };
}

/** Барча прогрессни тозалаш (эски версиянинг калитлари ҳам). */
export function clearAllProgress(): void {
  const s = store();
  const keys: string[] = [];
  if (s) {
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && (k.startsWith(PREFIX) || k.startsWith(LEGACY_PREFIX) || k === LEGACY_OLD_KEY)) keys.push(k);
      }
    } catch {
      /* эътиборсиз */
    }
  }
  for (const k of [...keys, ...memory.keys()]) removeRaw(k);
  memory.clear();
}

export const storageAvailable = (): boolean => store() !== null;
