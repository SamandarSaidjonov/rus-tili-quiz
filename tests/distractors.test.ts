import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONFLICT, conflictsOf, indexWords, pickOptions, sameMeaning } from '../src/lib/distractors.ts';
import { norm } from '../src/lib/text.ts';
import type { VocabWord } from '../src/lib/types.ts';

const dir = join(process.cwd(), 'src/content/vocab');
const words: VocabWord[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).words as VocabWord[]);

const indexed = indexWords(words);

describe('луғат маълумоти', () => {
  it('1039 та сўз бор ва id лар такрорланмайди', () => {
    expect(words.length).toBe(1039);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
  });

  it('эски id лар сақланган', () => {
    for (const id of ['t01', 'w01', 'f01', 'f80']) {
      expect(words.some((w) => w.id === id)).toBe(true);
    }
  });
});

describe('pickOptions', () => {
  it('ҳар бир сўз учун 4 та турли вариант беради', () => {
    for (const w of words) {
      const opts = pickOptions(w.id, indexed);
      expect(opts).toHaveLength(4);
      expect(new Set(opts).size).toBe(4);
      expect(opts).toContain(w.id);
    }
  });

  it('вариантларнинг русча ёзилиши такрорланмайди', () => {
    for (const w of words) {
      const opts = pickOptions(w.id, indexed);
      const texts = opts.map((id) => norm(words.find((x) => x.id === id)!.ru));
      expect(new Set(texts).size).toBe(4);
    }
  });

  it('иккита тўғри жавоб бўлиши мумкин жуфтлар бирга чиқмайди', () => {
    for (const [a, b] of CONFLICT) {
      for (let i = 0; i < 2; i++) {
        expect(pickOptions(a, indexed)).not.toContain(b);
        expect(pickOptions(b, indexed)).not.toContain(a);
      }
    }
  });

  it('маъноси ёки русча шакли бир хил сўзлар бирга чиқмайди', () => {
    for (const t of indexed) {
      for (const id of pickOptions(t.word.id, indexed)) {
        if (id === t.word.id) continue;
        expect(sameMeaning(t, indexed.find((x) => x.word.id === id)!)).toBe(false);
      }
    }
  });

  it('conflictsOf жуфтни иккала томондан топади', () => {
    expect(conflictsOf('t02').has('t35')).toBe(true);
    expect(conflictsOf('t35').has('t02')).toBe(true);
  });
});
