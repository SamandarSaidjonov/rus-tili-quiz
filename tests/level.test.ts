import { expect, it } from 'vitest';
import { level } from '../src/lib/level.ts';
import { makePacks } from '../src/lib/packs.ts';
import type { ExerciseSet } from '../src/lib/types.ts';

it('ранг чегаралари', () => {
  expect([0, 59, 60, 88, 88.4, 89, 100].map(level)).toEqual(['low', 'low', 'mid', 'mid', 'mid', 'high', 'high']);
});

it('аралаш машқлар: ҳар бири аниқ бир марта, 10 тадан', () => {
  const set = (type: string, n: number) =>
    ({ topic: 'mixed', type, items: Array.from({ length: n }, (_, i) => ({ id: `${type}${i}` })) }) as ExerciseSet;
  const packs = makePacks([set('fix', 14), set('ending', 11)]);
  expect(packs.map((p) => p.ids.length)).toEqual([10, 10, 5]);
  expect(new Set(packs.flatMap((p) => p.ids)).size).toBe(25);
  expect(packs[0]!.groups.map((g) => g.items.length)).toEqual([5, 5]);
});
