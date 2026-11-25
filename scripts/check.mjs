/**
 * Контентни текширувчи скрипт: `npm run check`.
 * Хатолар (ERROR) — тузатилиши шарт. Тўлдирилмаган жойлар (TODO) — иш давом этаётган қисмлар.
 * `npm run check:final` да TODO лар ҳам хато деб ҳисобланади (тайёр бўлиш мезонлари учун).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FINAL = process.argv.includes('--final');
const ALL = process.argv.includes('--all');
const CONTENT = join(ROOT, 'src/content');

const errors = [];
const todos = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const todo = (file, msg) => todos.push(`${file}: ${msg}`);

const ACCENT = '́';
const LATIN = /[A-Za-z]/;
const VOWELS = /[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g;

const EXERCISE_TYPES = [
  'translate', 'fix', 'ending', 'bracket', 'preposition',
  'pronoun', 'adjective', 'identify', 'plural', 'question', 'choose',
  'verb', 'tense', 'infinitive',
];

/** Бўш жой ёки қавс тўлдириладиган турлар. */
const GAP_TYPES = ['ending', 'bracket', 'preposition', 'pronoun', 'adjective', 'plural', 'verb'];
const TENSE_NAMES = ['настоящее', 'прошедшее', 'будущее'];
const INFINITIVE_END = /(ть|ти|чь|ться|тись|чься)$/;

/** Падеж мавзуси саҳифасида бўлиши керак бўлган қисмлар (2.1-бўлим). */
const TOPIC_SECTIONS = [
  'Қисқача', 'Саволлар', 'Қачон ишлатилади', 'Предлог',
  'Отларнинг қўшимчалари', 'Сифат', 'Олмош', 'Мисол гаплар', 'Хато', 'Эслаб қол',
];

/** Феъл мавзуси (`kind: verb`) саҳифасидаги 10 қисм. */
const VERB_TOPIC_SECTIONS = [
  'Қисқача', 'Қандай ясалади', 'Шакллар жадвали', 'Қачон ишлатилади', 'Истиснолар',
  'Урғу', 'Луғатдаги феъллар', 'Мисол гаплар', 'Хато', 'Эслаб қол',
];

const norm = (s) =>
  String(s ?? '')
    .replace(/́/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(rel(file), `JSON ўқилмади — ${e.message}`);
    return null;
  }
}

/** Ҳар қандай контент матнида лотин ҳарфи бўлмаслиги керак. */
function noLatin(file, label, text) {
  if (text && LATIN.test(text)) {
    err(rel(file), `${label} да лотин ҳарфи бор: «${String(text).slice(0, 60)}»`);
  }
}

