/**
 * «Натижалар» саҳифаси ва бош саҳифадаги умумий прогресс учун ҳисоб-китоб (DOM'сиз).
 *
 * - Ҳар бир бўлимнинг ўз фоизи бор; умумий фоиз — бўлимлар фоизининг ўртачаси
 *   (тўртта бўлим тенг улушда, ҳар бири 25%).
 * - Машқ ва луғатда «бажарилди» = жавоб берилган (хато бўлса ҳам); тўғрилиги алоҳида кўрсатилади.
 * - Тест 70% ва ундан юқори натижа билан «ўтилди» ҳисобланади (энг яхши натижа бўйича).
 */
import { answeredCount, dayKey, readDays, readStats, type Kind, type SetStats } from './progress.ts';
import type { TopicKind } from './topics.ts';

/** Тестдан ўтиш чегараси. */
export const PASS = 0.7;
/** Мавзу «заиф» деб белгиланиши учун тўғрилик шу чегарадан паст бўлиши керак. */
export const WEAK = 0.7;
/** Камида шунча машққа жавоб берилмаса, тўғрилик ҳали баҳоланмайди. */
export const WEAK_MIN = 5;

/** Саҳифа йиғилаётганда контентдан тузиладиган рўйхат. */
export interface DashCatalog {
  topics: Array<{ id: string; title: string; kind: TopicKind; ex: string | null }>;
  exSets: Array<{ id: string; title: string; kind: TopicKind; n: number }>;
  vocab: Array<{ id: string; n: number }>;
  tests: Array<{ id: string; no: number; n: number }>;
}

export type Reader = (kind: Kind, id: string) => SetStats;

export interface Part {
  done: number;
  total: number;
  /** 0–100 */
  pct: number;
}

export interface Practice extends Part {
  correct: number;
  /** 0–100; жавоб бўлмаса `null`. */
  acc: number | null;
  /** Охирги марта хато қилинганлар сони. */
  wrong: number;
}

export interface TestRow {
  id: string;
  no: number;
  /** Энг яхши натижа (0–100); топширилмаган бўлса `null`. */
  best: number | null;
  passed: boolean;
}

export interface TestsPart extends Part {
  taken: number;
  /** Топширилган тестлар энг яхши натижасининг ўртачаси (0–100). */
  avg: number | null;
  rows: TestRow[];
}

export interface TopicRow {
  /** Машқлар тўплами (бўлмаса мавзу slug'и). */
  id: string;
  title: string;
  kind: TopicKind;
  /** Мавзу саҳифаси бор бўлса — унинг slug'и. */
  topic: string | null;
  /** `null` — бу қаторнинг мавзу саҳифаси йўқ (масалан, аралаш машқлар). */
  read: boolean | null;
  ex: Practice | null;
  weak: boolean;
}

export interface NextStep {
  path: string;
  text: string;
}

export interface Dashboard {
  overall: number;
  topics: Part;
  ex: Practice;
  vocab: Practice;
  tests: TestsPart;
  rows: TopicRow[];
  streak: number;
  today: number;
  next: NextStep | null;
}

const pct = (done: number, total: number): number => (total ? (done / total) * 100 : 0);

function practice(kind: Kind, id: string, n: number, read: Reader): Practice {
  const stats = read(kind, id);
  const { answered, correct } = answeredCount(stats);
  // Контентдан ўчирилган эски id'лар ҳисобни 100% дан оширмасин.
  const done = Math.min(answered, n);
  const ok = Math.min(correct, done);
  const wrong = Object.values(stats.items).filter((r) => r && r.ok === false).length;
  return {
    done,
    total: n,
    pct: pct(done, n),
    correct: ok,
    acc: done ? (ok / done) * 100 : null,
    wrong,
  };
}

function sumPractice(parts: Practice[]): Practice {
  const done = parts.reduce((a, p) => a + p.done, 0);
  const total = parts.reduce((a, p) => a + p.total, 0);
  const correct = parts.reduce((a, p) => a + p.correct, 0);
  const wrong = parts.reduce((a, p) => a + p.wrong, 0);
  return { done, total, pct: pct(done, total), correct, acc: done ? (correct / done) * 100 : null, wrong };
}

export const isWeak = (p: Practice | null): boolean =>
  !!p && p.acc !== null && p.done >= WEAK_MIN && p.acc < WEAK * 100;

/** Кетма-кет фаол кунлар: бугундан (бугун ҳали ишланмаган бўлса — кечадан) орқага. */
export function streakOf(days: Iterable<string>, now: number): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Жавоб берилган тўпламлар (мавзу ўқилгани бу ерга кирмайди). */
function answerStats(cat: DashCatalog, read: Reader): SetStats[] {
  return [
    ...cat.exSets.map((s) => read('ex', s.id)),
    ...cat.vocab.map((s) => read('vocab', s.id)),
    ...cat.tests.map((t) => read('test', t.id)),
  ];
}

