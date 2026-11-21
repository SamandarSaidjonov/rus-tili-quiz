import { describe, expect, it } from 'vitest';
import {
  lcsMask, norm, parseCase, parseTense, hasLatin, splitStars, stripAccent,
} from '../src/lib/text.ts';

describe('norm', () => {
  it('катта-кичик ҳарф, тиниш белгиси ва урғуни ҳисобга олмайди', () => {
    expect(norm('Я живу́ в Ташкенте!')).toBe('я живу в ташкенте');
    expect(norm('  Я  живу   в  Ташкенте  ')).toBe('я живу в ташкенте');
  });

  it('ё ва е ни бир хил деб кўради', () => {
    expect(norm('ещё')).toBe(norm('еще'));
  });
});

describe('stripAccent', () => {
  it('урғу белгисини олиб ташлайди', () => {
    expect(stripAccent('чита́ть')).toBe('читать');
  });
});

describe('hasLatin', () => {
  it('лотин ҳарфини топади', () => {
    expect(hasLatin('Ya zhivu')).toBe(true);
    expect(hasLatin('Я живу')).toBe(false);
  });
});

describe('parseCase', () => {
  it('падеж номининг турли шаклларини танийди', () => {
    expect(parseCase('дательный')).toBe('Д');
    expect(parseCase('дат')).toBe('Д');
    expect(parseCase('Д.п.')).toBe('Д');
    expect(parseCase('дп')).toBe('Д');
    expect(parseCase('д')).toBe('Д');
    expect(parseCase('предложный падеж')).toBe('П');
    expect(parseCase('творительный')).toBe('Т');
  });

  it('танимаса null қайтаради', () => {
    expect(parseCase('билмадим')).toBe(null);
    expect(parseCase('')).toBe(null);
  });
});

describe('splitStars', () => {
  it('*сўз* ни ажратади', () => {
    expect(splitStars('Я *читаю* книгу')).toEqual([
      { text: 'Я ', bold: false },
      { text: 'читаю', bold: true },
      { text: ' книгу', bold: false },
    ]);
  });

  it('белги бўлмаса бутун матнни қайтаради', () => {
    expect(splitStars('Я читаю')).toEqual([{ text: 'Я читаю', bold: false }]);
  });
});

describe('lcsMask', () => {
  it('фойдаланувчи топган сўзларни белгилайди', () => {
    const ans = ['я', 'живу', 'в', 'ташкенте'];
    const user = ['я', 'живу', 'в', 'ташкент'];
    const { hit } = lcsMask(user, ans);
    expect(hit).toEqual([true, true, true, false]);
  });

  it('бўш жавобда ҳеч нарса белгиланмайди', () => {
    const { hit, score } = lcsMask([], ['я', 'живу']);
    expect(hit).toEqual([false, false]);
    expect(score).toBe(0);
  });
});

describe('parseTense', () => {
  it('ҳозирги замоннинг ҳамма ёзувини танийди', () => {
    for (const s of ['настоящее', 'Настоящее время', 'наст', 'н.в.', 'Н.В.', 'нв', 'н', 'ҳозирги']) {
      expect(parseTense(s), s).toBe('настоящее');
    }
  });

  it('ўтган замоннинг ҳамма ёзувини танийди', () => {
    for (const s of ['прошедшее', 'прош', 'п.в.', 'пв', 'п', 'ўтган', 'Ўтган замон']) {
      expect(parseTense(s), s).toBe('прошедшее');
    }
  });

  it('келаси замоннинг ҳамма ёзувини танийди', () => {
    for (const s of ['будущее', 'буд', 'б.в.', 'бв', 'б', 'келаси']) {
      expect(parseTense(s), s).toBe('будущее');
    }
  });

  it('танимаса null қайтаради', () => {
    for (const s of ['', '   ', 'билмадим', 'дательный', 'в', 'нп', 'present']) {
      expect(parseTense(s), s).toBe(null);
    }
  });
});
