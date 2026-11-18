/**
 * 24×24 чизиқли иконкалар (`design/assets/Icons`). Ранги `currentColor`,
 * шунинг учун саҳифага инлайн SVG бўлиб қўйилади ва атрофдаги матн рангини олади.
 * Иконка ҳеч қачон ёлғиз ўзи маъно ташимайди: ёнида сўз ёки `aria-label` бўлади.
 */
export type IconName =
  | 'alert'
  | 'arrow-left'
  | 'arrow-right'
  | 'book'
  | 'cards'
  | 'check'
  | 'chevron-right'
  | 'cross'
  | 'pencil'
  | 'speaker'
  | 'test';

const line = (d: string, width = '1.8'): string =>
  `<g fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

export const ICONS: Record<IconName, string> = {
  alert: line(
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6v5.2" stroke-width="2.2"/><path d="M12 16.3v.2" stroke-width="2.6"/>',
  ),
  'arrow-left': line('<path d="M19 12H5.5M11 6l-6 6 6 6"/>'),
  'arrow-right': line('<path d="M5 12h13.5M13 6l6 6-6 6"/>'),
  book: line(
    '<path d="M12 6.5C10 5 7.5 4.5 4 5v13.5c3.5-.5 6 0 8 1.5 2-1.5 4.5-2 8-1.5V5c-3.5-.5-6 0-8 1.5z"/><path d="M12 6.5V20"/>',
  ),
  cards: line(
    '<rect x="3.5" y="7" width="12.5" height="13.5" rx="2"/><path d="M8 3.5h10.5a2 2 0 0 1 2 2V16"/><path d="M7 16.5l2.7-6.5 2.7 6.5M8 14.3h3.4"/>',
  ),
  // ✓ ва ✗ чизиғи қалинроқ: 2.4px
  check: line('<path d="M5 12.5l4.5 4.5L19 7.5"/>', '2.4'),
  'chevron-right': line('<path d="M9.5 6l6 6-6 6"/>'),
  cross: line('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', '2.4'),
  pencil: line(
    '<path d="M4.5 19.5l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L9 18.5z"/><path d="M13.8 6.7l3.5 3.5"/>',
  ),
  speaker:
    '<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  test: line(
    '<path d="M10.5 6.5h9.5M10.5 12h9.5M10.5 17.5h9.5"/><path d="M3.8 6.6l1.5 1.5 2.6-3M3.8 12.1l1.5 1.5 2.6-3M3.8 17.6l1.5 1.5 2.6-3"/>',
  ),
};
