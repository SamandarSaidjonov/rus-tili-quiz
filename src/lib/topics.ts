/**
 * Мавзу ва машқ тўпламларининг номлари.
 * Папка номи (slug) мавзу файлининг номи билан бир хил:
 * `src/content/topics/predlozhnyy.mdx` ↔ `src/content/exercises/predlozhnyy/*.json`.
 */
import type { CaseLetter } from './text.ts';

export interface TopicMeta {
  slug: string;
  title: string;
  case?: CaseLetter;
  order: number;
}

export const CASE_TOPICS: TopicMeta[] = [
  { slug: 'imenitelnyy', title: 'Именительный падеж', case: 'И', order: 1 },
  { slug: 'roditelnyy', title: 'Родительный падеж', case: 'Р', order: 2 },
  { slug: 'datelnyy', title: 'Дательный падеж', case: 'Д', order: 3 },
  { slug: 'vinitelnyy', title: 'Винительный падеж', case: 'В', order: 4 },
  { slug: 'tvoritelnyy', title: 'Творительный падеж', case: 'Т', order: 5 },
  { slug: 'predlozhnyy', title: 'Предложный падеж', case: 'П', order: 6 },
];

export const MIXED: TopicMeta = { slug: 'mixed', title: 'Аралаш мавзулар', order: 99 };

const bySlug = new Map<string, TopicMeta>([...CASE_TOPICS, MIXED].map((t) => [t.slug, t]));

export const topicMeta = (slug: string): TopicMeta =>
  bySlug.get(slug) ?? { slug, title: slug, order: 50 };