const splitWords = (text) =>
  String(text ?? '')
    .split(/[\s,.;:!?()«»"'\-–—/]+/)
    .filter((w) => /[а-яёА-ЯЁ]/.test(w));

/** Урғу олмайдиган предлоглар: день ото дня́. */
const UNSTRESSED = ['ото', 'изо', 'передо'];

const needsAccent = (word) =>
  !UNSTRESSED.includes(word.toLowerCase()) &&
  (word.match(VOWELS) ?? []).length >= 2 && !word.includes(ACCENT) && !/[ёЁ]/.test(word);

/**
 * Луғат сарлавҳа сўзида ҳар бир кўп бўғинли сўзда урғу бўлиши керак.
 */
function checkAccentHead(file, label, text) {
  for (const w of splitWords(String(text ?? '').replace(/\*/g, ''))) {
    if (needsAccent(w)) {
      todo(rel(file), `${label}: «${w}» да урғу белгиси йўқ`);
      return;
    }
  }
}

/**
 * Мисол гапда камида ажратиб кўрсатилган сўзда (`*сўз*`) урғу бўлиши керак.
 * Бутун гапни урғулаш шарт эмас — дарсликларда ҳам шундай.
 */
function checkAccentStars(file, label, text) {
  const stars = [...String(text ?? '').matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);
  if (!stars.length) {
    const words = splitWords(text);
    if (words.length && words.every((w) => !w.includes(ACCENT)) && words.some(needsAccent)) {
      todo(rel(file), `${label}: гапда урғу белгиси йўқ`);
    }
    return;
  }
  for (const s of stars) {
    for (const w of splitWords(s)) {
      if (needsAccent(w)) {
        todo(rel(file), `${label}: ажратилган «${w}» сўзида урғу белгиси йўқ`);
        return;
      }
    }
  }
}

/* ================= Луғат ================= */

function checkVocab() {
  const dir = join(CONTENT, 'vocab');
  let files = [];
  try {
    files = walk(dir).filter((f) => f.endsWith('.json') && !basename(f).startsWith('_'));
  } catch {
    todo('src/content/vocab', 'Луғат папкаси йўқ');
    return { ids: new Set(), words: 0 };
  }

  const ids = new Set();
  let words = 0;

  for (const file of files) {
    const data = readJson(file);
    if (!data) continue;
    const f = rel(file);
    if (!data.title) err(f, 'title йўқ');
    if (typeof data.order !== 'number') err(f, 'order (рақам) йўқ');
    if (!Array.isArray(data.words) || !data.words.length) {
      err(f, 'words рўйхати бўш');
      continue;
    }
    noLatin(file, 'title', data.title);
    noLatin(file, 'note', data.note);

    for (const w of data.words) {
      words++;
      if (!w.id) {
        err(f, 'id йўқ сўз бор');
        continue;
      }
      if (ids.has(w.id)) err(f, `id такрорланган: ${w.id}`);
      ids.add(w.id);
      if (!w.ru) err(f, `${w.id}: ru йўқ`);
      if (!w.uz) err(f, `${w.id}: uz йўқ`);
      noLatin(file, `${w.id}.uz`, w.uz);
      noLatin(file, `${w.id}.ru`, w.ru);
      noLatin(file, `${w.id}.note`, w.note);
      checkAccentHead(file, `${w.id}.ru`, w.ru);
      if (!w.pos) todo(f, `${w.id}: сўз туркуми (pos) тўлдирилмаган`);
      if (!w.note || !String(w.note).trim()) todo(f, `${w.id}: изоҳ йўқ`);
      if (!w.example || !w.example.ru) todo(f, `${w.id}: русча мисол гап йўқ`);
      else {
        checkAccentStars(file, `${w.id}.example.ru`, w.example.ru);
        noLatin(file, `${w.id}.example.ru`, w.example.ru);
      }
      if (!w.example || !w.example.uz) todo(f, `${w.id}: мисолнинг ўзбекча таржимаси йўқ`);
      else noLatin(file, `${w.id}.example.uz`, w.example.uz);
    }
  }
  return { ids, words };
}

/* ================= Машқлар ================= */

function checkExercises() {
  const dir = join(CONTENT, 'exercises');
  let files = [];
  try {
    files = walk(dir).filter((f) => f.endsWith('.json') && !basename(f).startsWith('_'));
  } catch {
    todo('src/content/exercises', 'Машқлар папкаси йўқ');
    return { ids: new Set(), items: 0, topics: new Map() };
  }

  const ids = new Set();
  const topics = new Map(); // topic → Map(type → count)
  let items = 0;

  for (const file of files) {
    const data = readJson(file);
    if (!data) continue;
    const f = rel(file);
    const folder = basename(dirname(file));
    const name = basename(file, '.json');

    if (data.topic !== folder) err(f, `topic («${data.topic}») папка номи («${folder}») билан мос эмас`);
    if (data.type !== name) err(f, `type («${data.type}») файл номи («${name}») билан мос эмас`);
    if (!EXERCISE_TYPES.includes(data.type)) err(f, `нотаниш тур: ${data.type}`);
    if (!Array.isArray(data.items) || !data.items.length) {
      err(f, 'items рўйхати бўш');
      continue;
    }
    noLatin(file, 'ask', data.ask);

    const byType = topics.get(data.topic) ?? new Map();
    byType.set(data.type, (byType.get(data.type) ?? 0) + data.items.length);
    topics.set(data.topic, byType);

    for (const it of data.items) {
      items++;
      if (!it.id) {
        err(f, 'id йўқ машқ бор');
        continue;
      }
      if (ids.has(it.id)) err(f, `id такрорланган: ${it.id}`);
      ids.add(it.id);

      if (!it.prompt) err(f, `${it.id}: prompt йўқ`);
      if (!Array.isArray(it.answers) || !it.answers.length) err(f, `${it.id}: answers йўқ`);
      if (!it.note || !String(it.note).trim()) err(f, `${it.id}: изоҳ йўқ`);
      noLatin(file, `${it.id}.prompt`, it.prompt);
      noLatin(file, `${it.id}.note`, it.note);
      noLatin(file, `${it.id}.hints`, it.hints);
      noLatin(file, `${it.id}.ask`, it.ask);
      (it.answers ?? []).forEach((a, i) => noLatin(file, `${it.id}.answers[${i}]`, a));

      // Жавоблар такрорланмаслиги керак
      const seen = new Set();
      for (const a of it.answers ?? []) {
        const n = norm(a);
        if (seen.has(n)) err(f, `${it.id}: бир хил жавоб икки марта ёзилган`);
        seen.add(n);
      }

      // Машқ белгилари
      const hasGap = /_{2,}/.test(it.prompt ?? '');
      const hasBracket = /\([^)]+\)/.test(it.prompt ?? '');
      const hasTarget = /\[\[[^\]]+\]\]/.test(it.prompt ?? '');
      if (data.type === 'verb') {
        if (!hasBracket) err(f, `${it.id}: verb турида матнда «(инфинитив)» белгиси бўлиши керак`);
      } else if (GAP_TYPES.includes(data.type)) {
        if (!hasGap && !hasBracket) err(f, `${it.id}: матнда «___» ёки «(сўз)» белгиси йўқ`);
      }
      if (['identify', 'question', 'tense', 'infinitive'].includes(data.type) && !hasTarget) {
        err(f, `${it.id}: матнда «[[сўз]]» белгиси йўқ`);
      }
      if (['translate', 'fix'].includes(data.type) && (hasGap || hasTarget)) {
        err(f, `${it.id}: бу турда «___» ёки «[[сўз]]» белгиси бўлмаслиги керак`);
      }

      if (data.type === 'choose') {
        if (!Array.isArray(it.options) || it.options.length !== 4) {
          err(f, `${it.id}: choose турида 4 та вариант бўлиши керак`);
        } else {
          const opts = it.options.map(norm);
          if (new Set(opts).size !== opts.length) err(f, `${it.id}: вариантлар такрорланган`);
          const right = it.options.filter((o) => (it.answers ?? []).some((a) => norm(a) === norm(o)));
          if (right.length !== 1) err(f, `${it.id}: вариантлар орасида аниқ битта тўғри жавоб бўлиши керак`);
          it.options.forEach((o, i) => noLatin(file, `${it.id}.options[${i}]`, o));
        }
      } else if (it.options) {
        err(f, `${it.id}: options фақат choose турида бўлади`);
      }

      if (data.type === 'identify') {
        const ok = (it.answers ?? []).every((a) =>
          ['именительный', 'родительный', 'дательный', 'винительный', 'творительный', 'предложный'].includes(
            norm(a),
          ),
        );
        if (!ok) err(f, `${it.id}: жавоб падежнинг тўлиқ номи бўлиши керак`);
      }

      if (data.type === 'tense') {
        const ok = (it.answers ?? []).every((a) => TENSE_NAMES.includes(norm(a)));
        if (!ok) err(f, `${it.id}: жавоб «настоящее», «прошедшее» ёки «будущее» бўлиши керак`);
      }

      if (data.type === 'infinitive') {
        const bad = (it.answers ?? []).find((a) => !INFINITIVE_END.test(norm(a)));
        if (bad) err(f, `${it.id}: «${bad}» инфинитив эмас (-ть, -ти, -чь, -ться, -тись, -чься)`);
      }
    }
  }

  // Ҳар бир мавзуда камида 8 тур × 10 машқ
  for (const [topic, byType] of topics) {
    const types = [...byType.entries()];
    const full = types.filter(([, n]) => n >= 10);
    if (types.length < 8) todo(`exercises/${topic}`, `${types.length} тур бор, камида 8 тур керак`);
    for (const [type, n] of types) {
      if (n < 10) todo(`exercises/${topic}/${type}`, `${n} та машқ бор, камида 10 та керак`);
    }
    if (full.length < 8) {
      todo(`exercises/${topic}`, `тўлиқ (10 тадан) турлар: ${full.length} / 8`);
    }
  }

  return { ids, items, topics };
}

