/**
 * Статик саҳифалардаги талаффуз тугмалари (`<button data-say="…">`).
 * Қурилмада рус овози бўлмаса, тугмалар умуман кўрсатилмайди.
 */
import { speak, ttsAvailable } from './tts.ts';

export function wireSpeak(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLElement>('[data-say]');
  if (!ttsAvailable()) {
    buttons.forEach((b) => b.remove());
    return;
  }
  buttons.forEach((b) => {
    b.addEventListener('click', () => speak(b.dataset.say ?? ''));
  });
}
