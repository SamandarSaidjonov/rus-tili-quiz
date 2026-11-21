/**
 * Мавзу ва машқ тўпламларининг номлари.
 * Папка номи (slug) мавзу файлининг номи билан бир хил:
 * `src/content/topics/predlozhnyy.mdx` ↔ `src/content/exercises/predlozhnyy/*.json`.
 */
import type { CaseLetter } from './text.ts';

/** Рўйхатдаги гуруҳ: Падежлар, Феъллар ёки Аралаш. */
export type TopicKind = 'case' | 'verb' | 'mixed';

export interface TopicMeta {
  slug: string;
  title: string;
  kind: TopicKind;
  case?: CaseLetter;
  order: number;
}

export const CASE_TOPICS: TopicMeta[] = [
  { slug: 'imenitelnyy', title: 'Именительный падеж', kind: 'case', case: 'И', order: 1 },
  { slug: 'roditelnyy', title: 'Родительный падеж', kind: 'case', case: 'Р', order: 2 },
  { slug: 'datelnyy', title: 'Дательный падеж', kind: 'case', case: 'Д', order: 3 },
  { slug: 'vinitelnyy', title: 'Винительный падеж', kind: 'case', case: 'В', order: 4 },
  { slug: 'tvoritelnyy', title: 'Творительный падеж', kind: 'case', case: 'Т', order: 5 },
  { slug: 'predlozhnyy', title: 'Предложный падеж', kind: 'case', case: 'П', order: 6 },
];

export const VERB_TOPICS: TopicMeta[] = [
  { slug: 'nastoyashchee', title: 'Настоящее время', kind: 'verb', order: 7 },
  { slug: 'proshedshee', title: 'Прошедшее время', kind: 'verb', order: 8 },
  { slug: 'vozvratnye', title: 'Возвратные глаголы', kind: 'verb', order: 9 },
];

export const MIXED: TopicMeta = { slug: 'mixed', title: 'Аралаш мавзулар', kind: 'mixed', order: 99 };

/** Рўйхат саҳифаларидаги гуруҳлар ва уларнинг сарлавҳалари (шу тартибда). */
export const TOPIC_GROUPS: Array<{ kind: TopicKind; title: string }> = [
  { kind: 'case', title: 'Падежлар' },
  { kind: 'verb', title: 'Феъллар' },
  { kind: 'mixed', title: 'Аралаш' },
];

const bySlug = new Map<string, TopicMeta>(
  [...CASE_TOPICS, ...VERB_TOPICS, MIXED].map((t) => [t.slug, t]),
);

export const topicMeta = (slug: string): TopicMeta =>
  bySlug.get(slug) ?? { slug, title: slug, kind: 'mixed', order: 50 };
