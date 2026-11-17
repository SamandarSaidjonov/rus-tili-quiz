import { norm, toks, hasLatin, lcsMask, parseCase, type CaseLetter } from './text.ts';
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
};

export type CheckState = 'empty' | 'latin' | 'unknown-case' | 'correct' | 'wrong';

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

export function checkExercise(item: ExerciseItem, type: ExerciseType, input: string): CheckResult {
  const raw = String(input ?? '').trim();
  if (!raw) return { state: 'empty', warning: 'Жавоб ёзилмади.' };

  if (type === 'identify') {
    const got = parseCase(raw);
    if (!got) {
      return {
        state: 'unknown-case',
        warning: 'Падеж номи тушунилмади. Масалан: дательный, дат, Д.п. ёки Д деб ёзинг.',
      };
    }
    const want = item.answers.map((a) => parseCase(a)).filter(Boolean) as CaseLetter[];
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
  if (type === 'identify' || type === 'question') {
    return item.prompt.replace(/\[\[([^\]]+)\]\]/g, '*$1*');
  }
  let out = item.prompt;
  if (/_{2,}/.test(out)) return out.replace(/_{2,}/, `*${a}*`);
  if (/\([^)]+\)/.test(out)) return out.replace(/\([^)]+\)/, `*${a}*`);
  return `${out} → *${a}*`;
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
