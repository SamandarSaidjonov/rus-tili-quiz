import type { CaseLetter } from './text.ts';

export const EXERCISE_TYPES = [
  'translate', 'fix', 'ending', 'bracket', 'preposition',
  'pronoun', 'adjective', 'identify', 'plural', 'question', 'choose',
  'verb', 'tense', 'infinitive',
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export interface ExerciseItem {
  id: string;
  case?: CaseLetter;
  /** Шу машқнинг топшириқ матни. Тартиб: машқники → тўпламники → `TYPE_INFO[type].ask`. */
  ask?: string;
  /** Савол матни. Белгилар: `___` — бўш жой, `(сўз)` — шаклини ўзгартириш, `[[сўз]]` — таҳлил қилинадиган сўз. */
  prompt: string;
  /** Қабул қилинадиган жавоблар. Биринчиси — асосий (тўлиқ) жавоб. */
  answers: string[];
  /** Фақат `choose` турида: 4 та вариант. */
  options?: string[];
  /** Фақат `translate` турида: «ўзбекча — русча» жуфтлари. */
  hints?: string;
  note: string;
  source: 'claude' | 'daftar';
  reviewed: boolean;
}

export interface ExerciseSet {
  topic: string;
  type: ExerciseType;
  title?: string;
  /** Тўпламнинг топшириқ матни (бўлмаса турнинг оддий матни). */
  ask?: string;
  items: ExerciseItem[];
}

export interface VocabWord {
  id: string;
  ru: string;
  uz: string;
  pos: string;
  cluster?: string;
  example?: { ru: string; uz: string };
  note?: string;
  source: 'claude' | 'daftar';
  reviewed: boolean;
}

export interface VocabSet {
  id: string;
  title: string;
  pages?: string;
  date?: string;
  order: number;
  note?: string;
  source: 'claude' | 'daftar';
  words: VocabWord[];
}

export interface TestQuestion {
  id: string;
  kind: 'topic' | 'vocab' | 'exercise';
  prompt: string;
  promptExtra?: string;
  options: string[];
  /** Тўғри жавобнинг `options` даги ўрни (0 дан бошлаб). */
  answer: number;
  note: string;
  source: 'claude' | 'daftar';
  reviewed: boolean;
}

export interface TestFile {
  id: string;
  no: number;
  title: string;
  date?: string;
  questions: TestQuestion[];
}