/* ================= Тестлар ================= */

function checkTests() {
  const dir = join(CONTENT, 'tests');
  let files = [];
  try {
    files = walk(dir).filter((f) => f.endsWith('.json') && !basename(f).startsWith('_'));
  } catch {
    todo('src/content/tests', 'Тестлар папкаси йўқ');
    return { ids: new Set(), count: 0 };
  }

  const ids = new Set();
  for (const file of files) {
    const data = readJson(file);
    if (!data) continue;
    const f = rel(file);
    if (typeof data.no !== 'number') err(f, 'no (рақам) йўқ');
    if (!data.title) err(f, 'title йўқ');
    if (!Array.isArray(data.questions)) {
      err(f, 'questions рўйхати йўқ');
      continue;
    }
    if (data.questions.length !== 10) err(f, `${data.questions.length} та савол бор, 10 та бўлиши керак`);

    for (const q of data.questions) {
      if (!q.id) {
        err(f, 'id йўқ савол бор');
        continue;
      }
      if (ids.has(q.id)) err(f, `id такрорланган: ${q.id}`);
      ids.add(q.id);
      if (!q.prompt) err(f, `${q.id}: prompt йўқ`);
      if (!q.note || !String(q.note).trim()) err(f, `${q.id}: изоҳ йўқ`);
      noLatin(file, `${q.id}.prompt`, q.prompt);
      noLatin(file, `${q.id}.promptExtra`, q.promptExtra);
      noLatin(file, `${q.id}.note`, q.note);
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        err(f, `${q.id}: 4 та вариант бўлиши керак`);
        continue;
      }
      q.options.forEach((o, i) => noLatin(file, `${q.id}.options[${i}]`, o));
      const opts = q.options.map(norm);
      if (new Set(opts).size !== opts.length) err(f, `${q.id}: вариантлар такрорланган`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
        err(f, `${q.id}: answer 0–3 орасида бўлиши керак`);
      }
      if (!['topic', 'vocab', 'exercise'].includes(q.kind)) err(f, `${q.id}: kind нотўғри`);
    }
  }
  return { ids, count: files.length };
}

