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
  move: ['act', 'place'], place: ['home', 'move'], home: ['place', 'abs'], person: ['qual', 'mood'],
  qual: ['person', 'adv'], adv: ['quant', 'moment', 'qual'], quant: ['adv', 'abs'], abs: ['learn', 'body'],
  body: ['abs', 'mood'], phrase: ['mood', 'adv'], film: ['abs', 'act'],
};

/** Маъноси бир хил бўлиши мумкин жуфтлар: битта саволда бирга чиқмайди. */
export const CONFLICT: Array<[string, string]> = [
  ['t02', 't35'], ['t06', 't29'], ['t25', 't44'], ['t43', 't47'],
  ['w27', 'w54'], ['f48', 'f80'], ['f44', 'f80'], ['f20', 'f23'], ['f20', 'f34'],
  // Разговорный клуб тўпламлари
  ['r09-59', 'r13-46'], ['r07-41', 'r17-18'], ['r20-20', 'r20-06'], ['t02', 'r14-26'], ['t35', 'r14-26'],
  ['t29', 'r14-26'], ['t14', 'r13-42'], ['r02-21', 'r08-76'], ['r08-76', 'r08-77'], ['r14-10', 'r16-03'],
  ['r08-79', 'r12-02'], ['r17-23', 'r12-02'], ['r08-79', 'r17-23'], ['r08-69', 'r08-70'], ['r04-49', 'r01-13'],
  ['r04-30', 'r04-41'], ['r01-45', 'r04-37'], ['r04-02', 'r07-48'], ['r04-02', 'r02-24'], ['f10', 'r05-13'],
  ['f65', 'r05-13'], ['r02-14', 'r13-24'], ['r02-14', 'f02'], ['r02-14', 'r11-39'], ['f02', 'r11-39'],
  ['r09-01', 'r07-01'], ['t58', 'r01-35'], ['t58', 'r20-09'], ['r01-35', 'r20-09'], ['r05-17', 'r03-08'],
  ['r02-43', 'r01-21'], ['r07-36', 'r15-65'], ['r09-65', 'r09-41'], ['r11-33', 'r13-45'], ['r05-11', 'r13-53'],
  ['r14-31', 'r20-24'], ['r14-31', 'r14-24'], ['r20-24', 'r20-25'], ['r15-05', 'r17-35'], ['r11-26', 'r11-75'],
  ['r17-13', 'r17-21'], ['r17-21', 'r15-23'], ['r07-42', 'r15-37'], ['r13-09', 'r13-31'], ['r07-06', 'r15-73'],
  ['r08-53', 'r20-30'], ['r08-55', 'r08-56'], ['r20-08', 'r12-23'], ['r01-29', 'r01-26'], ['r01-43', 'r11-52'],
  ['r09-02', 'r12-13'], ['f79', 'r20-23'], ['f79', 'r15-25'], ['r20-23', 'r15-25'], ['r01-34', 'r09-32'],
  ['r15-50', 'r08-14'], ['r13-24', 'r02-25'], ['r11-28', 'f58'], ['r09-52', 'r02-13'], ['r05-04', 'r17-27'],
  ['r05-04', 'r08-10'], ['r17-27', 'r08-10'], ['r09-07', 'r08-36'], ['r01-06', 'r01-22'], ['r01-06', 'r04-23'],
  ['r01-22', 'r04-23'], ['r01-01', 'r04-23'], ['r01-01', 'r01-02'], ['r04-09', 'r04-10'], ['r11-84', 'r11-51'],
  ['r08-25', 'r11-51'], ['r08-25', 'r11-84'], ['r08-75', 'r11-32'], ['r08-75', 'r20-14'], ['r20-14', 'r11-32'],
  ['r13-49', 'r11-02'], ['r13-49', 'r08-49'], ['r05-09', 'r13-49'], ['r13-05', 'r11-21'], ['r13-35', 'r16-06'],
  ['r13-27', 'r18-06'], ['r14-01', 'r08-13'], ['r11-42', 'r14-20'], ['r02-18', 'r08-22'], ['r09-10', 'r09-48'],
  ['r09-10', 'r20-32'], ['r08-78', 'r15-54'], ['r09-33', 'r12-07'], ['r01-02', 'r12-21'], ['r12-08', 't01'],
  ['r07-20', 'r14-19'], ['r08-40', 'r20-02'], ['r20-02', 'r11-38'], ['r04-34', 'r04-01'], ['r09-82', 'r02-07'],
  ['r09-38', 'f71'], ['r02-16', 'r20-22'], ['r16-21', 'r20-24'], ['r13-41', 'r16-18'], ['r13-41', 'f74'],
  ['r16-18', 'f74'], ['r01-14', 'r06-03'], ['r12-13', 'f79'], ['r12-13', 'r20-23'], ['r21-01', 'r09-16'],
  ['r10-05', 'r11-25'], ['r09-53', 'r15-33'], ['r13-17', 'r11-81'], ['r20-28', 'r08-79'], ['r07-51', 'r04-16'],
  ['r13-81', 'r20-21'], ['r08-19', 'r02-20'], ['r20-21', 'r15-10'], ['r20-21', 'r11-23'], ['r15-10', 'r11-23'],
  ['r11-62', 'f20'], ['r11-15', 'r15-41'], ['r15-31', 'r13-27'], ['r02-37', 'r10-04'], ['r02-38', 'r13-63'],
  ['r01-18', 'f25'], ['r18-05', 'r01-22'], ['r18-05', 'r01-02'], ['r05-12', 'r18-05'], ['r13-19', 'r01-03'],
  ['r13-22', 'r02-43'], ['r13-22', 'r07-35'], ['r15-27', 'r13-21'], ['r11-85', 'r20-21'], ['r04-07', 'r04-38'],
  ['r03-11', 't37'], ['r01-38', 'r03-11'], ['r18-06', 'r13-27'], ['r11-09', 'r11-08'], ['r02-17', 'r17-19'],
  ['r08-63', 'r08-61'], ['r08-52', 'r20-06'], ['r11-31', 'r09-34'], ['r08-37', 'r08-59'], ['r04-35', 'r04-32'],
  ['r04-28', 'r04-32'], ['r17-33', 'r05-04'], ['r17-33', 'r17-27'], ['r17-34', 'r17-09'], ['f44', 'r13-48'],
  ['f80', 'f44'], ['r11-03', 'r13-39'], ['r11-03', 'f80'], ['r11-03', 'r04-17'], ['f48', 'r04-17'],
  ['t12', 'r13-71'], ['r07-12', 'r04-14'], ['r17-32', 'r15-25'], ['f60', 'r15-20'], ['r09-67', 'r15-42'],
  ['t10', 'r20-34'], ['t11', 'r20-34'], ['r13-26', 'r20-34'], ['r09-17', 'r12-11'], ['r02-48', 'r09-17'],
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

export interface Indexed {
  word: VocabWord;
  nru: string;
  nuz: string;
  wru: string[];
  gru: Set<string>;
  guz: Set<string>;
  /** Алоҳида маънолар: «Бас, етар; ҳаммаси» → бас · етар · ҳаммаси (қавсдаги изоҳсиз). */
  senses: Set<string>;
  /** Русча шакллар: «Брать / взять» → брать · взять. */
  forms: Set<string>;
}

const split = (text: string, by: RegExp): Set<string> =>
  new Set(text.replace(/\([^)]*\)/g, ' ').split(by).map(norm).filter(Boolean));

/** Битта маъноси ёки русча шакли бир хил сўзлар: иккови ҳам тўғри жавоб бўлиб қолади. */
export function sameMeaning(a: Indexed, b: Indexed): boolean {
  for (const x of a.senses) if (b.senses.has(x)) return true;
  for (const x of a.forms) if (b.forms.has(x)) return true;
  return false;
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
      senses: split(word.uz, /[,;/]/),
      forms: split(word.ru, /[/=]/),
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
    .filter((c) => c.word.id !== targetId && !bad.has(c.word.id) && !sameMeaning(target, c))
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
