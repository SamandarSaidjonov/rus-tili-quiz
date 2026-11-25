/** Натижа фоизининг ранги: 0–59 қизил, 60–88 сариқ, 89–100 яшил (яхлитланган фоиз бўйича). */
export type Level = 'low' | 'mid' | 'high';

export function level(pct: number): Level {
  const p = Math.round(pct);
  return p >= 89 ? 'high' : p >= 60 ? 'mid' : 'low';
}

/** Чизиқ, ҳалқа ва рақамлар учун класс. */
export const levelClass = (pct: number): string => `rt-lvl--${level(pct)}`;

/** Элементга даражани қўяди (аввалгисини олиб ташлаб). */
export function setLevel(el: Element | null | undefined, pct: number): void {
  if (!el) return;
  el.classList.remove('rt-lvl--low', 'rt-lvl--mid', 'rt-lvl--high');
  el.classList.add(levelClass(pct));
}

/** Балл фоизда (бутун сон). Ҳеч қачон 100 га яхлитланмайди, агар битта бўлса ҳам хато бор бўлса. */
export const scorePct = (correct: number, total: number): number =>
  !total ? 0 : correct >= total ? 100 : Math.min(99, Math.round((correct / total) * 100));
