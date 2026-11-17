/**
 * Тест: 10 та савол, ҳаммаси 4 вариантли.
 * Тест давомида жавоб тўғри ёки хатолиги кўрсатилмайди — натижа охирида чиқади.
 * Саволлар тартиби қатъий (ҳамма бир хил саволни ечади), фақат вариантлар аралашади.
 */
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { TestFile } from '../lib/types.ts';
import { shuffle } from '../lib/text.ts';
import {
  readJson, readStats, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { Ru, Speak } from './bits.tsx';

interface Session {
  v: 1;
  /** Ҳар бир савол учун вариантлар тартиби (асл рўйхатдаги ўринлар). */
  order: number[][];
  answers: Array<number | null>;
  i: number;
  finished: boolean;
}

interface Props {
  test: TestFile;
  homeHref: string;
  listHref: string;
}

export default function TestRunner({ test, homeHref, listHref }: Props): JSX.Element {
  const SESSION = sessionKey('test', test.id);
  const total = test.questions.length;

  const [session, setSession] = useState<Session | null>(null);
  const [best, setBest] = useState<{ correct: number; total: number } | null>(null);

  const build = useCallback(
    (): Session => ({
      v: 1,
      order: test.questions.map((q) => shuffle(q.options.map((_, i) => i))),
      answers: test.questions.map(() => null),
      i: 0,
      finished: false,
    }),
    [test],
  );

  const valid = useCallback(
    (s: Session | null): boolean =>
      Boolean(
        s && s.v === 1 && Array.isArray(s.order) && s.order.length === total &&
        Array.isArray(s.answers) && s.answers.length === total &&
        s.order.every((o) => Array.isArray(o) && o.length === 4),
      ),
    [total],
  );

  useEffect(() => {
    const saved = readJson<Session | null>(SESSION, null);
    const fresh = valid(saved) ? saved! : build();
    setSession(fresh);
    if (!valid(saved)) writeJson(SESSION, fresh);
    const stats = readStats('test', test.id);
    if (stats.best) setBest({ correct: stats.best.correct, total: stats.best.total });
  }, []);

  const persist = useCallback(
    (s: Session) => {
      setSession(s);
      writeJson(SESSION, s);
    },
    [SESSION],
  );

  const pick = useCallback(
    (optionIndex: number) => {
      if (!session || session.finished) return;
      const answers = session.answers.slice();
      answers[session.i] = optionIndex;
      persist({ ...session, answers });
    },
    [persist, session],
  );

  const finish = useCallback(() => {
    if (!session) return;
    let correct = 0;
    test.questions.forEach((q, idx) => {
      const ok = session.answers[idx] === q.answer;
      if (ok) correct++;
      recordAnswer('test', test.id, q.id, ok);
    });
    recordScore('test', test.id, correct, total);
    const stats = readStats('test', test.id);
    if (stats.best) setBest({ correct: stats.best.correct, total: stats.best.total });
    persist({ ...session, finished: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [persist, session, test, total]);

  const restart = useCallback(() => {
    removeRaw(SESSION);
    const fresh = build();
    persist(fresh);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [SESSION, build, persist]);

  if (!session) return <div class="card muted">Юкланмоқда…</div>;

  const answered = session.answers.filter((a) => a !== null).length;

  if (session.finished) {
    const correct = test.questions.filter((q, idx) => session.answers[idx] === q.answer).length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div class="stack--lg">
        <div class="card stack">
          <h2>Натижа</h2>
          <p class="result__score">
            {correct} / {total} <span class="muted">({pct}%)</span>
          </p>
          {best && (
            <p class="muted" style={{ margin: 0 }}>
              Энг яхши натижангиз: {best.correct} / {best.total}
            </p>
          )}
          <div class="btnrow">
            <button class="btn btn--primary" type="button" onClick={restart}>
              Қайта топшириш
            </button>
            <a class="btn" href={listHref}>← Тестлар</a>
            <a class="btn btn--ghost" href={homeHref}>Барча бўлимлар</a>
          </div>
        </div>

        <div class="stack">
          {test.questions.map((q, idx) => {
            const given = session.answers[idx];
            const ok = given === q.answer;
            return (
              <div class={`card review ${ok ? 'review--good' : 'review--bad'}`} key={q.id}>
                <p class="quiz__label">
                  {idx + 1}-савол{' '}
                  <span class={ok ? 'mark-good' : 'mark-bad'}>
                    {ok ? '✓ тўғри' : '✗ хато'}
                  </span>
                </p>
                <p class="review__prompt">{q.prompt}</p>
                {q.promptExtra && <p class="muted">{q.promptExtra}</p>}
                <p style={{ margin: '.3rem 0 0' }}>
                  <span class="muted">Сизнинг жавобингиз: </span>
                  {given === null ? (
                    <span class="mark-bad">жавоб берилмади</span>
                  ) : (
                    <Ru text={q.options[given] ?? ''} class={ok ? 'mark-good' : 'mark-bad'} />
                  )}
                </p>
                {!ok && (
                  <p style={{ margin: '.2rem 0 0' }}>
                    <span class="muted">Тўғри жавоб: </span>
                    <Ru text={q.options[q.answer] ?? ''} class="mark-good" />
                  </p>
                )}
                <div class="btnrow" style={{ marginTop: '.4rem' }}>
                  <Speak text={q.options[q.answer] ?? ''} />
                </div>
                <p class="note" style={{ marginTop: '.5rem' }}>{q.note}</p>
              </div>
            );
          })}
        </div>

        <div class="btnrow">
          <button class="btn btn--primary" type="button" onClick={restart}>
            Қайта топшириш
          </button>
          <a class="btn" href={listHref}>← Тестлар</a>
        </div>
      </div>
    );
  }

  const q = test.questions[session.i]!;
  const order = session.order[session.i]!;
  const given = session.answers[session.i];
  const last = session.i + 1 >= total;

  return (
    <div class="stack--lg">
      <div class="progressrow">
        <div class="progressrow__top">
          <strong>
            {session.i + 1} / {total}
          </strong>
          <span class="muted">{answered} та саволга жавоб берилди</span>
        </div>
        <div
          class="bar"
          role="progressbar"
          aria-label="Прогресс"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div class="bar__fill" style={{ width: `${Math.round((answered / total) * 100)}%` }} />
        </div>
      </div>

      <div class="card quiz">
        <p class="quiz__label">{session.i + 1}-савол</p>
        <h2 class="quiz__prompt quiz__prompt--test">{q.prompt}</h2>
        {q.promptExtra && <p class="quiz__ex muted">{q.promptExtra}</p>}

        <ul class="optlist">
          {order.map((optIndex, n) => (
            <li key={optIndex}>
              <button
                type="button"
                class={`opt${given === optIndex ? ' opt--picked' : ''}`}
                aria-pressed={given === optIndex}
                onClick={() => pick(optIndex)}
              >
                <span class="opt__no" aria-hidden="true">{n + 1}</span>
                <Ru text={q.options[optIndex] ?? ''} class="opt__text" />
              </button>
            </li>
          ))}
        </ul>

        <p class="muted" style={{ margin: '.8rem 0 0' }}>
          Тест тугагандан кейин ҳар бир савол бўйича изоҳ кўрсатилади.
        </p>
      </div>

      <div class="navrow">
        <button
          class="btn"
          type="button"
          disabled={session.i === 0}
          onClick={() => persist({ ...session, i: session.i - 1 })}
        >
          ← Олдинги
        </button>
        {last ? (
          <button class="btn btn--primary" type="button" onClick={finish}>
            Якунлаш
          </button>
        ) : (
          <button
            class="btn btn--primary"
            type="button"
            onClick={() => persist({ ...session, i: session.i + 1 })}
          >
            Кейинги →
          </button>
        )}
      </div>

      {answered < total && last && (
        <p class="muted center" style={{ margin: 0 }}>
          {total - answered} та саволга жавоб берилмаган. Улар хато деб ҳисобланади.
        </p>
      )}
    </div>
  );
}
