/**
 * Луғат сўраш режими.
 * Савол фақат ўзбекча, 4 та вариант русча. Автоматик ўтиш йўқ,
 * «← Олдинги» ўтган саволни фақат кўриш учун очади.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { VocabSet, VocabWord } from '../lib/types.ts';
import { indexWords, pickOptions } from '../lib/distractors.ts';
import { shuffle } from '../lib/text.ts';
import {
  mistakeIds, readJson, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { ProgressRow, Ru, Speak, Verdict } from './bits.tsx';

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
  qs: Array<{ id: string; opts: string[] }>;
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
  const liveRef = useRef<HTMLDivElement>(null);

  const wordsOf = useCallback(
    (ids: string[]): VocabWord[] => sets.filter((s) => ids.includes(s.id)).flatMap((s) => s.words),
    [sets],
  );

  const build = useCallback(
    (next: Cfg, onlyIds?: string[]): Session | null => {
      const pool = wordsOf(next.sets.length ? next.sets : sets.map((s) => s.id));
      if (!pool.length) return null;
      const indexed = indexWords(pool);

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
        qs: list.map((w) => ({ id: w.id, opts: pickOptions(w.id, indexed) })),
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
        s.qs.every((q) => byId.has(q.id) && Array.isArray(q.opts) && q.opts.length === 4 &&
          q.opts.every((o) => byId.has(o))),
      ),
    [byId],
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
      const correct = session.ans.filter((a) => a?.ok).length;
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
      void correct;
      return;
    }
    persist({ ...session, i: session.i + 1 });
  }, [byId, persist, session]);

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
        const pick = q?.opts[Number(e.key) - 1];
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
      <div class="card stack">
        <p>{empty}</p>
        <a class="btn" href={listHref}>← Луғатлар рўйхати</a>
      </div>
    );
  }

  if (!session) return <div class="card muted">Юкланмоқда…</div>;

  const done = session.ans.filter(Boolean).length;
  const correct = session.ans.filter((a) => a?.ok).length;
  const wrong = done - correct;

  if (session.finished) {
    const wrongIds = session.qs
      .map((q, idx) => (session.ans[idx] && !session.ans[idx]!.ok ? q.id : null))
      .filter(Boolean) as string[];
    const pct = session.qs.length ? Math.round((correct / session.qs.length) * 100) : 0;
    return (
      <div class="stack--lg">
        <div class="card stack">
          <h2>Натижа</h2>
          <p class="result__score">
            {correct} / {session.qs.length} тўғри <span class="muted">({pct}%)</span>
          </p>
          <p class="muted">
            {pct >= 90
              ? 'Жуда яхши. Шу тезликда давом этинг.'
              : pct >= 70
                ? 'Яхши натижа. Хато сўзларни қайта кўриб чиқинг.'
                : 'Хато сўзларни қайта ишлаб, яна бир марта уриниб кўринг.'}
          </p>
          <div class="btnrow">
            {wrongIds.length > 0 && (
              <button class="btn btn--primary" type="button" onClick={() => start(session.cfg, wrongIds)}>
                Хатоларни қайта ишлаш ({wrongIds.length})
              </button>
            )}
            <button class="btn" type="button" onClick={() => start(session.cfg)}>Янги квиз</button>
            <button
              class="btn btn--ghost"
              type="button"
              onClick={() => {
                setView(session.qs.length - 1);
                persist({ ...session, finished: false, i: session.qs.length - 1 });
              }}
            >
              ← Саволларни кўриш
            </button>
            <a class="btn btn--ghost" href={homeHref}>Барча бўлимлар</a>
          </div>
        </div>

        {wrongIds.length > 0 && (
          <div class="card">
            <h3>Хато қилинган сўзлар</h3>
            <div class="tblwrap">
              <table>
                <thead>
                  <tr>
                    <th>Ўзбекча</th>
                    <th>Тўғри жавоб</th>
                    <th>Сиз танладингиз</th>
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
                        <td><Ru text={right?.ru ?? ''} /></td>
                        <td class="mark-bad"><Ru text={picked?.ru ?? ''} /></td>
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

  return (
    <div class="stack--lg">
      <Settings
        sets={sets}
        cfg={cfg}
        onStart={start}
      />

      <ProgressRow done={done} total={session.qs.length} correct={correct} wrong={wrong} />

      {reviewing && (
        <p class="review-note">
          Кўриб чиқиш режими: {idx + 1}-савол. Бу ерда қайта жавоб бериб бўлмайди.{' '}
          <button class="btn btn--sm" type="button" onClick={() => setView(null)}>
            Жорий саволга қайтиш
          </button>
        </p>
      )}

      <div class="card quiz">
        <p class="quiz__label">{idx + 1}-савол · ўзбекчадан русчага</p>
        <h2 class="quiz__prompt">{word.uz}</h2>
        {word.example?.uz && <p class="quiz__ex muted">Гапда: {word.example.uz}</p>}

        <ul class="optlist">
          {q.opts.map((optId, n) => {
            const opt = byId.get(optId)?.word;
            const isRight = optId === q.id;
            const isPick = given?.pick === optId;
            const state = !given ? '' : isRight ? ' opt--good' : isPick ? ' opt--bad' : ' opt--dim';
            return (
              <li key={optId}>
                <button
                  type="button"
                  class={`opt${state}`}
                  disabled={Boolean(given) || reviewing}
                  onClick={() => answer(optId)}
                  aria-label={`${n + 1}. ${opt?.ru ?? ''}`}
                >
                  <span class="opt__no" aria-hidden="true">{n + 1}</span>
                  <Ru text={opt?.ru ?? ''} class="opt__text" />
                  {given && isRight && <span class="opt__mark mark-good" aria-hidden="true">✓</span>}
                  {given && isPick && !isRight && <span class="opt__mark mark-bad" aria-hidden="true">✗</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" ref={liveRef}>
          {given && (
            <div class="feedback stack">
              <Verdict ok={given.ok} />
              <p class="feedback__pair">
                <Ru text={word.ru} class="feedback__ru" /> — {word.uz}
                {word.pos && <span class="badge">{word.pos}</span>}
              </p>
              <div class="btnrow"><Speak text={word.ru} /></div>
              {word.example?.ru && (
                <div class="note stack">
                  <p class="feedback__example"><Ru text={word.example.ru} /></p>
                  {word.example.uz && <p class="muted">{word.example.uz}</p>}
                  <div class="btnrow"><Speak text={word.example.ru} label="Гапни тинглаш" /></div>
                </div>
              )}
              {word.note && <p class="note">{word.note}</p>}
            </div>
          )}
        </div>
      </div>

      <div class="navrow">
        <button class="btn" type="button" disabled={idx === 0} onClick={() => setView(idx - 1)}>
          ← Олдинги
        </button>
        {reviewing ? (
          <button class="btn" type="button" onClick={() => setView(idx + 1 >= session.i ? null : idx + 1)}>
            Кейинги →
          </button>
        ) : (
          <button class="btn btn--primary" type="button" disabled={!given} onClick={next}>
            {session.i + 1 >= session.qs.length ? 'Натижа →' : 'Кейинги →'}
          </button>
        )}
      </div>
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

  const toggleSet = (id: string) => {
    const has = draft.sets.includes(id);
    const next = has ? draft.sets.filter((s) => s !== id) : [...draft.sets, id];
    setDraft({ ...draft, sets: next.length ? next : [id] });
  };

  return (
    <details class="card settings">
      <summary>Созламалар</summary>
      <div class="stack">
        <fieldset class="fieldset">
          <legend>Тўпламлар</legend>
          <div class="chips">
            {sets.map((s) => (
              <label class={`chip${draft.sets.includes(s.id) ? ' chip--on' : ''}`} key={s.id}>
                <input
                  type="checkbox"
                  checked={draft.sets.includes(s.id)}
                  onChange={() => toggleSet(s.id)}
                />
                <span>{s.title}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Саволлар сони</legend>
          <div class="chips">
            {([20, 40, 'all'] as Count[]).map((c) => (
              <label class={`chip${draft.count === c ? ' chip--on' : ''}`} key={String(c)}>
                <input
                  type="radio"
                  name="vocab-count"
                  checked={draft.count === c}
                  onChange={() => setDraft({ ...draft, count: c })}
                />
                <span>{c === 'all' ? 'Ҳаммаси' : c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label class={`chip${draft.mistakes ? ' chip--on' : ''}`}>
          <input
            type="checkbox"
            checked={draft.mistakes}
            onChange={() => setDraft({ ...draft, mistakes: !draft.mistakes })}
          />
          <span>Фақат хато қилганларим</span>
        </label>

        <div class="btnrow">
          <button class="btn btn--primary" type="button" onClick={() => onStart(draft)}>
            Янги квизни бошлаш
          </button>
          <button
            class="btn btn--ghost"
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
