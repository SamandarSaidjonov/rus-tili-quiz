/** Кичик умумий компонентлар: русча матн, талаффуз тугмаси, прогресс қатори. */
import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { splitStars } from '../lib/text.ts';
import { speak, ttsAvailable } from '../lib/tts.ts';

/** Русча матн: serif шрифт, `*сўз*` қалин кўринади. */
export function Ru({ text, class: cls = '' }: { text: string; class?: string }): JSX.Element {
  return (
    <span class={`ru ${cls}`} lang="ru">
      {splitStars(text).map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
    </span>
  );
}

/** Талаффуз тугмаси. Овоз бўлмаса кўринмайди. */
export function Speak({ text, label = 'Тинглаш' }: { text: string; label?: string }): JSX.Element | null {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(ttsAvailable());
  }, []);
  if (!ok) return null;
  return (
    <button type="button" class="btn btn--sm btn--ghost" onClick={() => speak(text)} aria-label={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor" />
        <path
          d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}

/** Прогресс қатори: 12 / 75 · ✓ 10 · ✗ 2 */
export function ProgressRow({
  done,
  total,
  correct,
  wrong,
}: {
  done: number;
  total: number;
  correct: number;
  wrong: number;
}): JSX.Element {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div class="progressrow">
      <div class="progressrow__top">
        <strong>
          {done} / {total}
        </strong>
        <span class="progressrow__counts">
          <span class="mark-good">✓ {correct}</span>
          <span class="mark-bad">✗ {wrong}</span>
        </span>
      </div>
      <div class="bar" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
        <div class="bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** «Тўғри!» ёки «Хато» ёзуви. Ранг билан бирга белги ҳам бор. */
export function Verdict({ ok }: { ok: boolean }): JSX.Element {
  return (
    <p class={`verdict ${ok ? 'verdict--good' : 'verdict--bad'}`}>
      <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {ok ? 'Тўғри!' : 'Хато'}
    </p>
  );
}

/** Огоҳлантириш: жавоб ҳисобга олинмайди. */
export function Warning({ text }: { text: string }): JSX.Element {
  return (
    <p class="warning" role="alert">
      <span aria-hidden="true">!</span> {text}
    </p>
  );
}