function nextStep(rows: TopicRow[], tests: TestRow[]): NextStep | null {
  const weakest = rows
    .filter((r) => r.weak && r.ex)
    .sort((a, b) => (a.ex!.acc ?? 0) - (b.ex!.acc ?? 0))[0];
  if (weakest) return { path: `mashqlar/${weakest.id}`, text: `Такрорланг: ${weakest.title}` };

  const unread = rows.find((r) => r.read === false && r.topic);
  if (unread) return { path: `mavzular/${unread.topic}`, text: `Кейинги мавзу: ${unread.title}` };

  const practiceLeft = rows.find((r) => r.ex && r.ex.done < r.ex.total);
  if (practiceLeft) return { path: `mashqlar/${practiceLeft.id}`, text: `Машқ: ${practiceLeft.title}` };

  const test = tests.find((t) => !t.passed);
  if (test) return { path: `testlar/${test.id}`, text: `Тест ${test.no}` };

  return null;
}

export function computeDashboard(
  cat: DashCatalog,
  read: Reader = readStats,
  now: number = Date.now(),
  days: string[] = readDays(),
): Dashboard {
  // Мавзулар
  const seen = read('topic', 'read').items;
  const readCount = cat.topics.filter((t) => seen[t.id]).length;
  const topics: Part = { done: readCount, total: cat.topics.length, pct: pct(readCount, cat.topics.length) };

  // Машқлар (тўплам = мавзу папкаси)
  const exById = new Map(cat.exSets.map((s) => [s.id, practice('ex', s.id, s.n, read)]));
  const ex = sumPractice([...exById.values()]);

  // Луғатлар
  const vocab = sumPractice(cat.vocab.map((s) => practice('vocab', s.id, s.n, read)));

  // Тестлар
  const testRows: TestRow[] = cat.tests.map((t) => {
    const best = read('test', t.id).best;
    const ratio = best && best.total ? best.correct / best.total : null;
    return { id: t.id, no: t.no, best: ratio === null ? null : ratio * 100, passed: ratio !== null && ratio >= PASS };
  });
  const taken = testRows.filter((t) => t.best !== null);
  const passed = testRows.filter((t) => t.passed).length;
  const tests: TestsPart = {
    done: passed,
    total: cat.tests.length,
    pct: pct(passed, cat.tests.length),
    taken: taken.length,
    avg: taken.length ? taken.reduce((a, t) => a + (t.best ?? 0), 0) / taken.length : null,
    rows: testRows,
  };

  // Умумий: фақат контенти бор бўлимлар, тенг улушда.
  const parts = [topics, ex, vocab, tests].filter((p) => p.total > 0);
  const overall = parts.length ? parts.reduce((a, p) => a + p.pct, 0) / parts.length : 0;

  // Мавзулар бўйича қаторлар: аввал мавзу саҳифалари, кейин мавзусиз машқ тўпламлари (аралаш).
  const rows: TopicRow[] = cat.topics.map((t) => {
    const p = t.ex ? exById.get(t.ex) ?? null : null;
    return { id: t.ex ?? t.id, title: t.title, kind: t.kind, topic: t.id, read: !!seen[t.id], ex: p, weak: isWeak(p) };
  });
  const linked = new Set(cat.topics.map((t) => t.ex).filter(Boolean));
  for (const s of cat.exSets) {
    if (linked.has(s.id)) continue;
    const p = exById.get(s.id)!;
    rows.push({ id: s.id, title: s.title, kind: s.kind, topic: null, read: null, ex: p, weak: isWeak(p) });
  }

  // Фаол кунлар: алоҳида ёзилган рўйхат + эски жавобларнинг вақти (рўйхат пайдо бўлишидан олдингилари).
  const today = dayKey(now);
  const active = new Set(days);
  for (const r of Object.values(seen)) if (r && typeof r.at === 'number') active.add(dayKey(r.at));
  let todayCount = 0;
  for (const s of answerStats(cat, read)) {
    for (const r of Object.values(s.items)) {
      if (!r || typeof r.at !== 'number') continue;
      const k = dayKey(r.at);
      active.add(k);
      if (k === today) todayCount++;
    }
  }

  return {
    overall,
    topics,
    ex,
    vocab,
    tests,
    rows,
    streak: streakOf(active, now),
    today: todayCount,
    next: nextStep(rows, testRows),
  };
}
