/**
 * Машқлар: жавоб клавиатурадан ёзилади (`choose` туридан ташқари).
 * Текшириш юмшоқ: катта-кичик ҳарф, тиниш белгилари, ё/е ва урғу белгиси хато ҳисобланмайди.
 * Автоматик ўтиш йўқ; «← Олдинги» ўтган машқни фақат кўриш учун очади.
 */
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { ExerciseItem, ExerciseSet, ExerciseType } from '../lib/types.ts';
import { CASES } from '../lib/text.ts';
import {
  TYPE_INFO, checkExercise, dealByType, fullAnswer, maskWords,
} from '../lib/exercise.ts';
import {
  readJson, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { ProgressRow, Ru, Speak, Verdict, Warning } from './bits.tsx';

type Count = 10 | 20 | 'all';

interface Cfg {
  type: 'all' | ExerciseType;
  count: Count;
}

interface Answer {
  input: string;
  ok: boolean;
  gaveUp?: boolean;
}

interface Session {
  v: 1;
  cfg: Cfg;
  qs: Array<{ id: string; type: ExerciseType }>;
  i: number;
  ans: Array<Answer | null>;
  finished: boolean;
}

interface Props {
  topic: string;
  title: string;
  groups: ExerciseSet[];
  homeHref: string;
  listHref: string;
}

export default function ExerciseRunner({ topic, title, groups, homeHref, listHref }: Props): JSX.Element {
  const SESSION = sessionKey('ex', topic);

  const byId = useMemo(() => {
    const m = new Map<string, { item: ExerciseItem; type: ExerciseType }>();
    for (const g of groups) for (const item of g.items) m.set(item.id, { item, type: g.type });
    return m;
  }, [groups]);

  const [cfg, setCfg] = useState<Cfg>({ type: 'all', count: 20 });
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const build = useCallback(
    (next: Cfg, onlyIds?: string[]): Session | null => {
      if (onlyIds?.length) {
        const qs = onlyIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((e) => ({ id: e!.item.id, type: e!.type }));
        if (!qs.length) return null;
        return { v: 1, cfg: next, qs, i: 0, ans: qs.map(() => null), finished: false };
      }
      const picked = groups.filter((g) => next.type === 'all' || g.type === next.type);
      const dealt = dealByType(
        picked.map((g) => g.items.map((item) => ({ id: item.id, type: g.type }))),
        next.count,
      );
      if (!dealt.length) return null;
      return { v: 1, cfg: next, qs: dealt, i: 0, ans: dealt.map(() => null), finished: false };
    },
    [byId, groups],
  );

  const valid = useCallback(
    (s: Session | null): boolean =>
      Boolean(
        s && s.v === 1 && Array.isArray(s.qs) && s.qs.length && Array.isArray(s.ans) &&
        s.ans.length === s.qs.length && typeof s.i === 'number' && s.qs.every((q) => byId.has(q.id)),
      ),
    [byId],
  );

  useEffect(() => {
    const saved = readJson<Session | null>(SESSION, null);
    if (valid(saved)) {
      setSession(saved);
      setCfg(saved!.cfg);
      return;
    }
    const fresh = build(cfg);
    if (fresh) {
      setSession(fresh);
      writeJson(SESSION, fresh);
    }
  }, []);

  const persist = useCallback(
    (s: Session) => {
      setSession(s);
      writeJson(SESSION, s);
    },
    [SESSION],
  );

  const start = useCallback(
    (next: Cfg, onlyIds?: string[]) => {
      const fresh = build(next, onlyIds);
      if (!fresh) return;
      setCfg(next);
      setView(null);
      setInput('');
      setWarning(null);
      persist(fresh);
    },
    [build, persist],
  );

  const submit = useCallback(
    (raw: string) => {
      if (!session || session.finished || view !== null) return;
      const q = session.qs[session.i];
      if (!q || session.ans[session.i]) return;
      const entry = byId.get(q.id);
      if (!entry) return;

      const res = checkExercise(entry.item, entry.type, raw);
      if (res.state === 'empty' || res.state === 'latin' || res.state === 'unknown-case') {
        setWarning(res.warning ?? 'Жавоб ҳисобга олинмади.');
        return;
      }
      setWarning(null);
      const ok = res.state === 'correct';
      const ans = session.ans.slice();
      ans[session.i] = { input: raw.trim(), ok };
      recordAnswer('ex', topic, q.id, ok);
      persist({ ...session, ans });
    },
    [byId, persist, session, topic, view],
  );

  const giveUp = useCallback(() => {
    if (!session || session.finished || view !== null) return;
    const q = session.qs[session.i];
    if (!q || session.ans[session.i]) return;
    const ans = session.ans.slice();
    ans[session.i] = { input: '', ok: false, gaveUp: true };
    recordAnswer('ex', topic, q.id, false);
    setWarning(null);
    persist({ ...session, ans });
  }, [persist, session, topic, view]);

  const next = useCallback(() => {
    if (!session) return;
    setInput('');
    setWarning(null);
    if (session.i + 1 >= session.qs.length) {
      const correct = session.ans.filter((a) => a?.ok).length;
      recordScore('ex', topic, correct, session.qs.length);
      persist({ ...session, finished: true });
      return;
    }
    persist({ ...session, i: session.i + 1 });
  }, [persist, session, topic]);

  if (!session) {
    return (
      <div class="card stack">
        <p>Бу бўлимда ҳозир машқ йўқ.</p>
        <a class="btn" href={listHref}>← Машқлар рўйхати</a>
      </div>
    );
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
      <div class="stack--lg">
        <div class="card stack">
          <h2>Натижа</h2>
          <p class="result__score">
            {correct} / {session.qs.length} тўғри <span class="muted">({pct}%)</span>
          </p>
          <div class="btnrow">
            {wrongIds.length > 0 && (
              <button class="btn btn--primary" type="button" onClick={() => start(session.cfg, wrongIds)}>
                Хатоларни қайта ишлаш ({wrongIds.length})
              </button>
            )}
            <button class="btn" type="button" onClick={() => start(session.cfg)}>Янги машқ</button>
            <button
              class="btn btn--ghost"
              type="button"
              onClick={() => {
                setView(session.qs.length - 1);
                persist({ ...session, finished: false, i: session.qs.length - 1 });
              }}
            >
              ← Машқларни кўриш
            </button>
            <a class="btn btn--ghost" href={homeHref}>Барча бўлимлар</a>
          </div>
        </div>
      </div>
    );
  }

  const idx = view ?? session.i;
  const q = session.qs[idx]!;
  const entry = byId.get(q.id)!;
  const item = entry.item;
  const type = entry.type;
  const info = TYPE_INFO[type];
  const given = session.ans[idx];
  const reviewing = view !== null;
  const full = fullAnswer(item, type);

  return (
    <div class="stack--lg">
      <Settings groups={groups} cfg={cfg} onStart={start} sessionKeyName={SESSION} title={title} />

      <ProgressRow done={done} total={session.qs.length} correct={correct} wrong={wrong} />

      {reviewing && (
        <p class="review-note">
          Кўриб чиқиш режими: {idx + 1}-машқ. Бу ерда қайта жавоб бериб бўлмайди.{' '}
          <button class="btn btn--sm" type="button" onClick={() => setView(null)}>
            Жорийга қайтиш
          </button>
        </p>
      )}

      <div class="card quiz">
        <p class="quiz__label">
          {idx + 1}-машқ · {info.name}
          {item.case && <span class="badge badge--accent">{CASES[item.case]}</span>}
        </p>
        <p class="muted">{info.ask}</p>
        <p class={`quiz__task${type === 'translate' ? '' : ' ru'}`}>
          <PromptText text={item.prompt} />
        </p>
        {item.hints && <p class="note">{item.hints}</p>}

        {!given && !reviewing && (
          <form
            class="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            {type === 'choose' && item.options ? (
              <ul class="optlist">
                {item.options.map((opt, n) => (
                  <li key={opt}>
                    <button type="button" class="opt" onClick={() => submit(opt)}>
                      <span class="opt__no" aria-hidden="true">{n + 1}</span>
                      <Ru text={opt} class="opt__text" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <label class="field">
                  <span class="field__label">Жавобингиз (рус ҳарфларида)</span>
                  {info.long ? (
                    <textarea
                      value={input}
                      onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
                      autocomplete="off"
                      spellcheck={false}
                      lang="ru"
                    />
                  ) : (
                    <input
                      type="text"
                      value={input}
                      onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                      autocomplete="off"
                      spellcheck={false}
                      lang="ru"
                    />
                  )}
                </label>
                {warning && <Warning text={warning} />}
                <div class="btnrow">
                  <button class="btn btn--primary" type="submit">Текшириш</button>
                  <button class="btn btn--ghost" type="button" onClick={giveUp}>
                    Билмайман, жавобни кўрсат
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        <div aria-live="polite">
          {given && (
            <div class="feedback stack">
              <Verdict ok={given.ok} />
              {given.gaveUp ? (
                <p class="muted">Жавоб кўрсатилди — бу хато деб ҳисобланади.</p>
              ) : (
                <p>
                  <span class="muted">Сизнинг жавобингиз: </span>
                  <Ru text={given.input} class={given.ok ? 'mark-good' : 'mark-bad'} />
                </p>
              )}
              <p class="feedback__answer">
                <span class="muted">Тўғри жавоб: </span>
                {given.ok || given.gaveUp ? (
                  <Ru text={full} />
                ) : (
                  <MaskedAnswer correct={full} user={given.input} />
                )}
              </p>
              {item.answers.length > 1 && (
                <p class="muted">
                  Бошқа тўғри вариант:{' '}
                  {item.answers.slice(1).map((a, i) => (
                    <span key={a}>
                      {i > 0 && ' · '}
                      <Ru text={a} />
                    </span>
                  ))}
                </p>
              )}
              <div class="btnrow">
                <Speak text={full.replace(/\*/g, '')} />
              </div>
              <p class="note">{item.note}</p>
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

/** Машқ матни: `___` бўш жой, `(сўз)` ва `[[сўз]]` ажратиб кўрсатилади. */
function PromptText({ text }: { text: string }): JSX.Element {
  const parts: JSX.Element[] = [];
  const re = /(_{2,}|\([^)]+\)|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const token = m[0];
    if (token.startsWith('[[')) {
      parts.push(<u class="prompt__target" key={key++}>{token.slice(2, -2)}</u>);
    } else if (token.startsWith('(')) {
      parts.push(<em class="prompt__base" key={key++}>{token}</em>);
    } else {
      parts.push(<span class="prompt__gap" key={key++}>{token}</span>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

/** Хато жавобда: фойдаланувчи топа олмаган сўзлар белгиланади. */
function MaskedAnswer({ correct, user }: { correct: string; user: string }): JSX.Element {
  const words = maskWords(correct.replace(/\*/g, ''), user);
  return (
    <span class="ru" lang="ru">
      {words.map((w, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {w.hit ? w.word : <mark>{w.word}</mark>}
        </span>
      ))}
    </span>
  );
}

function Settings({
  groups, cfg, onStart, sessionKeyName, title,
}: {
  groups: ExerciseSet[];
  cfg: Cfg;
  onStart: (cfg: Cfg) => void;
  sessionKeyName: string;
  title: string;
}): JSX.Element {
  const [draft, setDraft] = useState<Cfg>(cfg);
  useEffect(() => setDraft(cfg), [cfg]);

  return (
    <details class="card settings">
      <summary>Созламалар · {title}</summary>
      <div class="stack">
        <fieldset class="fieldset">
          <legend>Машқ тури</legend>
          <div class="chips">
            <label class={`chip${draft.type === 'all' ? ' chip--on' : ''}`}>
              <input
                type="radio"
                name="ex-type"
                checked={draft.type === 'all'}
                onChange={() => setDraft({ ...draft, type: 'all' })}
              />
              <span>Аралаш</span>
            </label>
            {groups.map((g) => (
              <label class={`chip${draft.type === g.type ? ' chip--on' : ''}`} key={g.type}>
                <input
                  type="radio"
                  name="ex-type"
                  checked={draft.type === g.type}
                  onChange={() => setDraft({ ...draft, type: g.type })}
                />
                <span>
                  {TYPE_INFO[g.type].name} <span class="muted">({g.items.length})</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Машқлар сони</legend>
          <div class="chips">
            {([10, 20, 'all'] as Count[]).map((c) => (
              <label class={`chip${draft.count === c ? ' chip--on' : ''}`} key={String(c)}>
                <input
                  type="radio"
                  name="ex-count"
                  checked={draft.count === c}
                  onChange={() => setDraft({ ...draft, count: c })}
                />
                <span>{c === 'all' ? 'Ҳаммаси' : c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div class="btnrow">
          <button class="btn btn--primary" type="button" onClick={() => onStart(draft)}>
            Янги машқни бошлаш
          </button>
          <button
            class="btn btn--ghost"
            type="button"
            onClick={() => {
              removeRaw(sessionKeyName);
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
