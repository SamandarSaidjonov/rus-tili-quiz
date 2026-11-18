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

export interface Catalog {
  topics: string[];
  vocab: Array<{ id: string; n: number }>;
  ex: Array<{ id: string; n: number }>;
  tests: string[];
}

interface Summary {
  text: string;
  pct: number;
}

function sumOf(
  kind: Kind,
  sets: Array<{ id: string; n: number }>,
): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const s of sets) {
    total += s.n;
    answered += answeredCount(readStats(kind, s.id)).answered;
  }
  return { answered, total };
}

/** Бош саҳифадаги тўртта бўлим карточкаси учун қисқа ҳолат. */
export function homeSummaries(catalog: Catalog): Record<string, Summary> {
  const read = readStats('topic', 'read');
  const seen = catalog.topics.filter((id) => read.items[id]).length;

  const vocab = sumOf('vocab', catalog.vocab);
  const ex = sumOf('ex', catalog.ex);
  const taken = catalog.tests.filter((id) => readStats('test', id).last).length;

  const line = (done: number, all: number, unit: string, verb: string): string =>
    !all ? 'Ҳозир тайёрланмоқда' : !done ? 'Ҳали бошланмаган' : `${all} та ${unit}дан ${done} таси ${verb}`;

  return {
    mavzular: {
      text: line(seen, catalog.topics.length, 'мавзу', 'ўқилган'),
      pct: catalog.topics.length ? (seen / catalog.topics.length) * 100 : 0,
    },
    mashqlar: {
      text: line(ex.answered, ex.total, 'машқ', 'бажарилган'),
      pct: ex.total ? (ex.answered / ex.total) * 100 : 0,
    },
    lugatlar: {
      text: line(vocab.answered, vocab.total, 'сўз', 'сўралган'),
      pct: vocab.total ? (vocab.answered / vocab.total) * 100 : 0,
    },
    testlar: {
      text: line(taken, catalog.tests.length, 'тест', 'топширилган'),
      pct: catalog.tests.length ? (taken / catalog.tests.length) * 100 : 0,
    },
  };
}

export function hydrateHome(catalog: Catalog, root: ParentNode = document): void {
  const sums = homeSummaries(catalog);
  for (const [key, s] of Object.entries(sums)) {
    const el = root.querySelector<HTMLElement>(`[data-sum="${key}"]`);
    if (el) el.textContent = s.text;
    const fill = root.querySelector<HTMLElement>(`[data-sum-bar="${key}"] i`);
    if (fill) fill.style.width = `${Math.round(s.pct)}%`;
  }
}
