/**
 * Аралаш машқларни «№-1, №-2 …» тўпламларига бўлади (10 тадан).
 * Тартиб қатъий: ҳар бир турнинг 1-машқи, кейин 2-машқи ва ҳоказо — шунда ҳар бир № ичида
 * турлар аралаш келади. Янги машқни файл охирига қўшинг.
 */
import type { ExerciseSet } from './types.ts';

export const PACK_SIZE = 10;

export interface Pack {
  no: number;
  ids: string[];
  groups: ExerciseSet[];
}

export function makePacks(sets: ExerciseSet[], size = PACK_SIZE): Pack[] {
  const sorted = [...sets].sort((a, b) => (a.type < b.type ? -1 : 1));
  const flat: string[] = [];
  const longest = Math.max(0, ...sorted.map((s) => s.items.length));
  for (let i = 0; i < longest; i++) {
    for (const s of sorted) if (s.items[i]) flat.push(s.items[i]!.id);
  }
  const packs: Pack[] = [];
  for (let i = 0; i < flat.length; i += size) {
    const ids = flat.slice(i, i + size);
    packs.push({
      no: packs.length + 1,
      ids,
      groups: sorted
        .map((s) => ({ ...s, items: s.items.filter((it) => ids.includes(it.id)) }))
        .filter((s) => s.items.length > 0),
    });
  }
  return packs;
}
