import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const CASE = z.enum(['И', 'Р', 'Д', 'В', 'Т', 'П']);
const SOURCE = z.enum(['claude', 'daftar']);

const EXERCISE_TYPE = z.enum([
  'translate', 'fix', 'ending', 'bracket', 'preposition',
  'pronoun', 'adjective', 'identify', 'plural', 'question', 'choose',
  'verb', 'tense', 'infinitive',
]);

/** Мавзулар: ҳар бир мавзу — алоҳида MDX файл. Янги мавзу = битта янги файл. */
const topics = defineCollection({
  loader: glob({ pattern: ['**/*.mdx', '!**/_*.mdx'], base: './src/content/topics' }),
  schema: z.object({
    title: z.string().min(1),
    /** Рўйхатдаги карточка учун бир қатор. */
    short: z.string().min(1),
    case: CASE.optional(),
    /** Мавзу тури: падеж (`case`) ёки феъл (`verb`). Рўйхатда гуруҳлаш ва текширув учун. */
    kind: z.enum(['case', 'verb']).default('case'),
    /** Машқлар бўлимидаги мос тўплам (папка номи). */
    exercises: z.string().optional(),
    order: z.number().int(),
    source: SOURCE.default('claude'),
    reviewed: z.boolean().default(false),
  }),
});

/** Машқлар: `<мавзу>/<тур>.json`. Мисол: `predlozhnyy/ending.json`, `mixed/translate.json`. */
const exercises = defineCollection({
  loader: glob({ pattern: ['**/*.json', '!**/_*.json'], base: './src/content/exercises' }),
  schema: z.object({
    topic: z.string().min(1),
    type: EXERCISE_TYPE,
    title: z.string().optional(),
    /** Тўпламнинг топшириқ матни. Бўлмаса `TYPE_INFO[type].ask` кўрсатилади. */
    ask: z.string().min(1).optional(),
    items: z.array(
      z.object({
        id: z.string().min(1),
        case: CASE.optional(),
        /** Шу машқнинг топшириқ матни (тўпламникидан устун туради). */
        ask: z.string().min(1).optional(),
        prompt: z.string().min(1),
        answers: z.array(z.string().min(1)).min(1),
        options: z.array(z.string().min(1)).min(2).optional(),
        hints: z.string().optional(),
        note: z.string().min(1),
        source: SOURCE.default('claude'),
        reviewed: z.boolean().default(false),
      }),
    ).min(1),
  }),
});

/** Луғат: ҳар бир тўплам (кун ёки мавзу) — алоҳида файл. */
const vocab = defineCollection({
  loader: glob({ pattern: ['*.json', '!_*.json'], base: './src/content/vocab' }),
  schema: z.object({
    title: z.string().min(1),
    pages: z.string().optional(),
    /** Кунлик тўпламлар учун: `2026-11-18`. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    order: z.number().int(),
    note: z.string().optional(),
    source: SOURCE.default('daftar'),
    words: z.array(
      z.object({
        id: z.string().min(1),
        ru: z.string().min(1),
        uz: z.string().min(1),
        /** Сўз туркуми: глагол, наречие, существительное, прилагательное, ибора. */
        pos: z.string(),
        cluster: z.string().optional(),
        example: z.object({ ru: z.string(), uz: z.string() }).optional(),
        note: z.string().optional(),
        source: SOURCE.default('daftar'),
        reviewed: z.boolean().default(false),
      }),
    ).min(1),
  }),
});

/** Тестлар: ҳар бир тест алоҳида файл, камида 20 та савол, фақат 4 вариантли. */
const tests = defineCollection({
  loader: glob({ pattern: ['*.json', '!_*.json'], base: './src/content/tests' }),
  schema: z.object({
    no: z.number().int().positive(),
    title: z.string().min(1),
    /** Аралаш мавзулар (`mixed`) ёки танланган мавзу: грамматика (`grammar`), луғат (`vocab`). */
    group: z.enum(['mixed', 'grammar', 'vocab']),
    /** Фақат `grammar`: мавзу slug'и. */
    topic: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    questions: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(['topic', 'vocab', 'exercise']),
        prompt: z.string().min(1),
        promptExtra: z.string().optional(),
        options: z.array(z.string().min(1)).length(4),
        answer: z.number().int().min(0).max(3),
        note: z.string().min(1),
        source: SOURCE.default('claude'),
        reviewed: z.boolean().default(false),
      }),
    ).min(20),
  }),
});

export const collections = { topics, exercises, vocab, tests };
