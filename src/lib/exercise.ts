import {
  CASES, norm, toks, hasLatin, lcsMask, parseCase, parseTense, type CaseLetter,
} from './text.ts';
import type { ExerciseItem, ExerciseType } from './types.ts';

export interface TypeInfo {
  name: string;
  ask: string;
  /** Жавоб узун (тўлиқ гап) бўладими — input'нинг ўлчами учун. */
  long?: boolean;
}

export const TYPE_INFO: Record<ExerciseType, TypeInfo> = {
  translate: { name: 'Таржима', ask: 'Русчага таржима қилинг', long: true },
  fix: { name: 'Хатони тўғриланг', ask: 'Гапда падеж хатоси бор. Тўғри гапни ёзинг', long: true },
  ending: { name: 'Қўшимча', ask: 'Тушиб қолган қўшимчани ёзинг' },
  bracket: { name: 'Қавсдаги сўз', ask: 'Қавсдаги сўзни керакли падежда ёзинг' },
  preposition: { name: 'Предлог', ask: 'Тушиб қолган предлогни ёзинг' },
  pronoun: { name: 'Олмош', ask: 'Олмошни керакли падежда ёзинг' },
  adjective: { name: 'Сифат', ask: 'Сифатни (прилагательное) керакли шаклда ёзинг' },
  identify: { name: 'Падежни топинг', ask: 'Белгиланган сўз қайси падежда? Масалан: дательный ёки Д.п.' },
  plural: { name: 'Кўплик', ask: 'Қавсдаги сўзни кўпликда, керакли падежда ёзинг' },
  question: { name: 'Савол', ask: 'Белгиланган сўзга қайси савол берилади? Масалан: кому?' },
  choose: { name: 'Тўғрисини танланг', ask: 'Тўғри шаклни танланг' },
  verb: { name: 'Феъл шакли', ask: 'Қавсдаги феълни керакли шаклда ёзинг' },
  tense: {
    name: 'Замонни топинг',
    ask: 'Белгиланган феъл қайси замонда? Масалан: настоящее ёки н.в.',
  },
  infinitive: {
    name: 'Бош шакл',
    ask: 'Белгиланган феълнинг бош шаклини (инфинитив) ёзинг. Масалан: пишешь → писать',
  },
};

/**
 * Экранда кўрсатиладиган топшириқ матни.
 * Тартиб: машқнинг `ask` и → тўпламнинг `ask` и → `TYPE_INFO[type].ask`.
 */
export function resolveAsk(item: Pick<ExerciseItem, 'ask'>, setAsk: string | undefined, type: ExerciseType): string {
  return item.ask || setAsk || TYPE_INFO[type].ask;
}

/** `unknown-label` — падеж ёки замон номи тушунилмади (жавоб ҳисобга олинмайди). */
export type CheckState = 'empty' | 'latin' | 'unknown-label' | 'correct' | 'wrong';

export interface CheckResult {
  state: CheckState;
  /** Огоҳлантириш бўлса, жавоб ҳисобга олинмайди. */
  warning?: string;
}

/** `fix` турида фақат тузатилган сўз(лар)ни ёзиш ҳам тўғри. */
export function fixWords(item: ExerciseItem): string {
  const inPrompt = new Set(toks(item.prompt));
  return toks(item.answers[0] ?? '').filter((w) => !inPrompt.has(w)).join(' ');
}

/** `ending` турида олдига қўйилган `-` ҳисобга олинмайди (`-ой` ва `ой` бир хил). */
const stripDash = (s: string): string => s.replace(/^[\s\-–—]+/, '');

/** Жавоб гапнинг бир бўлаги бўладиган турлар: бўш жой ёки қавс тўлдирилади. */
const GAP_TYPES: readonly ExerciseType[] = [
  'ending', 'bracket', 'preposition', 'pronoun', 'adjective', 'plural', 'verb',
];

/**
 * Машқ матнидаги бўш жойни (`___` ёки `(сўз)`) жавоб билан тўлдиради.
 * Белги топилмаса `null` қайтаради.
 */
export function fillGap(prompt: string, answer: string): string | null {
  if (/_{2,}/.test(prompt)) return prompt.replace(/_{2,}/, answer);
  if (/\([^)]+\)/.test(prompt)) return prompt.replace(/\([^)]+\)/, answer);
  return null;
}

