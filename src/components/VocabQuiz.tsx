/**
 * Луғат сўраш режими.
 * Савол фақат ўзбекча, 4 та вариант русча. Автоматик ўтиш йўқ,
 * «← Олдинги» ўтган саволни фақат кўриш учун очади.
 */
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { levelClass } from '../lib/level.ts';
import type { VocabSet, VocabWord } from '../lib/types.ts';
import { indexWords, pickOptions } from '../lib/distractors.ts';
import { shuffle } from '../lib/text.ts';
import {
  mistakeIds, readJson, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { Chip, Icon, Option, Progress, Ru, Speak, Verdict } from './bits.tsx';

type Count = 20 | 40 | 'all';

interface Cfg {
  sets: string[];
  count: Count;
  mistakes: boolean;
}

interface Answer {
  pick: string;
  ok: boolean;
}

interface Session {
  v: 1;
  cfg: Cfg;
  /** `opts` савол биринчи марта кўрсатилганда ҳисобланади (тезлик учун). */
  qs: Array<{ id: string; opts?: string[] }>;
  i: number;
  ans: Array<Answer | null>;
  finished: boolean;
}

interface Props {
  sets: VocabSet[];
  initialSets?: string[];
  initialMistakes?: boolean;
  homeHref: string;
  listHref: string;
}

const SESSION = sessionKey('vocab', 'main');

export default function VocabQuiz({
  sets, initialSets, initialMistakes, homeHref, listHref,
}: Props): JSX.Element {
  const byId = useMemo(() => {
    const m = new Map<string, { word: VocabWord; setId: string }>();
    for (const s of sets) for (const w of s.words) m.set(w.id, { word: w, setId: s.id });
    return m;
  }, [sets]);

  // Ҳавола орқали келган танлов: ?set=001-vaqt&set=002-ob-havo ёки ?mode=mistakes
  const query = useMemo(() => {
    if (typeof window === 'undefined') return { sets: [] as string[], mistakes: false, any: false };
    const p = new URLSearchParams(window.location.search);
    const qs = p.getAll('set').filter((id) => sets.some((s) => s.id === id));
    const mistakes = p.get('mode') === 'mistakes';
    return { sets: qs, mistakes, any: qs.length > 0 || mistakes };
  }, [sets]);

  const defaultCfg = useMemo<Cfg>(() => {
    const wanted = (query.sets.length ? query.sets : (initialSets ?? [])).filter((id) =>
      sets.some((s) => s.id === id),
    );
    return {
      sets: wanted.length ? wanted : sets.map((s) => s.id),
      count: 'all',
      mistakes: query.mistakes || Boolean(initialMistakes),
    };
  }, [sets, initialSets, initialMistakes, query]);

  const [cfg, setCfg] = useState<Cfg>(defaultCfg);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [empty, setEmpty] = useState<string | null>(null);

  const wordsOf = useCallback(
    (ids: string[]): VocabWord[] => sets.filter((s) => ids.includes(s.id)).flatMap((s) => s.words),
    [sets],
  );

  const build = useCallback(
    (next: Cfg, onlyIds?: string[]): Session | null => {
      const pool = wordsOf(next.sets.length ? next.sets : sets.map((s) => s.id));
      if (!pool.length) return null;

      let targets = pool;
      if (onlyIds?.length) {
        targets = onlyIds.map((id) => byId.get(id)?.word).filter(Boolean) as VocabWord[];
      } else if (next.mistakes) {
        const bad = new Set(sets.flatMap((s) => mistakeIds('vocab', s.id)));
        targets = pool.filter((w) => bad.has(w.id));
      }
      if (!targets.length) return null;

      let list = shuffle(targets);
      if (!onlyIds && next.count !== 'all') list = list.slice(0, next.count);

      return {
        v: 1,
        cfg: next,
        qs: list.map((w) => ({ id: w.id })),
        i: 0,
        ans: list.map(() => null),
        finished: false,
      };
    },
    [byId, sets, wordsOf],
  );

  const valid = useCallback(
    (s: Session | null): boolean =>
      Boolean(
        s && s.v === 1 && Array.isArray(s.qs) && s.qs.length && Array.isArray(s.ans) &&
        s.ans.length === s.qs.length && typeof s.i === 'number' &&
        s.qs.every(
          (q) =>
            byId.has(q.id) &&
            (q.opts == null ||
              (Array.isArray(q.opts) && q.opts.length === 4 && q.opts.every((o) => byId.has(o))))),
      ),
    [byId],
  );

  // Вариантларни танлаш учун индекс (бир марта тузилади)
  const indexedPool = useMemo(
    () => indexWords(wordsOf(cfg.sets.length ? cfg.sets : sets.map((x) => x.id))),
    [cfg.sets, sets, wordsOf],
  );

  const persist = useCallback((s: Session) => {
    setSession(s);
    writeJson(SESSION, s);
  }, []);

  // Биринчи очилишда: сақланган сессия бўлса давом этади, бўлмаса янгиси тузилади.
  // Ҳаволада танлов бўлса (?set=…), ҳар доим янги квиз бошланади.
  useEffect(() => {
    const saved = readJson<Session | null>(SESSION, null);
    if (!query.any && valid(saved)) {
      setSession(saved);
      return;
    }
    const fresh = build(defaultCfg);
    if (fresh) persist(fresh);
    else setEmpty(defaultCfg.mistakes ? 'Ҳозир хато қилинган сўз йўқ.' : 'Бу тўпламда сўз йўқ.');
  }, []);

  const start = useCallback(
    (next: Cfg, onlyIds?: string[]) => {
      const fresh = build(next, onlyIds);
      if (!fresh) {
        setEmpty(next.mistakes ? 'Ҳозир хато қилинган сўз йўқ.' : 'Танланган тўпламда сўз йўқ.');
        return;
      }
      setEmpty(null);
      setView(null);
      setCfg(next);
      persist(fresh);
    },
    [build, persist],
  );

  const answer = useCallback(
    (pick: string) => {
      if (!session || session.finished) return;
      const q = session.qs[session.i];
      if (!q || session.ans[session.i]) return;
      const ok = pick === q.id;
      const ans = session.ans.slice();
      ans[session.i] = { pick, ok };
      const setId = byId.get(q.id)?.setId;
      if (setId) recordAnswer('vocab', setId, q.id, ok);
      persist({ ...session, ans });
    },
    [byId, persist, session],
  );

  const next = useCallback(() => {
    if (!session) return;
    if (session.i + 1 >= session.qs.length) {
      const bySet = new Map<string, { c: number; t: number }>();
      session.qs.forEach((q, idx) => {
        const setId = byId.get(q.id)?.setId;
        if (!setId) return;
        const cur = bySet.get(setId) ?? { c: 0, t: 0 };
        cur.t += 1;
        if (session.ans[idx]?.ok) cur.c += 1;
        bySet.set(setId, cur);
      });
      for (const [setId, r] of bySet) recordScore('vocab', setId, r.c, r.t);
      persist({ ...session, finished: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    persist({ ...session, i: session.i + 1 });
  }, [byId, persist, session]);

  // Вариантлар фақат савол кўрсатилганда ҳисобланади — шунда саҳифа тез очилади.
  useEffect(() => {
    if (!session || session.finished) return;
    const idx = view ?? session.i;
    const q = session.qs[idx];
    if (!q || q.opts) return;
    const qs = session.qs.slice();
    qs[idx] = { ...q, opts: pickOptions(q.id, indexedPool) };
    persist({ ...session, qs });
  }, [session, view, indexedPool, persist]);

  // Клавиатура: 1–4 вариантни танлайди, Enter — кейингиси, ←/→ — кўриб чиқиш.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session || session.finished) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const idx = view ?? session.i;
      const answered = Boolean(session.ans[idx]);
      if (/^[1-4]$/.test(e.key) && view === null && !answered) {
        const q = session.qs[session.i];
        const pick = q?.opts?.[Number(e.key) - 1];
        if (pick) {
          e.preventDefault();
          answer(pick);
        }
        return;
      }
      if (e.key === 'Enter' && view === null && answered) {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        setView(idx - 1);
      }
      if (e.key === 'ArrowRight' && view !== null) {
        e.preventDefault();
        setView(view + 1 >= session.i ? null : view + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, next, session, view]);

  if (empty && !session) {
    return (
      <div class="rt-card">
        <p style={{ margin: 0 }}>{empty}</p>
        <a class="rt-btn rt-btn--secondary" href={listHref}>
          ← Луғатлар рўйхати
        </a>
      </div>
    );
  }

  if (!session) {
    return <p class="rt-muted">Юкланмоқда…</p>;
  }

  const done = session.ans.filter(Boolean).length;
  const correct = session.ans.filter((a) => a?.ok).length;
  const wrong = done - correct;

  if (session.finished) {
    const wrongIds = session.qs
      .map((q, idx) => (session.ans[idx] && !session.ans[idx]!.ok ? q.id : null))
      .filter(Boolean) as string[];
    const pct = session.qs.length ? Math.round((correct / session.qs.length) * 100) : 0;
    return (
      <div class="rt-stack">
        <div class="rt-card">
          <h2 class="rt-item__title">Натижа</h2>
          <div class="rt-score">
            <span class={`rt-score__num ${levelClass(pct)}`}>
              {pct}%
            </span>
            <span class="rt-score__of">{session.qs.length} та сўздан {correct} таси тўғри</span>
          </div>
          <p class="rt-item__meta">
            {pct >= 90
              ? 'Жуда яхши. Шу тезликда давом этинг.'
              : pct >= 70
                ? 'Яхши натижа. Хато сўзларни қайта кўриб чиқинг.'
                : 'Хато сўзларни қайта ишлаб, яна бир марта уриниб кўринг.'}
          </p>
          <div class="rt-item__actions">
            {wrongIds.length > 0 ? (
              <button
                class="rt-btn rt-btn--primary"
                type="button"
                onClick={() => start(session.cfg, wrongIds)}
              >
                Хатоларни қайта ишлаш ({wrongIds.length})
              </button>
            ) : (
              <button class="rt-btn rt-btn--primary" type="button" onClick={() => start(session.cfg)}>
                Янги квизни бошлаш
              </button>
            )}
            {wrongIds.length > 0 && (
              <button class="rt-btn rt-btn--secondary" type="button" onClick={() => start(session.cfg)}>
                Янги квизни бошлаш
              </button>
            )}
          </div>
          <div class="rt-row">
            <button
              class="rt-link"
              type="button"
              onClick={() => {
                setView(session.qs.length - 1);
                persist({ ...session, finished: false, i: session.qs.length - 1 });
              }}
            >
              Саволларни қайта кўриш
            </button>
            <a class="rt-link" href={homeHref}>
              Барча бўлимлар
            </a>
          </div>
        </div>

        {wrongIds.length > 0 && (
          <div class="rt-card">
            <h2 class="rt-item__title">Хато қилинган сўзлар</h2>
            <div class="rt-table-wrap" role="region" aria-label="Хато қилинган сўзлар" tabindex={0}>
              <table class="rt-table">
                <thead>
                  <tr>
                    <th scope="col">Ўзбекча</th>
                    <th scope="col">Тўғри жавоб</th>
                    <th scope="col">Сиз танладингиз</th>
                  </tr>
                </thead>
                <tbody>
                  {session.qs.map((q, idx) => {
                    const a = session.ans[idx];
                    if (!a || a.ok) return null;
                    const right = byId.get(q.id)?.word;
                    const picked = byId.get(a.pick)?.word;
                    return (
                      <tr key={q.id}>
                        <td>{right?.uz}</td>
                        <td lang="ru">
                          <Ru text={right?.ru ?? ''} />
                        </td>
                        <td lang="ru">
                          <s>
                            <Ru text={picked?.ru ?? ''} />
                          </s>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const idx = view ?? session.i;
  const q = session.qs[idx]!;
  const word = byId.get(q.id)!.word;
  const given = session.ans[idx];
  const reviewing = view !== null;
  const last = session.i + 1 >= session.qs.length;

  return (
    <div class="rt-stack">
      <Progress
        pos={idx + 1}
        total={session.qs.length}
        answered={done}
        correct={correct}
        wrong={wrong}
      />

      <Settings sets={sets} cfg={cfg} onStart={start} />

      <article class="rt-card">
        <p class="rt-label">Русчасини топинг</p>
        <h2 class="rt-prompt-uz">{word.uz}</h2>
        {word.example?.uz && <p class="rt-prompt-ctx">Гапда: {word.example.uz}</p>}

        <ol class="rt-options">
          {(q.opts ?? []).map((optId, n) => {
            const opt = byId.get(optId)?.word;
            const isRight = optId === q.id;
            const isPick = given?.pick === optId;
            const state: 'correct' | 'wrong' | 'dim' | undefined = !given
              ? undefined
              : isRight
                ? 'correct'
                : isPick
                  ? 'wrong'
                  : 'dim';
            return (
              <Option
                key={optId}
                n={n + 1}
                text={opt?.ru ?? ''}
                state={state}
                disabled={Boolean(given) || reviewing}
                onPick={() => answer(optId)}
              />
            );
          })}
        </ol>

        {given && reviewing && (
          <p class={`rt-past ${given.ok ? 'rt-past--ok' : 'rt-past--no'}`}>
            <Icon name={given.ok ? 'check' : 'cross'} size={18} />
            {given.ok ? 'Бу сўзни тўғри топгансиз' : 'Бу сўзда хато қилгансиз'}
          </p>
        )}
      </article>

      {given && (
        <section class={`rt-feedback ${given.ok ? 'is-correct' : 'is-wrong'}`} role="status">
          <Verdict ok={given.ok} />

          <div class="rt-vocab__head">
            <div class="rt-vocab__words">
              {word.pos && <p class="rt-vocab__pos">{word.pos}</p>}
              <p class="rt-vocab__ru" lang="ru">
                <Ru text={word.ru} />
              </p>
              <p class="rt-vocab__uz">{word.uz}</p>
            </div>
            <Speak text={word.ru} />
          </div>

          {word.example?.ru && (
            <div class="rt-example">
              <p class="rt-label">Мисол</p>
              <p class="rt-example__ru" lang="ru">
                <Ru text={word.example.ru} />
                <Speak text={word.example.ru} small label="Гапни тинглаш" />
              </p>
              {word.example.uz && <p class="rt-example__uz">{word.example.uz}</p>}
            </div>
          )}

          {word.note && (
            <p class="rt-explain">
              <span class="rt-label">Изоҳ</span>
              {word.note}
            </p>
          )}
        </section>
      )}

      {(idx > 0 || given) && (
        <div class="rt-actionbar">
          {reviewing && (
            <p class="rt-reviewing">
              Фақат кўриш учун
              <button class="rt-link" type="button" onClick={() => setView(null)}>
                Жорий саволга қайтиш
              </button>
            </p>
          )}
          <div class="rt-actions">
            {idx > 0 && (
              <button
                class="rt-btn rt-btn--secondary"
                type="button"
                onClick={() => setView(idx - 1)}
              >
                ← Олдинги
              </button>
            )}
            {reviewing ? (
              <button
                class="rt-btn rt-btn--primary"
                type="button"
                onClick={() => setView(idx + 1 >= session.i ? null : idx + 1)}
              >
                Кейинги →
              </button>
            ) : (
              given && (
                <button class="rt-btn rt-btn--primary" type="button" onClick={next}>
                  {last ? 'Натижани кўриш →' : 'Кейинги →'}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({
  sets, cfg, onStart,
}: {
  sets: VocabSet[];
  cfg: Cfg;
  onStart: (cfg: Cfg) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<Cfg>(cfg);
  useEffect(() => setDraft(cfg), [cfg]);

  const toggleSet = (id: string): void => {
    const has = draft.sets.includes(id);
    const nextSets = has ? draft.sets.filter((s) => s !== id) : [...draft.sets, id];
    setDraft({ ...draft, sets: nextSets.length ? nextSets : [id] });
  };

  const all = draft.sets.length === sets.length;

  return (
    <details class="rt-settings">
      <summary>Созламалар</summary>
      <div class="rt-settings__body">
        <fieldset>
          <legend>Тўпламлар</legend>
          <div class="rt-chips">
            <Chip
              on={all}
              label="Ҳаммаси"
              count={sets.reduce((n, s) => n + s.words.length, 0)}
              onPick={() => setDraft({ ...draft, sets: sets.map((s) => s.id) })}
            />
            {sets.map((s) => (
              <Chip
                key={s.id}
                on={!all && draft.sets.includes(s.id)}
                label={s.title}
                count={s.words.length}
                onPick={() => toggleSet(s.id)}
              />
            ))}
            <Chip
              on={draft.mistakes}
              label="Хато қилганларим"
              onPick={() => setDraft({ ...draft, mistakes: !draft.mistakes })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Саволлар сони</legend>
          <div class="rt-chips">
            {([20, 40, 'all'] as Count[]).map((c) => (
              <Chip
                key={String(c)}
                on={draft.count === c}
                label={c === 'all' ? 'Ҳаммаси' : String(c)}
                onPick={() => setDraft({ ...draft, count: c })}
              />
            ))}
          </div>
        </fieldset>

        <div class="rt-item__actions">
          <button class="rt-btn rt-btn--primary" type="button" onClick={() => onStart(draft)}>
            Янги квизни бошлаш
          </button>
        </div>
        <div>
          <button
            class="rt-link"
            type="button"
            onClick={() => {
              removeRaw(SESSION);
              onStart(draft);
            }}
          >
            Сессияни тозалаш
          </button>
        </div>
      </div>
    </details>
  );
}
