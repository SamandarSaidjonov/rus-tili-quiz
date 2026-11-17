/** Ҳавола: GitHub Pages'да сайт `/rus-tili-quiz/` ичида туради. */
const BASE = import.meta.env.BASE_URL || '/';

/** `url('lugatlar')` → `/rus-tili-quiz/lugatlar/` */
export function url(path = ''): string {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  const clean = String(path).replace(/^\/+/, '');
  if (!clean) return base;
  return `${base}${clean}${clean.endsWith('/') || clean.includes('.') ? '' : '/'}`;
}

export const SECTIONS = [
  { key: 'mavzular', title: 'Мавзулар', hint: 'Тушунтириш ва жадваллар' },
  { key: 'mashqlar', title: 'Машқлар', hint: 'Жавобни ўзингиз ёзасиз' },
  { key: 'lugatlar', title: 'Луғатлар', hint: 'Сўзларни ёдлаш' },
  { key: 'testlar', title: 'Тестлар', hint: '10 та саволли тестлар' },
] as const;

export type SectionKey = (typeof SECTIONS)[number]['key'];
