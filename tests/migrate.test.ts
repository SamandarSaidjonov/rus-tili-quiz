import { beforeEach, describe, expect, it } from 'vitest';
import {
  MIGRATED_KEY, mergeIntoStats, planMigration, runMigration, setOfDrillId, setOfWordId,
} from '../src/lib/migrate.ts';
import {
  LEGACY_OLD_KEY, LEGACY_PREFIX, clearAllProgress, readStats, writeJson, writeRaw,
} from '../src/lib/progress.ts';

describe('id → тўплам', () => {
  it('сўз id сидан луғат тўпламини топади', () => {
    expect(setOfWordId('t01')).toBe('001-vaqt');
    expect(setOfWordId('w17')).toBe('002-ob-havo');
    expect(setOfWordId('f80')).toBe('003-feellar');
    expect(setOfWordId('d12')).toBe(null);
  });

  it('машқ id сини аралаш тўпламга юборади', () => {
    expect(setOfDrillId('d12')).toBe('mixed');
    expect(setOfDrillId('t01')).toBe(null);
  });
});

describe('planMigration', () => {
  it('эски 1-дарсни иккита луғат тўпламига бўлади', () => {
    const targets = planMigration([
      {
        phase: 'end',
        ans: [
          { id: 't01', ok: true },
          { id: 't02', ok: false },
          { id: 'w05', ok: true },
        ],
      },
    ]);
    const ids = targets.map((t) => t.id).sort();
    expect(ids).toEqual(['001-vaqt', '002-ob-havo']);
    const vaqt = targets.find((t) => t.id === '001-vaqt')!;
    expect(vaqt.kind).toBe('vocab');
    expect(vaqt.items).toEqual({ t01: true, t02: false });
    expect(vaqt.finished).toBe(true);
  });

  it('машқларни ex тўпламига юборади', () => {
    const targets = planMigration([{ phase: 'q', ans: [{ id: 'd03', ok: false }] }]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.kind).toBe('ex');
    expect(targets[0]!.id).toBe('mixed');
    expect(targets[0]!.finished).toBe(false);
  });

  it('бузуқ маълумотни ташлаб кетади', () => {
    expect(planMigration([null, undefined, {}, { ans: [{ id: 'zzz', ok: true }] }])).toEqual([]);
  });
});

describe('mergeIntoStats', () => {
  it('янги натижа устун туради, эскиси фақат бўш жойга ёзилади', () => {
    const now = 1000;
    const merged = mergeIntoStats(
      { v: 1, items: { t01: { ok: false, at: 2000 } } },
      { kind: 'vocab', id: '001-vaqt', items: { t01: true, t02: true }, finished: true },
      now,
    );
    expect(merged.items.t01).toEqual({ ok: false, at: 2000 });
    expect(merged.items.t02).toEqual({ ok: true, at: now });
    expect(merged.best).toEqual({ correct: 2, total: 2, at: now });
  });

  it('тугамаган сессиядан натижа ёзилмайди', () => {
    const merged = mergeIntoStats(
      { v: 1, items: {} },
      { kind: 'vocab', id: '001-vaqt', items: { t01: true }, finished: false },
      1,
    );
    expect(merged.best).toBeUndefined();
  });
});

describe('runMigration', () => {
  beforeEach(() => {
    clearAllProgress();
  });

  it('эски калитларни бир марта кўчиради', () => {
    writeJson(`${LEGACY_PREFIX}2`, {
      phase: 'end',
      ans: [
        { id: 'f01', ok: true },
        { id: 'f02', ok: false },
      ],
    });
    writeJson(`${LEGACY_PREFIX}m1`, { phase: 'q', ans: [{ id: 'd01', ok: true }] });

    const first = runMigration();
    expect(first.ran).toBe(true);
    expect(readStats('vocab', '003-feellar').items.f01).toMatchObject({ ok: true });
    expect(readStats('vocab', '003-feellar').best).toMatchObject({ correct: 1, total: 2 });
    expect(readStats('ex', 'mixed').items.d01).toMatchObject({ ok: true });

    const second = runMigration();
    expect(second.ran).toBe(false);
  });

  it('энг эски калитни ҳам ўқийди', () => {
    writeJson(LEGACY_OLD_KEY, { phase: 'end', ans: [{ id: 't01', ok: true }] });
    runMigration();
    expect(readStats('vocab', '001-vaqt').items.t01).toMatchObject({ ok: true });
  });

  it('эски маълумот бўлмаса ҳам хато бермайди', () => {
    const res = runMigration();
    expect(res.ran).toBe(false);
    expect(res.sets).toEqual([]);
  });

  it('кўчирилганини белгилаб қўяди', () => {
    writeRaw(`${LEGACY_PREFIX}1`, 'бузуқ маълумот');
    runMigration();
    expect(readStats('vocab', '001-vaqt').items).toEqual({});
    expect(runMigration().ran).toBe(false);
    expect(MIGRATED_KEY).toBe('rt2:migrated');
  });
});
