/**
 * Статик саҳифалардаги прогресс ёзувларини `localStorage` дан тўлдиради.
 * HTML'да бошланғич матн (масалан «55 та сўз») ёзилган бўлади; прогресс бўлса,
 * шу матн алмаштирилади, бўлмаса ўз жойида қолади.
 *
 * `<p data-prog="vocab:001-vaqt:55">`, `<span data-prog-bar="vocab:001-vaqt:55"><i></i></span>`,
 * `<span data-prog-badge="test:test-001:10">`, `<span data-prog-seen="predlozhnyy">`.
 */
import { ICONS } from './icons.ts';
import { answeredCount, readStats, type Kind } from './progress.ts';

function parse(spec: string): { kind: Kind; id: string; total: number } | null {
  const [kind, id, total] = spec.split(':');
  if (!kind || !id) return null;
  if (kind !== 'vocab' && kind !== 'ex' && kind !== 'test' && kind !== 'topic') return null;
  return { kind, id, total: Number(total) || 0 };
}

const icon = (name: 'check' | 'cross'): string =>
  `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

/** Прогресс бўлмаса `null` қайтади — HTML'даги бошланғич матн қолади. */
function statusText(kind: Kind, id: string, total: number): string | null {
  const stats = readStats(kind, id);

  if (kind === 'test') {
    return stats.best ? `Энг яхши натижа: ${stats.best.correct}/${stats.best.total}` : null;
  }

  const { answered, correct } = answeredCount(stats);
  if (!answered) return null;
  const wrong = answered - correct;
  const unit = kind === 'vocab' ? 'сўз' : 'машқ';
  return `${answered} / ${total} та ${unit} · ${correct} тўғри · ${wrong} хато`;
}

export function hydrateProgress(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-prog]').forEach((el) => {
    const spec = parse(el.dataset.prog ?? '');
    if (!spec) return;
    const text = statusText(spec.kind, spec.id, spec.total);
    if (text) el.textContent = text;
  });

  root.querySelectorAll<HTMLElement>('[data-prog-bar]').forEach((el) => {
    const spec = parse(el.dataset.progBar ?? '');
    if (!spec || !spec.total) return;
    const { answered } = answeredCount(readStats(spec.kind, spec.id));
    const pct = Math.min(100, Math.round((answered / spec.total) * 100));
    const fill = el.querySelector<HTMLElement>('i');
    if (fill) fill.style.width = `${pct}%`;
    el.setAttribute('aria-valuenow', String(answered));
  });

  // Тестлар рўйхатидаги белги: охирги натижа ёки «Топширилмаган».
  root.querySelectorAll<HTMLElement>('[data-prog-badge]').forEach((el) => {
    const spec = parse(el.dataset.progBadge ?? '');
    if (!spec) return;
    const stats = readStats(spec.kind, spec.id);
    if (!stats.last) return;
    el.classList.remove('rt-badge--todo');
    el.classList.add('rt-badge--score');
    el.textContent = `${stats.last.correct}/${stats.last.total}`;
  });

  // Мавзу ўқилганми.
  root.querySelectorAll<HTMLElement>('[data-prog-seen]').forEach((el) => {
    const id = el.dataset.progSeen ?? '';
    if (!readStats('topic', 'read').items[id]) return;
    el.classList.remove('rt-badge--todo');
    el.classList.add('rt-badge--ok');
    el.innerHTML = `${icon('check')}Ўқилди`;
  });
}
