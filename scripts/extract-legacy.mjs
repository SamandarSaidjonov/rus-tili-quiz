/**
 * Эски сайтдан (public/legacy/index.html) маълумотни олиб, src/content ичига JSON қилиб ёзади.
 * Фақат бир марта ишлатилади, кейин маълумот манбаси — src/content.
 * id'лар ўзгармайди: t01…, w01…, f01…, d01…
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'public/legacy/index.html'), 'utf8');

const start = html.indexOf('const LESSONS=[');
const end = html.indexOf('// ---- UI ----');
if (start < 0 || end < 0) throw new Error('Эски файлдаги маълумот блоки топилмади');
const dataSrc = html.slice(start, end);

const sandbox = { RAW: null, DRAW: null, CASES: null, DTYPES: null, NEAR: null, CONFLICT: null, LESSONS: null };
const fn = new Function(`${dataSrc}\nreturn {RAW,DRAW,CASES,DTYPES,NEAR,CONFLICT,LESSONS};`);
Object.assign(sandbox, fn());
const { RAW, DRAW, CASES } = sandbox;

const ACC = (s) => (s || '').replace(/'/g, '\u0301');

/* ---------- Луғат: 3 тўплам (мавзу бўйича) ---------- */

const SETS = [
  { file: '001-vaqt.json', topic: 'v', title: 'Вақт', order: 1,
    source: 'daftar', pages: '1-дарс · 23–30-бетлар',
    note: 'Дафтардаги вақт сўзлари. Такрорланганлари бир мартадан олинган.' },
  { file: '002-ob-havo.json', topic: 'h', title: 'Об-ҳаво', order: 2,
    source: 'daftar', pages: '1-дарс · 23–30-бетлар',
    note: 'Дафтардаги об-ҳаво сўзлари.' },
  { file: '003-feellar.json', topic: 'f', title: 'Феъллар', order: 3,
    source: 'daftar', pages: '2-дарс · 37–40-бетлар',
    note: 'Жуфтликда (масалан, чита́ть / прочита́ть) биринчиси — несовершенный вид: жараён ёки такрорланадиган иш. Иккинчиси — совершенный вид: иш тугаган, натижа бор. Дафтардаги 80 та қатордан 5 таси такрор эди, улар бир марта олинган.' },
];

const vocabDir = join(root, 'src/content/vocab');
mkdirSync(vocabDir, { recursive: true });

let wordCount = 0;
for (const set of SETS) {
  const words = RAW.filter((r) => r[1] === set.topic).map(([id, , cluster, ru, uz, ex, exUz, note]) => {
    const w = {
      id,
      ru: ACC(ru),
      uz,
      pos: set.topic === 'f' ? 'глагол' : '',
      cluster,
      source: 'daftar',
      reviewed: false,
    };
    if (ex || exUz) w.example = { ru: ACC(ex || ''), uz: exUz || '' };
    if (note) w.note = ACC(note);
    return w;
  });
  wordCount += words.length;
  const out = {
    title: set.title,
    pages: set.pages,
    order: set.order,
    source: set.source,
    note: set.note,
    words,
  };
  writeFileSync(join(vocabDir, set.file), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`vocab/${set.file}: ${words.length} та сўз`);
}

/* ---------- Машқлар: эски 81 та машқ → аралаш бўлим ---------- */

const TYPE = { tr: 'translate', fix: 'fix', end: 'ending', br: 'bracket', pr: 'preposition', pn: 'pronoun', adj: 'adjective', id: 'identify' };

const mixedDir = join(root, 'src/content/exercises/mixed');
mkdirSync(mixedDir, { recursive: true });

const byType = new Map();
for (const [id, type, cs, prompt, answers, hints, note] of DRAW) {
  const key = TYPE[type];
  if (!key) throw new Error(`Нотаниш машқ тури: ${type}`);
  if (!byType.has(key)) byType.set(key, []);
  const item = {
    id,
    case: cs,
    prompt,
    answers: key === 'identify' ? [CASES[answers]] : answers.split('|').map((s) => s.trim()).filter(Boolean),
    note: ACC(note),
    source: 'claude',
    reviewed: false,
  };
  if (hints) item.hints = hints;
  byType.get(key).push(item);
}

let drillCount = 0;
for (const [type, items] of byType) {
  drillCount += items.length;
  const out = { topic: 'mixed', type, title: 'Аралаш', items };
  writeFileSync(join(mixedDir, `${type}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`exercises/mixed/${type}.json: ${items.length} та машқ`);
}

console.log(`\nЖами: ${wordCount} та сўз, ${drillCount} та машқ`);
