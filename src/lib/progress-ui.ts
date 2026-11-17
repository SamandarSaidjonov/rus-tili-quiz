/**
 * Статик саҳифалардаги прогресс ёзувларини `localStorage` дан тўлдиради.
 * HTML'да: `<span data-prog="vocab:001-vaqt:55"></span>`, `<div data-prog-bar="vocab:001-vaqt:55">`.
 */
import { answeredCount, readStats, type Kind } from './progress.ts';

function parse(spec: string): { kind: Kind; id: string; total: number } | null {
  const [kind, id, total] = spec.split(':');
  if (!kind || !id) return null;
  if (kind !== 'vocab' && kind !== 'ex' && kind !== 'test' && kind !== 'topic') return null;
  return { kind, id, total: Number(total) || 0 };
}

function statusText(kind: Kind, id: string, total: number): string {
  const stats = readStats(kind, id);
  const { answered, correct } = answeredCount(stats);

  if (kind === 'test') {
    if (stats.last) {
      const best = stats.best ? ` · энг яхши: ${stats.best.correct}/${stats.best.total}` : '';
      return `Охирги натижа: ${stats.last.correct}/${stats.last.total}${best}`;
    }
    return 'Топширилмаган';
  }

  if (!answered) return 'Ҳали бошланмаган';
  const wrong = answered - correct;
  const unit = kind === 'vocab' ? 'сўз' : 'машқ';
  const best = stats.best ? ` · энг яхши: ${stats.best.correct}/${stats.best.total}` : '';
  return `${answered} / ${total} ${unit} · ✓ ${correct} · ✗ ${wrong}${best}`;
}

export function hydrateProgress(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-prog]').forEach((el) => {
    const spec = parse(el.dataset.prog ?? '');
    if (!spec) return;
    el.textContent = statusText(spec.kind, spec.id, spec.total);
  });

  root.querySelectorAll<HTMLElement>('[data-prog-bar]').forEach((el) => {
    const spec = parse(el.dataset.progBar ?? '');
    if (!spec || !spec.total) return;
    const { answered } = answeredCount(readStats(spec.kind, spec.id));
    const pct = Math.min(100, Math.round((answered / spec.total) * 100));
    const fill = el.querySelector<HTMLElement>('.bar__fill');
    if (fill) fill.style.width = `${pct}%`;
    el.setAttribute('aria-valuenow', String(answered));
  });

  root.querySelectorAll<HTMLElement>('[data-prog-seen]').forEach((el) => {
    const id = el.dataset.progSeen ?? '';
    const seen = readStats('topic', 'read').items[id];
    if (seen) {
      el.textContent = 'Ўқилди';
      el.classList.add('badge--good');
    } else {
      el.textContent = 'Ўқилмаган';
    }
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

function sumOf(kind: Kind, sets: Array<{ id: string; n: number }>): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const s of sets) {
    total += s.n;
    answered += answeredCount(readStats(kind, s.id)).answered;
  }
  return { answered, total };
}

/** Бош саҳифадаги тўртта бўлим учун қисқа ҳолат. */
export function homeSummaries(catalog: Catalog): Record<string, Summary> {
  const read = readStats('topic', 'read');
  const seen = catalog.topics.filter((id) => read.items[id]).length;

  const vocab = sumOf('vocab', catalog.vocab);
  const ex = sumOf('ex', catalog.ex);
  const taken = catalog.tests.filter((id) => readStats('test', id).last).length;

  return {
    mavzular: {
      text: catalog.topics.length
        ? `${catalog.topics.length} мавзу · ${seen} таси ўқилди`
        : 'Мавзулар ҳозир тайёрланмоқда',
      pct: catalog.topics.length ? (seen / catalog.topics.length) * 100 : 0,
    },
    mashqlar: {
      text: ex.total ? `${ex.answered} / ${ex.total} машқ ишланди` : 'Машқлар ҳозир тайёрланмоқда',
      pct: ex.total ? (ex.answered / ex.total) * 100 : 0,
    },
    lugatlar: {
      text: vocab.total ? `${vocab.answered} / ${vocab.total} сўз жавоб берилган` : 'Луғат бўш',
      pct: vocab.total ? (vocab.answered / vocab.total) * 100 : 0,
    },
    testlar: {
      text: catalog.tests.length
        ? `${taken} / ${catalog.tests.length} тест топширилган`
        : 'Тестлар ҳозир тайёрланмоқда',
      pct: catalog.tests.length ? (taken / catalog.tests.length) * 100 : 0,
    },
  };
}

export function hydrateHome(catalog: Catalog, root: ParentNode = document): void {
  const sums = homeSummaries(catalog);
  for (const [key, s] of Object.entries(sums)) {
    const el = root.querySelector<HTMLElement>(`[data-sum="${key}"]`);
    if (el) el.textContent = s.text;
    const fill = root.querySelector<HTMLElement>(`[data-sum-bar="${key}"] .bar__fill`);
    if (fill) fill.style.width = `${Math.round(s.pct)}%`;
  }
}