/* ================= Мавзулар ================= */

function checkTopics() {
  const dir = join(CONTENT, 'topics');
  let files = [];
  try {
    files = walk(dir).filter((f) => f.endsWith('.mdx') && !basename(f).startsWith('_'));
  } catch {
    todo('src/content/topics', 'Мавзулар папкаси йўқ');
    return { count: 0 };
  }

  for (const file of files) {
    const f = rel(file);
    const raw = readFileSync(file, 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    if (!fm) {
      err(f, 'frontmatter йўқ');
      continue;
    }
    const head = fm[1];
    for (const key of ['title:', 'short:', 'order:']) {
      if (!head.includes(key)) err(f, `frontmatter да ${key} йўқ`);
    }
    const body = raw.slice(fm[0].length);
    const kind = /^kind:\s*(\S+)/m.exec(head)?.[1] ?? 'case';
    if (!['case', 'verb'].includes(kind)) err(f, `kind нотўғри: ${kind} (case ёки verb)`);
    const sections = kind === 'verb' ? VERB_TOPIC_SECTIONS : TOPIC_SECTIONS;

    const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1]);
    for (const section of sections) {
      if (!headings.some((h) => h.toLowerCase().includes(section.toLowerCase()))) {
        todo(f, `«${section}» қисми йўқ`);
      }
    }

    const accents = (body.match(/́/g) ?? []).length;
    const minAccents = kind === 'verb' ? 40 : 20;
    if (accents < minAccents) {
      todo(f, `урғу белгиси кам (${accents} та, камида ${minAccents}) — русча мисолларда урғу бўлиши керак`);
    }

    // Код ва ҳаволалардан ташқари жойда лотин ҳарфи бўлмаслиги керак
    const text = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/\]\([^)]*\)/g, '] ')
      .replace(/<[^>]+>/g, ' ');
    const latin = text.match(/[A-Za-z]{2,}/g);
    if (latin) todo(f, `лотин ёзуви бор: ${[...new Set(latin)].slice(0, 5).join(', ')}`);
    // Рим рақами ҳам лотин ҳарфи: «I спряжение» эмас, «1-спряжение».
    const roman = text.match(/(?<![A-Za-z])[IVX]{1,4}(?![A-Za-z])/g);
    if (roman) err(f, `Рим рақами бор: ${[...new Set(roman)].join(', ')} — «1-спряжение» деб ёзинг`);
  }
  return { count: files.length };
}

/* ================= Натижа ================= */

const vocab = checkVocab();
const ex = checkExercises();
const tests = checkTests();
const topics = checkTopics();

const cross = [...ex.ids].filter((id) => vocab.ids.has(id) || tests.ids.has(id));
if (cross.length) todo('id', `турли бўлимларда бир хил id: ${cross.slice(0, 5).join(', ')}`);

console.log('Контент текшируви');
console.log('─'.repeat(50));
console.log(`Мавзулар:  ${topics.count} та файл`);
console.log(`Машқлар:   ${ex.items} та машқ, ${ex.topics.size} та тўплам`);
console.log(`Луғат:     ${vocab.words} та сўз`);
console.log(`Тестлар:   ${tests.count} та тест, ${tests.ids.size} та савол`);
console.log('─'.repeat(50));

if (errors.length) {
  console.log(`\nХАТО (${errors.length}):`);
  for (const e of (ALL ? errors : errors.slice(0, 60))) console.log(`  ✗ ${e}`);
  if (!ALL && errors.length > 60) console.log(`  … яна ${errors.length - 60} та`);
}

if (todos.length) {
  console.log(`\nТЎЛДИРИЛМАГАН (${todos.length}):`);
  const shown = ALL ? todos : todos.slice(0, 25);
  for (const t of shown) console.log(`  · ${t}`);
  if (todos.length > shown.length) console.log(`  … яна ${todos.length - shown.length} та`);
}

if (!errors.length && !todos.length) console.log('\nҲаммаси жойида.');

const failed = errors.length > 0 || (FINAL && todos.length > 0);
if (failed) {
  console.log(`\nНатижа: ${errors.length} хато${FINAL ? `, ${todos.length} тўлдирилмаган жой` : ''}.`);
  process.exit(1);
}
console.log(`\nНатижа: хато йўқ${todos.length ? `, ${todos.length} тўлдирилмаган жой бор` : ''}.`);
