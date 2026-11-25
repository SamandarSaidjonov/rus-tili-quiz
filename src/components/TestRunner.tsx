/**
 * Тест: камида 20 та савол, ҳаммаси 4 вариантли.
 * Тест давомида жавоб тўғри ёки хатолиги кўрсатилмайди — натижа охирида чиқади.
 * Саволлар тартиби қатъий (ҳамма бир хил саволни ечади), фақат вариантлар аралашади.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { levelClass, scorePct } from '../lib/level.ts';
import type { TestFile } from '../lib/types.ts';
import { shuffle } from '../lib/text.ts';
import {
  readJson, readStats, recordAnswer, recordScore, removeRaw, sessionKey, writeJson,
} from '../lib/progress.ts';
import { Icon, Option, Progress, Ru, Speak } from './bits.tsx';

interface Session {
  v: 1;
  /** Ҳар бир савол учун вариантлар тартиби (асл рўйхатдаги ўринлар). */
  order: number[][];
  answers: Array<number | null>;
  /** Савол id'лари: тест саволлари алмашса, эски сессия ташланади. */
  ids?: string[];
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
      ids: test.questions.map((q) => q.id),
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
        (s.ids ? s.ids.join() === test.questions.map((q) => q.id).join() : test.group !== 'grammar') &&
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

  if (!session) return <p class="rt-muted">Юкланмоқда…</p>;

  const answered = session.answers.filter((a) => a !== null).length;

  if (session.finished) {
    const correct = test.questions.filter((q, idx) => session.answers[idx] === q.answer).length;
    return (
      <div class="rt-stack">
        <div class="rt-card">
          <h2 class="rt-item__title">Натижа</h2>
          <div class="rt-score">
            <span class={`rt-score__num ${levelClass((correct / total) * 100)}`}>
              {scorePct(correct, total)}%
            </span>
            <span class="rt-score__of">
              {total} та саволдан {correct} таси тўғри
              {best && ` · энг яхши натижа: ${scorePct(best.correct, Math.max(best.total, total))}%`}
            </span>
          </div>
          <div class="rt-item__actions">
            <button class="rt-btn rt-btn--secondary" type="button" onClick={restart}>
              Қайта топшириш
            </button>
            <a class="rt-btn rt-btn--secondary" href={listHref}>
              ← Тестлар
            </a>
          </div>
          <div>
            <a class="rt-link" href={homeHref}>
              Барча бўлимлар
            </a>
          </div>
        </div>

        <ol class="rt-review">
          {test.questions.map((q, idx) => {
            const given = session.answers[idx];
            const ok = given === q.answer;
            return (
              <li key={q.id}>
                <p class="rt-review__q">
                  <span>
                    {idx + 1}. {q.prompt}
                  </span>
                  <span class={`rt-badge ${ok ? 'rt-badge--ok' : 'rt-badge--no'}`}>
                    <Icon name={ok ? 'check' : 'cross'} size={14} />
                    {ok ? 'Тўғри' : 'Хато'}
                  </span>
                </p>
                {q.promptExtra && <p class="rt-prompt-ctx">{q.promptExtra}</p>}
                <dl>
                  <dt>Сизнинг жавобингиз</dt>
                  {given === null ? (
                    <dd>Жавоб берилмаган</dd>
                  ) : (
                    <dd lang="ru">
                      <Ru text={q.options[given] ?? ''} />
                    </dd>
                  )}
                  <dt>Тўғри жавоб</dt>
                  <dd class="rt-answer" lang="ru">
                    <Ru text={q.options[q.answer] ?? ''} />
                    <Speak text={q.options[q.answer] ?? ''} small />
                  </dd>
                  <dt>Изоҳ</dt>
                  <dd>{q.note}</dd>
                </dl>
              </li>
            );
          })}
        </ol>

        <div class="rt-item__actions">
          <button class="rt-btn rt-btn--secondary" type="button" onClick={restart}>
            Қайта топшириш
          </button>
          <a class="rt-btn rt-btn--secondary" href={listHref}>
            ← Тестлар
          </a>
        </div>
      </div>
    );
  }

  const q = test.questions[session.i]!;
  const order = session.order[session.i]!;
  const given = session.answers[session.i];
  const last = session.i + 1 >= total;

  return (
    <div class="rt-stack">
      <Progress pos={session.i + 1} total={total} answered={answered} tally={false} />

      <article class="rt-card">
        <p class="rt-label">{session.i + 1}-савол</p>
        <h2 class="rt-prompt-uz">{q.prompt}</h2>
        {q.promptExtra && <p class="rt-prompt-ctx">{q.promptExtra}</p>}

        <ol class="rt-options">
          {order.map((optIndex, n) => (
            <Option
              key={optIndex}
              n={n + 1}
              text={q.options[optIndex] ?? ''}
              state={given === optIndex ? 'selected' : undefined}
              pressed={given === optIndex}
              onPick={() => pick(optIndex)}
            />
          ))}
        </ol>

        <p class="rt-prompt-ctx">
          Тест тугагандан кейин ҳар бир савол бўйича изоҳ кўрсатилади.
        </p>
      </article>

      {answered < total && last && (
        <p class="rt-prompt-ctx">
          {total - answered} та саволга жавоб берилмаган. Улар хато деб ҳисобланади.
        </p>
      )}

      <div class="rt-actionbar">
        <div class="rt-actions">
          {session.i > 0 && (
            <button
              class="rt-btn rt-btn--secondary"
              type="button"
              onClick={() => persist({ ...session, i: session.i - 1 })}
            >
              ← Олдинги
            </button>
          )}
          {last ? (
            <button class="rt-btn rt-btn--primary" type="button" onClick={finish}>
              Якунлаш
            </button>
          ) : (
            <button
              class="rt-btn rt-btn--primary"
              type="button"
              onClick={() => persist({ ...session, i: session.i + 1 })}
            >
              Кейинги →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
