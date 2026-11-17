/** Талаффуз: Web Speech API, ru-RU. Овоз бўлмаса, тугма кўрсатилмайди. */
import { stripAccent } from './text.ts';

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function russianVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => /^ru/i.test(v.lang)) ?? null;
  } catch {
    return null;
  }
}

/** `*сўз*` белгилари ва урғу белгиси ўқилмайди. */
export function speak(text: string): void {
  if (!ttsAvailable()) return;
  const clean = stripAccent(text).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ru-RU';
    const voice = russianVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* эътиборсиз */
  }
}
