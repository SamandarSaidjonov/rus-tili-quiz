/** Тестлар гуруҳлари ва уларнинг тартиби. */
import type { CollectionEntry } from 'astro:content';
import { topicMeta } from './topics.ts';
import type { TestGroup } from './types.ts';

/** «Натижалар» даги сарлавҳалар (шу тартибда). */
export const TEST_GROUPS: Array<{ group: TestGroup; title: string }> = [
  { group: 'mixed', title: 'Аралаш мавзулар' },
  { group: 'grammar', title: 'Грамматика' },
  { group: 'vocab', title: 'Луғатлар' },
];

const rank = (g: TestGroup): number => TEST_GROUPS.findIndex((x) => x.group === g);

type Entry = CollectionEntry<'tests'>;

/** Гуруҳ → грамматикада мавзу тартиби → рақам. */
export function compareTests(a: Entry, b: Entry): number {
  const order = (t: Entry): number => (t.data.topic ? topicMeta(t.data.topic).order : 0);
  return rank(a.data.group) - rank(b.data.group) || order(a) - order(b) || a.data.no - b.data.no;
}
