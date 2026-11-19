/**
 * Машқлар: жавоб клавиатурадан ёзилади (`choose` туридан ташқари).
 * Текшириш юмшоқ: катта-кичик ҳарф, тиниш белгилари, ё/е ва урғу белгиси хато ҳисобланмайди.
 * Автоматик ўтиш йўқ; «← Олдинги» ўтган машқни фақат кўриш учун очади.
 * Кўриниши: design/components/ExerciseScreen.
 */
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { ExerciseItem, ExerciseSet, ExerciseType } from '../lib/types.ts';
import {
  TYPE_INFO, answerSpeech, canMask, checkExercise, dealByType, fullAnswer, maskWords,
} from '../lib/exercise.ts';
import {
  readJson, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { Chip, Icon, Option, Progress, Ru, Speak, Verdict, Warn } from './bits.tsx';

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
  /** Шу мавзунинг тушунтириш саҳифаси (бўлса). */
  topicHref?: string;
}

export default function ExerciseRunner({
  topic, title, groups, homeHref, listHref, topicHref,
}: Props): JSX.Element {
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
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    persist({ ...session, i: session.i + 1 });
  }, [persist, session, topic]);

  if (!session) {
    return (
      <div class="rt-card">
        <p style={{ margin: 0 }}>Бу бўлимда ҳозир машқ йўқ.</p>
        <a class="rt-btn rt-btn--secondary" href={listHref}>
          ← Машқлар рўйхати
        </a>
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
    return (
      <>
        <div class="rt-card">
          <h2 class="rt-item__title">Натижа</h2>
          <div class="rt-score">
            <span class="rt-score__num">
              {correct}/{session.qs.length}
            </span>
            <span class="rt-score__of">{title} бўйича машқлар</span>
          </div>
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
                Янги машқни бошлаш
              </button>
            )}
            {wrongIds.length > 0 && (
              <button class="rt-btn rt-btn--secondary" type="button" onClick={() => start(session.cfg)}>
                Янги машқни бошлаш
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
              Машқларни қайта кўриш
            </button>
            <a class="rt-link" href={homeHref}>
              Барча бўлимлар
            </a>
          </div>
        </div>
      </>
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
  const speech = answerSpeech(item, type);
  const last = session.i + 1 >= session.qs.length;

  // Enter: жавоб берилмаган бўлса «Текшириш», берилган бўлса «Кейинги →».
  const onSubmit = (e: Event): void => {
    e.preventDefault();
    if (reviewing) return;
    if (given) next();
    else submit(input);
  };

  return (
    <form class="rt-stack" onSubmit={onSubmit}>
      <Progress
        pos={idx + 1}
        total={session.qs.length}
        answered={done}
        correct={correct}
        wrong={wrong}
      />

      <Settings
        groups={groups}
        cfg={cfg}
        onStart={start}
        sessionKeyName={SESSION}
        title={title}
        topicHref={topicHref}
      />

      <article class="rt-card">
        <div class="rt-exercise">
          <p class="rt-label">{info.ask}</p>
          {type === 'translate' ? (
            <p class="rt-prompt-uz">{item.prompt}</p>
          ) : (
            <p class="rt-sentence" lang="ru">
              <PromptText text={item.prompt} />
            </p>
          )}
          {item.hints && <Hints text={item.hints} />}
        </div>

        {!given && !reviewing && (
          <>
            {type === 'choose' && item.options ? (
              <ol class="rt-options">
                {item.options.map((opt, n) => (
                  <Option key={opt} n={n + 1} text={opt} onPick={() => submit(opt)} />
                ))}
              </ol>
            ) : (
              <>
                <div class="rt-field">
                  <label class="rt-label" for="rt-answer">
                    Жавобингиз
                  </label>
                  {info.long ? (
                    <textarea
                      class="rt-input"
                      id="rt-answer"
                      value={input}
                      onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
                      lang="ru"
                      placeholder="Русча ёзинг"
                      autocomplete="off"
                      autocapitalize="sentences"
                      spellcheck={false}
                      aria-invalid={warning ? 'true' : undefined}
                      aria-describedby={warning ? 'rt-answer-warn' : undefined}
                    />
                  ) : (
                    <input
                      class="rt-input"
                      id="rt-answer"
                      type="text"
                      value={input}
                      onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                      lang="ru"
                      placeholder="Русча ёзинг"
                      autocomplete="off"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck={false}
                      enterkeyhint="done"
                      aria-invalid={warning ? 'true' : undefined}
                      aria-describedby={warning ? 'rt-answer-warn' : undefined}
                    />
                  )}
                </div>
                {warning && <Warn text={warning} id="rt-answer-warn" />}
                <div>
                  <button class="rt-link" type="button" onClick={giveUp}>
                    Билмайман. Жавобни кўриш
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {given && reviewing && (
          <p class={`rt-past ${given.ok ? 'rt-past--ok' : 'rt-past--no'}`}>
            <Icon name={given.ok ? 'check' : 'cross'} size={18} />
            {given.ok ? 'Бу машқни тўғри ишлагансиз' : 'Бу машқда хато қилгансиз'}
          </p>
        )}
      </article>

      {given && (
        <section class={`rt-feedback ${given.ok ? 'is-correct' : 'is-wrong'}`} role="status">
          <Verdict ok={given.ok} shown={given.gaveUp} />

          {!given.gaveUp && (
            <div class="rt-given">
              <p class="rt-label">Сизнинг жавобингиз</p>
              <p lang="ru">{given.input}</p>
            </div>
          )}

          <div class="rt-right">
            <p class="rt-label">Тўғри жавоб</p>
            <p class="rt-answer" lang="ru">
              {given.ok || given.gaveUp || !canMask(type) ? (
                <Ru text={full} />
              ) : (
                <MaskedAnswer correct={full} user={given.input} />
              )}
              <Speak text={speech} small />
            </p>
          </div>

          {item.answers.length > 1 && (
            <p class="rt-explain">
              <span class="rt-label">Бошқа тўғри вариант</span>
              {item.answers.slice(1).map((a, i) => (
                <span key={a}>
                  {i > 0 && ' · '}
                  <Ru text={a} />
                </span>
              ))}
            </p>
          )}

          <p class="rt-explain">
            <span class="rt-label">Изоҳ</span>
            {item.note}
          </p>
        </section>
      )}

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
            <button class="rt-btn rt-btn--secondary" type="button" onClick={() => setView(idx - 1)}>
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
          ) : given ? (
            <button class="rt-btn rt-btn--primary" type="button" onClick={next}>
              {last ? 'Натижани кўриш →' : 'Кейинги →'}
            </button>
          ) : (
            type !== 'choose' && (
              <button class="rt-btn rt-btn--primary" type="submit">
                Текшириш
              </button>
            )
          )}
        </div>
      </div>
    </form>
  );
}

/** Таржима машқидаги сўзлар: «ўзбекча — русча» жуфтлари, `·` билан ажратилган. */
function Hints({ text }: { text: string }): JSX.Element {
  const pairs = text.split(/\s*·\s*/).filter(Boolean);
  return (
    <div class="rt-hints">
      <p class="rt-label">Сўзлар</p>
      <ul>
        {pairs.map((pair) => {
          const at = pair.indexOf('—');
          if (at < 0) return <li key={pair}>{pair}</li>;
          return (
            <li key={pair}>
              {pair.slice(0, at + 1)} <Ru text={pair.slice(at + 1).trim()} />
            </li>
          );
        })}
      </ul>
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
      parts.push(
        <span class="rt-target" key={key++}>
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith('(')) {
      parts.push(
        <span class="rt-bracket" key={key++}>
          {token}
        </span>,
      );
    } else {
      parts.push(<span class="rt-gap" role="img" aria-label="бўш жой" key={key++} />);
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
    <span>
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
  groups, cfg, onStart, sessionKeyName, title, topicHref,
}: {
  groups: ExerciseSet[];
  cfg: Cfg;
  onStart: (cfg: Cfg) => void;
  sessionKeyName: string;
  title: string;
  topicHref?: string;
}): JSX.Element {
  const [draft, setDraft] = useState<Cfg>(cfg);
  useEffect(() => setDraft(cfg), [cfg]);

  return (
    <details class="rt-settings">
      <summary>Созламалар · {title}</summary>
      <div class="rt-settings__body">
        {topicHref && (
          <p style={{ margin: 0 }}>
            <a href={topicHref}>Шу мавзунинг тушунтиришини ўқиш</a>
          </p>
        )}

        <fieldset>
          <legend>Машқ тури</legend>
          <div class="rt-chips">
            <Chip
              on={draft.type === 'all'}
              label="Аралаш"
              onPick={() => setDraft({ ...draft, type: 'all' })}
            />
            {groups.map((g) => (
              <Chip
                key={g.type}
                on={draft.type === g.type}
                label={TYPE_INFO[g.type].name}
                count={g.items.length}
                onPick={() => setDraft({ ...draft, type: g.type })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Машқлар сони</legend>
          <div class="rt-chips">
            {([10, 20, 'all'] as Count[]).map((c) => (
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
            Янги машқни бошлаш
          </button>
        </div>
        <div>
          <button
            class="rt-link"
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
