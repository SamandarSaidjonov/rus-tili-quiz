import { describe, expect, it } from 'vitest';
import { computeDashboard, streakOf, type DashCatalog, type Reader } from '../src/lib/dashboard.ts';
import { dayKey, type Kind, type SetStats } from '../src/lib/progress.ts';

const NOW = new Date(2026, 10, 21, 12).getTime();
const DAY = 24 * 60 * 60 * 1000;

const cat: DashCatalog = {
  topics: [
    { id: 'predlozhnyy', title: 'Предложный падеж', kind: 'case', ex: 'predlozhnyy' },
    { id: 'datelnyy', title: 'Дательный падеж', kind: 'case', ex: 'datelnyy' },
    { id: 'vinitelnyy', title: 'Винительный падеж', kind: 'case', ex: null },
    { id: 'nastoyashchee', title: 'Настоящее время', kind: 'verb', ex: null },
  ],
  exSets: [
    { id: 'datelnyy', title: 'Дательный падеж', kind: 'case', n: 10 },
    { id: 'predlozhnyy', title: 'Предложный падеж', kind: 'case', n: 10 },
    { id: 'mixed', title: 'Аралаш мавзулар', kind: 'mixed', n: 20 },
  ],
  vocab: [{ id: 'v1', n: 50 }],
  tests: [
    { id: 'test-001', no: 1, n: 10 },
    { id: 'test-002', no: 2, n: 10 },
  ],
};

/** `{ 'ex:predlozhnyy': [true, false, …] }` → Reader */
function reader(data: Record<string, Partial<SetStats> & { answers?: boolean[]; at?: number }>): Reader {
  return (kind: Kind, id: string): SetStats => {
    const d = data[`${kind}:${id}`];
    if (!d) return { v: 1, items: {} };
    const items = { ...(d.items ?? {}) };
    (d.answers ?? []).forEach((ok, i) => (items[`q${i}`] = { ok, at: d.at ?? NOW }));
    return { v: 1, items, best: d.best, last: d.last };
  };
}

describe('computeDashboard', () => {
  it('ҳеч нарса қилинмаган бўлса, ҳаммаси 0', () => {
    const d = computeDashboard(cat, reader({}), NOW, []);
    expect(d.overall).toBe(0);
    expect(d.streak).toBe(0);
    expect(d.today).toBe(0);
    expect(d.next?.path).toBe('mavzular/predlozhnyy');
  });

  it('10 та мавзудан 3 таси ўқилса — 30%', () => {
    const topics = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, title: `T${i}`, kind: 'case' as const, ex: null }));
    const items = { t0: { ok: true, at: NOW }, t1: { ok: true, at: NOW }, t2: { ok: true, at: NOW } };
    const d = computeDashboard({ ...cat, topics }, reader({ 'topic:read': { items } }), NOW, []);
    expect(d.topics.pct).toBe(30);
  });

  it('умумий фоиз — бўлимларнинг тенг улушли ўртачаси', () => {
    const d = computeDashboard(
      cat,
      reader({
        'topic:read': { items: { predlozhnyy: { ok: true, at: NOW }, datelnyy: { ok: true, at: NOW } } }, // 50%
        'ex:predlozhnyy': { answers: Array(10).fill(true) }, // 10 / 40 = 25%
        'vocab:v1': { answers: Array(50).fill(true) }, // 100%
      }),
      NOW,
      [],
    );
    // тестлар 0%: (50 + 25 + 100 + 0) / 4
    expect(d.overall).toBeCloseTo(43.75);
  });

  it('тест 70% дан ўтилади, 60% да ўтилмайди', () => {
    const d = computeDashboard(
      cat,
      reader({
        'test:test-001': { best: { correct: 7, total: 10, at: NOW } },
        'test:test-002': { best: { correct: 6, total: 10, at: NOW } },
      }),
      NOW,
      [],
    );
    expect(d.tests.taken).toBe(2);
    expect(d.tests.done).toBe(1);
    expect(d.tests.pct).toBe(50);
    expect(d.tests.avg).toBeCloseTo(65);
    expect(d.tests.rows.map((r) => r.passed)).toEqual([true, false]);
  });

  it('машқда бажарилган ва тўғрилик алоҳида; эски id лар 100% дан оширмайди', () => {
    const d = computeDashboard(
      cat,
      reader({ 'ex:datelnyy': { answers: [...Array(9).fill(true), ...Array(3).fill(false)] } }),
      NOW,
      [],
    );
    const row = d.rows.find((r) => r.id === 'datelnyy')!;
    expect(row.ex?.done).toBe(10);
    expect(row.ex?.pct).toBe(100);
    expect(row.ex?.correct).toBe(9);
    expect(row.ex?.wrong).toBe(3);
  });

  it('тўғрилик 70% дан паст бўлса мавзу заиф ва кейинги қадам шу мавзу', () => {
    const d = computeDashboard(
      cat,
      reader({
        'ex:predlozhnyy': { answers: [true, true, false, false, false, true] }, // 50%
        'ex:datelnyy': { answers: [true, false, false] }, // 3 та — ҳали баҳоланмайди
      }),
      NOW,
      [],
    );
    expect(d.rows.find((r) => r.id === 'predlozhnyy')?.weak).toBe(true);
    expect(d.rows.find((r) => r.id === 'datelnyy')?.weak).toBe(false);
    expect(d.next).toEqual({ path: 'mashqlar/predlozhnyy', text: 'Такрорланг: Предложный падеж' });
  });

  it('мавзусиз машқ тўплами (аралаш) алоҳида қатор бўлади', () => {
    const d = computeDashboard(cat, reader({}), NOW, []);
    const mixed = d.rows.find((r) => r.id === 'mixed')!;
    expect(mixed.read).toBe(null);
    expect(mixed.kind).toBe('mixed');
    expect(d.rows.filter((r) => r.id === 'predlozhnyy')).toHaveLength(1);
  });

  it('бугунги жавоблар ва кетма-кет кунлар жавоб вақтидан ҳам олинади', () => {
    const d = computeDashboard(
      cat,
      reader({ 'vocab:v1': { answers: [true, false] }, 'ex:mixed': { answers: [true], at: NOW - DAY } }),
      NOW,
      [dayKey(NOW - 2 * DAY)],
    );
    expect(d.today).toBe(2);
    expect(d.streak).toBe(3);
  });
});

describe('streakOf', () => {
  it('бугун ишланмаган бўлса, кечадан бошлаб ҳисоблайди', () => {
    expect(streakOf([dayKey(NOW - DAY), dayKey(NOW - 2 * DAY)], NOW)).toBe(2);
  });

  it('орада бўш кун бўлса, узилади', () => {
    expect(streakOf([dayKey(NOW), dayKey(NOW - 2 * DAY)], NOW)).toBe(1);
  });

  it('кеча ҳам, бугун ҳам ишланмаган бўлса — 0', () => {
    expect(streakOf([dayKey(NOW - 2 * DAY)], NOW)).toBe(0);
  });
});
