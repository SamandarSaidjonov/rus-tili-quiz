/** Матн билан ишлайдиган кичик функциялар. Бу файл DOM'га боғлиқ эмас — тестлардан ҳам чақирилади. */

export const CASES = {
  И: 'именительный',
  Р: 'родительный',
  Д: 'дательный',
  В: 'винительный',
  Т: 'творительный',
  П: 'предложный',
} as const;

export type CaseLetter = keyof typeof CASES;

export const ACCENT = '\u0301';

/** Урғу белгисини олиб ташлайди. */
export const stripAccent = (s: string): string => s.replace(/\u0301/g, '');

/**
 * Солиштириш учун матнни оддий кўринишга келтиради:
 * кичик ҳарф, урғу йўқ, ё→е, тиниш белгилари ва ортиқча бўш жойлар йўқ.
 */
export function norm(s: string): string {
  return stripAccent(String(s ?? ''))
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export const toks = (s: string): string[] => norm(s).split(' ').filter(Boolean);

/** Лотин ҳарфи борми? (Жавоб рус ҳарфида ёзилиши керак.) */
export const hasLatin = (s: string): boolean => /[a-z]/i.test(s);

/** `*сўз*` белгиланган қисмларни ажратади: рендерда <b> бўлади. */
export function splitStars(s: string): Array<{ text: string; bold: boolean }> {
  const out: Array<{ text: string; bold: boolean }> = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}

/** Машқ матнидаги белгиларни тозалайди: `___`, `(сўз)`, `[[сўз]]` ўқиш учун қолдирилади. */
export const plainPrompt = (s: string): string =>
  s.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/_{2,}/g, '…').replace(/[()]/g, '');

/** «дательный», «дат», «Д.п.», «дп», «д» — ҳаммасини Д га айлантиради. */
export function parseCase(s: string): CaseLetter | null {
  const n = norm(s).replace(/\s+/g, '');
  const prefixes: Array<[string, CaseLetter]> = [
    ['им', 'И'], ['род', 'Р'], ['дат', 'Д'], ['вин', 'В'], ['тв', 'Т'], ['пред', 'П'],
  ];
  const hit = prefixes.find(([p]) => n.startsWith(p));
  if (hit) return hit[1];
  const one = /^([ирдвтп])п?$/.exec(n);
  return one ? (one[1]!.toUpperCase() as CaseLetter) : null;
}

/**
 * Сўзлар бўйича энг узун умумий кетма-кетлик.
 * `hit[j]` — тўғри жавобдаги j-сўзни фойдаланувчи ҳам ёзганми.
 */
export function lcsMask(user: string[], ans: string[]): { hit: boolean[]; score: number } {
  const m = user.length;
  const n = ans.length;
  const T: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      T[i]![j] = user[i] === ans[j] ? T[i + 1]![j + 1]! + 1 : Math.max(T[i + 1]![j]!, T[i]![j + 1]!);
    }
  }
  const hit = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (user[i] === ans[j]) {
      hit[j] = true;
      i++;
      j++;
    } else if (T[i + 1]![j]! >= T[i]![j + 1]!) i++;
    else j++;
  }
  return { hit, score: T[0]![0]! };
}

/** Тасодифий аралаштириш (Fisher–Yates). */
export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
