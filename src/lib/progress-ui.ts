/**
 * Статик саҳифалардаги прогресс ёзувларини `localStorage` дан тўлдиради.
 * HTML'да бошланғич матн (масалан «55 та сўз») ёзилган бўлади; прогресс бўлса,
 * шу матн алмаштирилади, бўлмаса ўз жойида қолади.
 *
 * `<p data-prog="vocab:001-vaqt:55">`, `<span data-prog-bar="vocab:001-vaqt:55"><i></i></span>`,
 * `<span data-prog-badge="test:test-001:10">`, `<span data-prog-seen="predlozhnyy">`.
 */
import { ICONS } from './icons.ts';
import { setLevel } from './level.ts';
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
    setLevel(el, pct);
    el.setAttribute('aria-valuenow', String(answered));
  });

  // Тестлар рўйхатидаги белги: охирги натижа ёки «Топширилмаган».
  root.querySelectorAll<HTMLElement>('[data-prog-badge]').forEach((el) => {
    const spec = parse(el.dataset.progBadge ?? '');
    if (!spec) return;
    const stats = readStats(spec.kind, spec.id);
    if (!stats.last) return;
    el.classList.remove('rt-badge--todo');
    el.classList.add('rt-badge--lvl');
    setLevel(el, (stats.last.correct / stats.last.total) * 100);
    el.textContent = `${stats.last.correct}/${stats.last.total}`;
  });

  // Аралаш машқларнинг бир қисми (№-1 …): `data-pack="mixed"`, `data-ids="id1 id2"`.
  root.querySelectorAll<HTMLElement>('[data-pack]').forEach((el) => {
    const { items } = readStats('ex', el.dataset.pack ?? '');
    const ids = (el.dataset.ids ?? '').split(' ').filter(Boolean);
    const done = ids.filter((id) => items[id]);
    if (!done.length) return;
    const correct = done.filter((id) => items[id]!.ok).length;
    const meta = el.querySelector('[data-pack-meta]');
    if (meta) meta.textContent = `${done.length} / ${ids.length} та машқ ишланган`;
    const badge = el.querySelector('[data-pack-badge]');
    if (!badge) return;
    badge.classList.remove('rt-badge--todo');
    badge.classList.add('rt-badge--lvl');
    setLevel(badge, (correct / done.length) * 100);
    badge.textContent = `${correct}/${done.length}`;
  });

  // Бир нечта тўплам ёки тест йиғиндиси: `data-sum-kind="test"`, `data-sum-ids="a b"`
  // ёки `data-sum-kind="ex"`, `data-sum-ids="mixed:150"`.
  root.querySelectorAll<HTMLElement>('[data-sum-kind]').forEach((el) => {
    const kind = el.dataset.sumKind as Kind;
    let done = 0;
    let total = 0;
    for (const part of (el.dataset.sumIds ?? '').split(' ').filter(Boolean)) {
      const [id = '', n = '0'] = part.split(':');
      const stats = readStats(kind, id);
      if (kind === 'test') {
        total += 1;
        if (stats.best) done += 1;
      } else {
        total += Number(n);
        done += Math.min(answeredCount(stats).answered, Number(n));
      }
    }
    if (!done) return;
    const pct = (done / total) * 100;
    const meta = el.querySelector('[data-sum-meta]');
    if (meta) {
      meta.textContent =
        kind === 'test' ? `${done} / ${total} та тест топширилган` : `${done} / ${total} та машқ ишланган`;
    }
    const bar = el.querySelector<HTMLElement>('.rt-bar');
    setLevel(bar, pct);
    const fill = bar?.querySelector<HTMLElement>('i');
    if (fill) fill.style.width = `${Math.round(pct)}%`;
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
