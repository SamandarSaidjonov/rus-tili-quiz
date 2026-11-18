/** Кичик умумий компонентлар: иконка, русча матн, талаффуз тугмаси, прогресс, вердикт. */
import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { ICONS, type IconName } from '../lib/icons.ts';
import { splitStars } from '../lib/text.ts';
import { speak, ttsAvailable } from '../lib/tts.ts';

/** Инлайн SVG иконка: рангни атрофдаги матндан олади. */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/** Русча матн: `lang="ru"` шрифтни ҳам, овозни ҳам тўғри танлайди. `*сўз*` қалин кўринади. */
export function Ru({ text, class: cls }: { text: string; class?: string }): JSX.Element {
  return (
    <span class={cls} lang="ru">
      {splitStars(text).map((p, i) =>
        p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>,
      )}
    </span>
  );
}

/** Талаффуз тугмаси (`ru-RU`). Қурилмада рус овози бўлмаса, умуман кўрсатилмайди. */
export function Speak({
  text,
  small = false,
  label = 'Тинглаш',
}: {
  text: string;
  small?: boolean;
  label?: string;
}): JSX.Element | null {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(ttsAvailable());
  }, []);
  if (!ok || !text) return null;
  return (
    <button
      type="button"
      class={small ? 'rt-say rt-say--sm' : 'rt-say'}
      onClick={() => speak(text.replace(/\*/g, ''))}
      aria-label={label}
      title={label}
    >
      <Icon name="speaker" />
    </button>
  );
}

/** Квиз, машқ ёки тест ичидаги ўрин: «4 / 10», чизиқ ва ✓/✗ ҳисоби. */
export function Progress({
  pos,
  total,
  answered,
  correct,
  wrong,
  tally = true,
}: {
  pos: number;
  total: number;
  answered: number;
  correct?: number;
  wrong?: number;
  /** Тест пайтида тўғри/хато охиригача яширин — `false` беринг. */
  tally?: boolean;
}): JSX.Element {
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div class="rt-progress">
      <span class="rt-progress__pos">
        {pos} / {total}
      </span>
      <span
        class="rt-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-label={`${answered} та саволга жавоб берилган`}
      >
        <i style={{ width: `${pct}%` }} />
      </span>
      {tally && (
        <span class="rt-tally">
          <span class="rt-tally__ok">
            <Icon name="check" />
            <span class="rt-sr">Тўғри:</span>
            {correct ?? 0}
          </span>
          <span class="rt-tally__no">
            <Icon name="cross" />
            <span class="rt-sr">Хато:</span>
            {wrong ?? 0}
          </span>
        </span>
      )}
    </div>
  );
}

/** «Тўғри!» ёки «Хато». Ранг ёлғиз ўзи ҳолатни билдирмайди — иконка ва сўз доим бор. */
export function Verdict({ ok, shown = false }: { ok: boolean; shown?: boolean }): JSX.Element {
  return (
    <p class="rt-verdict">
      <Icon name={ok ? 'check' : 'cross'} />
      {shown ? 'Жавоб кўрсатилди' : ok ? 'Тўғри!' : 'Хато'}
    </p>
  );
}

/** Текширишдан олдинги огоҳлантириш: бу хато эмас, жавоб ҳисобга олинмайди. */
export function Warn({ text, id }: { text: string; id?: string }): JSX.Element {
  return (
    <p class="rt-warn" id={id} role="alert">
      <Icon name="alert" size={20} />
      <span>{text}</span>
    </p>
  );
}

/** 4 вариантли саволнинг битта варианти. */
export function Option({
  n,
  text,
  state,
  disabled,
  pressed,
  onPick,
}: {
  n: number;
  text: string;
  state?: 'selected' | 'correct' | 'wrong' | 'dim';
  disabled?: boolean;
  pressed?: boolean;
  onPick?: () => void;
}): JSX.Element {
  const mark = state === 'correct' ? 'check' : state === 'wrong' ? 'cross' : null;
  return (
    <li>
      <button
        type="button"
        class={`rt-option${state ? ` is-${state}` : ''}`}
        disabled={disabled}
        aria-pressed={pressed}
        onClick={onPick}
      >
        <span class="rt-option__key">{n}</span>
        <Ru text={text} class="rt-option__text" />
        <span class="rt-option__mark">
          {mark && (
            <>
              <Icon name={mark} />
              <span class="rt-sr">{state === 'correct' ? 'тўғри' : 'хато'}</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Танлов тугмаси: тўплам, машқ тури ва саволлар сони учун. */
export function Chip({
  on,
  label,
  count,
  onPick,
}: {
  on: boolean;
  label: string;
  count?: number;
  onPick: () => void;
}): JSX.Element {
  return (
    <button type="button" class="rt-chip" aria-pressed={on} onClick={onPick}>
      {on && <Icon name="check" size={18} />}
      {label}
      {count != null && <span class="rt-chip__count">{count}</span>}
    </button>
  );
}
