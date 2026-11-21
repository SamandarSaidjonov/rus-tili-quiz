/**
 * Бош саҳифа ва «Натижалар» учун контент рўйхати. Фақат йиғиш пайтида (Astro саҳифаларида)
 * чақирилади; натижа саҳифага JSON бўлиб ёзилади, прогресс эса браузерда ҳисобланади.
 */
import { getCollection } from 'astro:content';
import type { DashCatalog } from './dashboard.ts';
import { topicMeta } from './topics.ts';

export async function dashCatalog(): Promise<DashCatalog> {
  const topics = (await getCollection('topics')).sort((a, b) => a.data.order - b.data.order);
  const exercises = await getCollection('exercises');
  const vocab = (await getCollection('vocab')).sort((a, b) => a.data.order - b.data.order);
  const tests = (await getCollection('tests')).sort((a, b) => a.data.no - b.data.no);

  const exCount = new Map<string, number>();
  for (const e of exercises) exCount.set(e.data.topic, (exCount.get(e.data.topic) ?? 0) + e.data.items.length);

  const exSets = [...exCount.entries()]
    .map(([id, n]) => ({ id, n, meta: topicMeta(id) }))
    .sort((a, b) => a.meta.order - b.meta.order)
    .map(({ id, n, meta }) => ({ id, n, title: meta.title, kind: meta.kind }));

  return {
    topics: topics.map((t) => {
      const ex = t.data.exercises ?? t.id;
      return { id: t.id, title: t.data.title, kind: t.data.kind, ex: exCount.has(ex) ? ex : null };
    }),
    exSets,
    vocab: vocab.map((v) => ({ id: v.id, n: v.data.words.length })),
    tests: tests.map((t) => ({ id: t.id, no: t.data.no, n: t.data.questions.length })),
  };
}
