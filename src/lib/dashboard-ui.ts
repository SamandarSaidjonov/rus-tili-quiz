/**
 * «Натижалар» саҳифаси ва бош саҳифадаги умумий прогресс ҳалқаси.
 * Саҳифа скелети йиғиш пайтида чизилади, рақамлар эса `localStorage` дан шу ерда тўлдирилади.
 */
import { ICONS, type IconName } from './icons.ts';
import {
  PASS, WEAK_MIN, computeDashboard, type DashCatalog, type Dashboard, type TestRow, type TopicRow,
} from './dashboard.ts';
import { level, levelClass, setLevel } from './level.ts';
import { TEST_GROUPS } from './tests.ts';
import { TOPIC_GROUPS } from './topics.ts';
import { url } from './url.ts';

const round = (n: number): number => Math.round(n);

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

const icon = (name: IconName): string =>
  `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

const lvlBadge = (pct: number, text: string, ic?: IconName): string =>
  `<span class="rt-badge rt-badge--lvl ${levelClass(pct)}">${ic ? icon(ic) : ''}${esc(text)}</span>`;

const badge = (kind: 'ok' | 'todo', text: string, ic?: IconName): string =>
  `<span class="rt-badge rt-badge--${kind}">${ic ? icon(ic) : ''}${esc(text)}</span>`;

/** Бўлим карточкаларидаги икки қатор матн ва фоиз. */
export interface SectionText {
  main: string;
  sub: string;
  pct: number;
}

export function sectionTexts(d: Dashboard): Record<'mavzular' | 'mashqlar' | 'lugatlar' | 'testlar', SectionText> {
  const accLine = (p: Dashboard['ex'], empty: string): string =>
    p.acc === null ? empty : `${round(p.acc)}% тўғри · ${p.wrong} та хато`;

  return {
    mavzular: {
      main: `${round(d.topics.pct)}% · ${d.topics.done} / ${d.topics.total} та ўқилган`,
      sub: d.topics.done >= d.topics.total ? 'Ҳаммаси ўқилган' : `${d.topics.total - d.topics.done} таси қолди`,
      pct: d.topics.pct,
    },
    mashqlar: {
      main: `${round(d.ex.pct)}% · ${d.ex.done} / ${d.ex.total} та машқ`,
      sub: accLine(d.ex, 'Ҳали бошланмаган'),
      pct: d.ex.pct,
    },
    lugatlar: {
      main: `${round(d.vocab.pct)}% · ${d.vocab.done} / ${d.vocab.total} та сўз`,
      sub: accLine(d.vocab, 'Ҳали бошланмаган'),
      pct: d.vocab.pct,
    },
    testlar: {
      main: `${round(d.tests.pct)}% · ${d.tests.done} / ${d.tests.total} та ўтилган`,
      sub: d.tests.taken
        ? `${d.tests.taken} таси топширилган · ўртача ${round(d.tests.avg ?? 0)}%`
        : 'Ҳали топширилмаган',
      pct: d.tests.pct,
    },
  };
}

export function activityLine(d: Dashboard): string | null {
  const parts: string[] = [];
  if (d.streak) parts.push(`${d.streak} кун кетма-кет`);
  if (d.today) parts.push(`бугун ${d.today} та жавоб`);
  return parts.length ? parts.join(' · ') : null;
}

function fillRing(root: ParentNode, value: number): void {
  const v = Math.max(0, Math.min(100, round(value)));
  root.querySelectorAll<HTMLElement>('[data-ring]').forEach((el) => {
    el.querySelector('.rt-ring__fill')?.setAttribute('stroke-dasharray', `${v} 100`);
    setLevel(el, v);
    const num = el.querySelector('.rt-ring__num');
    if (num) num.textContent = `${v}%`;
    el.setAttribute('aria-valuenow', String(v));
  });
}

function fillCommon(d: Dashboard, root: ParentNode): void {
  fillRing(root, d.overall);

  const activity = activityLine(d);
  root.querySelectorAll<HTMLElement>('[data-activity]').forEach((el) => {
    if (activity) el.textContent = activity;
  });

  root.querySelectorAll<HTMLAnchorElement>('[data-next]').forEach((el) => {
    if (!d.next) return;
    el.href = url(d.next.path);
    const label = el.querySelector('[data-next-text]');
    if (label) label.textContent = d.next.text;
    el.hidden = false;
  });
}

/** Бош саҳифа: умумий ҳалқа ва тўртта бўлим карточкаси. */
export function hydrateHomeDashboard(cat: DashCatalog, root: ParentNode = document): void {
  const d = computeDashboard(cat);
  fillCommon(d, root);

  const texts = sectionTexts(d);
  const line = (started: boolean, all: number, done: number, unit: string, verb: string): string =>
    !all ? 'Ҳозир тайёрланмоқда' : !started ? 'Ҳали бошланмаган' : `${all} та ${unit}дан ${done} таси ${verb}`;
  const short: Record<string, string> = {
    mavzular: line(d.topics.done > 0, d.topics.total, d.topics.done, 'мавзу', 'ўқилган'),
    mashqlar: line(d.ex.done > 0, d.ex.total, d.ex.done, 'машқ', 'бажарилган'),
    lugatlar: line(d.vocab.done > 0, d.vocab.total, d.vocab.done, 'сўз', 'сўралган'),
    testlar: line(d.tests.taken > 0, d.tests.total, d.tests.done, 'тест', 'ўтилган'),
  };
  for (const [key, s] of Object.entries(texts)) {
    const el = root.querySelector<HTMLElement>(`[data-sum="${key}"]`);
    if (el && short[key]) el.textContent = short[key];
    const fill = root.querySelector<HTMLElement>(`[data-sum-bar="${key}"] i`);
    if (fill) fill.style.width = `${round(s.pct)}%`;
    setLevel(fill?.parentElement, s.pct);
  }
}

function accBadge(r: TopicRow): string {
  const p = r.ex;
  if (!p || p.acc === null) return badge('todo', 'Бошланмаган');
  const text = `${round(p.acc)}% тўғри`;
  if (r.weak) return lvlBadge(p.acc, text, 'alert');
  if (p.done < WEAK_MIN || level(p.acc) !== 'high') return lvlBadge(p.acc, text);
  return lvlBadge(p.acc, text, 'check');
}

function rowHtml(r: TopicRow): string {
  const href = r.ex ? url(`mashqlar/${r.id}`) : url(`mavzular/${r.topic}`);
  const read =
    r.read === null ? '' : r.read ? badge('ok', 'Ўқилди', 'check') : badge('todo', 'Ўқилмаган');
  const p = r.ex;
  const progress = p
    ? `<span class="rt-bar ${levelClass(p.pct)}" role="progressbar" aria-label="Бажарилган машқлар" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${round(p.pct)}%"></i></span>
       <span class="rt-drow__count">${p.done} / ${p.total}</span>`
    : '<span class="rt-drow__count rt-muted">Машқ йўқ</span>';
  return `<li><a class="rt-drow${r.weak ? ' rt-drow--weak' : ''}" href="${href}">
    <span class="rt-drow__head">
      <span class="rt-drow__title" lang="${r.kind === 'mixed' ? 'uz' : 'ru'}">${esc(r.title)}</span>
      ${accBadge(r)}
    </span>
    <span class="rt-drow__line">${read}${progress}</span>
  </a></li>`;
}

/** «Натижалар» саҳифаси. */
export function hydrateResults(cat: DashCatalog, root: ParentNode = document): void {
  const d = computeDashboard(cat);
  fillCommon(d, root);

  const texts = sectionTexts(d);
  for (const [key, s] of Object.entries(texts)) {
    const card = root.querySelector<HTMLElement>(`[data-dsec="${key}"]`);
    if (!card) continue;
    const main = card.querySelector('[data-dsec-main]');
    const sub = card.querySelector('[data-dsec-sub]');
    const fill = card.querySelector<HTMLElement>('.rt-bar i');
    if (main) main.textContent = s.main;
    if (sub) sub.textContent = s.sub;
    if (fill) fill.style.width = `${round(s.pct)}%`;
    setLevel(fill?.parentElement, s.pct);
  }

  // Тестлар: ҳар бир тест битта белги.
  const testsBox = root.querySelector<HTMLElement>('[data-dtests]');
  if (testsBox) {
    const item = (t: TestRow): string => {
        const b =
          t.best === null
            ? badge('todo', t.title)
            : t.passed
              ? lvlBadge(t.best, `${t.title} · ${round(t.best)}%`, 'check')
              : lvlBadge(t.best, `${t.title} · ${round(t.best)}%`, 'cross');
        return `<li><a class="rt-dtest" href="${url(`testlar/${t.id}`)}">${b}</a></li>`;
    };
    testsBox.innerHTML = TEST_GROUPS.map((g) => {
      const rows = d.tests.rows.filter((t) => t.group === g.group);
      if (!rows.length) return '';
      return `<section class="rt-stack--tight rt-stack">
        <h3 class="rt-label">${g.title}</h3>
        <ul class="rt-dtests">${rows.map(item).join('')}</ul>
      </section>`;
    }).join('');
  }

  // Мавзулар бўйича: Падежлар, Феъллар, Аралаш.
  const rowsBox = root.querySelector<HTMLElement>('[data-drows]');
  if (rowsBox) {
    rowsBox.innerHTML = TOPIC_GROUPS.map((g) => {
      const rows = d.rows.filter((r) => r.kind === g.kind);
      if (!rows.length) return '';
      return `<section class="rt-stack--tight rt-stack">
        <h3 class="rt-label">${esc(g.title)}</h3>
        <ul class="rt-drows">${rows.map(rowHtml).join('')}</ul>
      </section>`;
    }).join('');
  }

  // Луғатда хато қилинган сўзлар.
  const mistakes = root.querySelector<HTMLElement>('[data-dmistakes]');
  if (mistakes && d.vocab.wrong > 0) {
    const text = mistakes.querySelector('[data-dmistakes-text]');
    if (text) text.textContent = `Луғатда хато қилинган сўзлар: ${d.vocab.wrong} та`;
    mistakes.hidden = false;
  }
}

/** Изоҳлардаги чегара: «70%». */
export const PASS_PCT = `${round(PASS * 100)}%`;