export function checkExercise(item: ExerciseItem, type: ExerciseType, input: string): CheckResult {
  const raw = String(input ?? '').trim();
  if (!raw) return { state: 'empty', warning: 'Жавоб ёзилмади.' };

  if (type === 'identify') {
    const got = parseCase(raw);
    if (!got) {
      return {
        state: 'unknown-label',
        warning: 'Падеж номи тушунилмади. Масалан: дательный, дат, Д.п. ёки Д деб ёзинг.',
      };
    }
    const want = item.answers.map((a) => parseCase(a)).filter(Boolean) as CaseLetter[];
    return { state: want.includes(got) ? 'correct' : 'wrong' };
  }

  if (type === 'tense') {
    const got = parseTense(raw);
    if (!got) {
      return {
        state: 'unknown-label',
        warning: 'Замон номи тушунилмади. Масалан: настоящее, наст ёки н.в. деб ёзинг.',
      };
    }
    const want = item.answers.map((a) => parseTense(a));
    return { state: want.includes(got) ? 'correct' : 'wrong' };
  }

  if (type === 'choose') {
    return { state: item.answers.some((a) => norm(a) === norm(raw)) ? 'correct' : 'wrong' };
  }

  if (hasLatin(raw)) {
    return { state: 'latin', warning: 'Жавобда лотин ҳарфлари бор. Рус ҳарфларида ёзинг.' };
  }

  const n = norm(type === 'ending' ? stripDash(raw) : raw);
  if (item.answers.some((a) => norm(type === 'ending' ? stripDash(a) : a) === n)) {
    return { state: 'correct' };
  }
  if (type === 'fix' && n === fixWords(item)) return { state: 'correct' };

  // Фақат қўшимча ёки битта сўз сўралса ҳам, тўлиқ гапни ёзган одам хато қилмаган:
  // экранда тўғри жавоб тўлиқ гап бўлиб кўринади, шунинг учун у ҳам қабул қилинади.
  if (GAP_TYPES.includes(type)) {
    const whole = norm(raw);
    const filled = item.answers
      .map((a) => fillGap(item.prompt, type === 'ending' ? stripDash(a) : a))
      .filter((s): s is string => s !== null);
    if (filled.some((s) => norm(s) === whole)) return { state: 'correct' };
  }

  return { state: 'wrong' };
}

/**
 * Машқларни турлар бўйича навбатма-навбат тарқатади,
 * шунда битта ўтиришда турлар аралашиб келади.
 */
export function dealByType<T extends { type: ExerciseType }>(
  groups: T[][],
  limit: number | 'all',
  rnd: () => number = Math.random,
): T[] {
  const buckets = groups
    .map((g) => shuffleLocal(g, rnd))
    .filter((g) => g.length > 0);
  const out: T[] = [];
  const total = buckets.reduce((n, g) => n + g.length, 0);
  while (out.length < total) {
    for (const b of shuffleLocal(buckets.map((_, i) => i), rnd)) {
      const item = buckets[b]!.pop();
      if (item) out.push(item);
    }
  }
  return limit === 'all' ? out : out.slice(0, Math.min(limit, out.length));
}

function shuffleLocal<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Тўлиқ тўғри жавоб: машқ матнидаги бўш жой жавоб билан тўлдирилади,
 * жавоб қисми `*…*` билан ажратилади.
 */
export function fullAnswer(item: ExerciseItem, type: ExerciseType): string {
  const a = item.answers[0] ?? '';
  if (type === 'translate' || type === 'fix' || type === 'choose') return a;
  // Бу турларда сўралгани — гап эмас, падеж номи ёки савол сўзи. Гапнинг ўзи
  // саволда турибди, шунинг учун тўғри жавоб деб айнан жавоб кўрсатилади.
  if (type === 'identify') {
    const letter = parseCase(a);
    return letter ? CASES[letter] : a;
  }
  if (type === 'tense') return parseTense(a) ?? a;
  if (type === 'question' || type === 'infinitive') return a;
  return fillGap(item.prompt, `*${a}*`) ?? `${item.prompt} → *${a}*`;
}

/** Тўғри жавоб гап эмас, балки ном ёки битта сўз бўладиган турлар. */
const LABEL_TYPES: readonly ExerciseType[] = ['identify', 'question', 'tense', 'infinitive'];

/**
 * Овоз тугмаси ўқийдиган матн. `identify`, `question`, `tense` ва `infinitive` да тўғри
 * жавоб — падеж ёки замон номи, савол сўзи, инфинитив; ўқилиши керак бўлгани эса машқдаги рус гапи.
 */
export function answerSpeech(item: ExerciseItem, type: ExerciseType): string {
  if (LABEL_TYPES.includes(type)) {
    return item.prompt.replace(/\[\[([^\]]+)\]\]/g, '$1');
  }
  return fullAnswer(item, type);
}

/** Тўғри жавобда топилмаган сўзларни белгилаш маъноли турлар (гап ёзиладиганлари). */
export function canMask(type: ExerciseType): boolean {
  return !LABEL_TYPES.includes(type) && type !== 'choose';
}

/**
 * Фойдаланувчи топа олмаган сўзларни белгилаш учун.
 * `hit: false` бўлган сўзлар рендерда `<mark>` билан кўрсатилади.
 */
export function maskWords(correct: string, user: string): Array<{ word: string; hit: boolean }> {
  const display = correct.split(/\s+/).filter(Boolean);
  const normed = display.map((w) => norm(w));
  const { hit } = lcsMask(toks(user), normed);
  return display.map((word, i) => ({ word, hit: hit[i] === true || normed[i] === '' }));
}
