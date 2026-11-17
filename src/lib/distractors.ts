/**
 * Луғат квизи учун нотўғри вариантларни танлаш.
 * Нотўғри вариант тўғрисига яқин бўлсин (маъноси ёки ёзилиши),
 * лекин иккита тўғри жавоб бўлиб қолмасин (`CONFLICT`).
 */
import { norm, shuffle } from './text.ts';
import type { VocabWord } from './types.ts';

/** Маъно кластерлари: қайси кластер сўзлари бир-бирига яқин. */
export const NEAR: Record<string, string[]> = {
  freq: ['dur'], dur: ['freq', 'period'], moment: ['relday', 'daypart'],
  daypart: ['relday', 'moment'], relday: ['period', 'daypart', 'moment'],
  period: ['relday', 'dur', 'week'], week: ['period', 'relday'],
  temp: ['season', 'sky'], sky: ['precip', 'wind', 'temp'], wind: ['sky'],
  precip: ['sky', 'season'], ask: ['precip', 'temp'], season: ['temp', 'precip'],
  nature: ['sky', 'precip'],
  say: ['mind', 'learn'], mind: ['say', 'mood'], learn: ['say', 'mind'],
  mood: ['mind', 'time'], get: ['act'], act: ['get', 'learn'], time: ['act', 'mood'],
};

/** Маъноси бир хил бўлиши мумкин жуфтлар: битта саволда бирга чиқмайди. */
export const CONFLICT: Array<[string, string]> = [
  ['t02', 't35'], ['t06', 't29'], ['t25', 't44'], ['t43', 't47'],
  ['w27', 'w54'], ['f48', 'f80'], ['f44', 'f80'], ['f20', 'f23'], ['f20', 'f34'],
];

const conflictMap = (() => {
  const m = new Map<string, Set<string>>();
  for (const [a, b] of CONFLICT) {
    if (!m.has(a)) m.set(a, new Set());
    if (!m.has(b)) m.set(b, new Set());
    m.get(a)!.add(b);
    m.get(b)!.add(a);
  }
  return m;
})();

export const conflictsOf = (id: string): Set<string> => conflictMap.get(id) ?? new Set();

interface Indexed {
  word: VocabWord;
  nru: string;
  nuz: string;
  wru: string[];
  gru: Set<string>;
  guz: Set<string>;
}

function grams(n: string): Set<string> {
  const t = ` ${n} `;
  const g = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3));
  return g;
}

function dice(a: Set<string>, b: Set<string>): number {
  let n = 0;
  a.forEach((x) => {
    if (b.has(x)) n++;
  });
  return a.size + b.size ? (2 * n) / (a.size + b.size) : 0;
}

/** Сўзларнинг биринчи 4 ҳарфи бўйича мослик. */
function wsim(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const p = (x: string) => x.slice(0, 4);
  const bp = b.map(p);
  let m = 0;
  for (const x of a) if (bp.includes(p(x))) m++;
  return m / Math.max(a.length, b.length);
}

export function indexWords(words: VocabWord[]): Indexed[] {
  return words.map((word) => {
    const nru = norm(word.ru);
    const nuz = norm(word.uz);
    return {
      word,
      nru,
      nuz,
      wru: nru.split(' ').filter((x) => x.length > 1),
      gru: grams(nru),
      guz: grams(nuz),
    };
  });
}

/** Нотўғри вариант қанчалик тўғрисига яқин: балл қанча катта бўлса, шунча яқин. */
export function score(t: Indexed, c: Indexed, rnd: () => number = Math.random): number {
  let s = 0;
  const tc = t.word.cluster;
  const cc = c.word.cluster;
  if (tc && cc && tc === cc) s += 3;
  else if (tc && cc && (NEAR[tc] ?? []).includes(cc)) s += 1.2;
  s += 2.2 * wsim(t.wru, c.wru) + 2 * dice(t.gru, c.gru) + 0.6 * dice(t.guz, c.guz);
  const la = t.nru.length;
  const lb = c.nru.length;
  s += 0.6 * (1 - Math.abs(la - lb) / Math.max(la, lb, 1));
  return s + rnd() * 1.2;
}

/**
 * Тўғри жавоб + 3 та нотўғри вариантнинг id'лари, аралаштирилган ҳолда.
 * Вариантлар русча ёзилиши бўйича бир-бирини такрорламайди.
 */
export function pickOptions(
  targetId: string,
  pool: Indexed[],
  rnd: () => number = Math.random,
): string[] {
  const target = pool.find((p) => p.word.id === targetId);
  if (!target) return [targetId];
  const bad = conflictsOf(targetId);
  const ranked = pool
    .filter((c) => c.word.id !== targetId && !bad.has(c.word.id))
    .map((c) => ({ c, s: score(target, c, rnd) }))
    .sort((a, b) => b.s - a.s);

  const out: string[] = [];
  const seen = new Set<string>([target.nru]);
  for (const { c } of ranked) {
    if (seen.has(c.nru)) continue;
    seen.add(c.nru);
    out.push(c.word.id);
    if (out.length === 3) break;
  }
  return shuffle([targetId, ...out], rnd);
}
