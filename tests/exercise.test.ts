import { describe, expect, it } from 'vitest';
import { checkExercise, dealByType, fixWords, fullAnswer, maskWords } from '../src/lib/exercise.ts';
import type { ExerciseItem } from '../src/lib/types.ts';

const item = (over: Partial<ExerciseItem> = {}): ExerciseItem => ({
  id: 'x1',
  prompt: 'Мен Тошкентда яшайман.',
  answers: ['Я живу в Ташкенте.'],
  note: 'изоҳ',
  source: 'claude',
  reviewed: false,
  ...over,
});

describe('checkExercise: юмшоқ текширув', () => {
  it('катта-кичик ҳарф, тиниш белгиси, урғу ва ё/е хато ҳисобланмайди', () => {
    expect(checkExercise(item(), 'translate', 'я живу в ташкенте').state).toBe('correct');
    expect(checkExercise(item(), 'translate', 'Я живу́ в Ташкенте').state).toBe('correct');
    expect(checkExercise(item(), 'translate', '  Я живу в Ташкенте!  ').state).toBe('correct');
  });

  it('бир нечта тўғри вариантни қабул қилади', () => {
    const it2 = item({ answers: ['Я живу в Ташкенте.', 'В Ташкенте я живу.'] });
    expect(checkExercise(it2, 'translate', 'в ташкенте я живу').state).toBe('correct');
  });

  it('бўш жавобда огоҳлантиради', () => {
    const res = checkExercise(item(), 'translate', '   ');
    expect(res.state).toBe('empty');
    expect(res.warning).toBeTruthy();
  });

  it('лотин ҳарфида огоҳлантиради', () => {
    const res = checkExercise(item(), 'translate', 'Ya zhivu v Tashkente');
    expect(res.state).toBe('latin');
  });

  it('хато жавобни хато деб топади', () => {
    expect(checkExercise(item(), 'translate', 'Я живу в Ташкент').state).toBe('wrong');
  });
});

describe('checkExercise: турлар', () => {
  it('ending турида олдидаги чизиқча ҳисобга олинмайди', () => {
    const it2 = item({ prompt: 'Я живу в Ташкент___.', answers: ['е'] });
    expect(checkExercise(it2, 'ending', 'е').state).toBe('correct');
    expect(checkExercise(it2, 'ending', '-е').state).toBe('correct');
    expect(checkExercise(it2, 'ending', 'у').state).toBe('wrong');
  });

  it('fix турида фақат тузатилган сўзни ёзиш ҳам тўғри', () => {
    const it2 = item({ prompt: 'Я живу в Москва.', answers: ['Я живу в Москве.'] });
    expect(fixWords(it2)).toBe('москве');
    expect(checkExercise(it2, 'fix', 'Москве').state).toBe('correct');
    expect(checkExercise(it2, 'fix', 'Я живу в Москве.').state).toBe('correct');
    expect(checkExercise(it2, 'fix', 'Я живу в Москву.').state).toBe('wrong');
  });

  it('identify турида падеж номининг қисқа шакли ҳам бўлади', () => {
    const it2 = item({ prompt: 'Я пишу [[ручкой]].', answers: ['творительный'] });
    expect(checkExercise(it2, 'identify', 'творительный').state).toBe('correct');
    expect(checkExercise(it2, 'identify', 'Т.п.').state).toBe('correct');
    expect(checkExercise(it2, 'identify', 'дательный').state).toBe('wrong');
    expect(checkExercise(it2, 'identify', 'шунчаки матн').state).toBe('unknown-case');
  });

  it('choose турида танланган вариант солиштирилади', () => {
    const it2 = item({
      prompt: 'Я думаю о ___',
      answers: ['маме'],
      options: ['мама', 'маме', 'маму', 'мамой'],
    });
    expect(checkExercise(it2, 'choose', 'маме').state).toBe('correct');
    expect(checkExercise(it2, 'choose', 'маму').state).toBe('wrong');
  });

  it('choose турида лотин огоҳлантириши чиқмайди', () => {
    const it2 = item({ answers: ['маме'], options: ['мама', 'маме', 'маму', 'мамой'] });
    expect(checkExercise(it2, 'choose', 'маме').state).toBe('correct');
  });
});

describe('fullAnswer', () => {
  it('бўш жойни жавоб билан тўлдиради', () => {
    expect(fullAnswer(item({ prompt: 'Я живу в Ташкент___.', answers: ['е'] }), 'ending')).toBe(
      'Я живу в Ташкент*е*.',
    );
  });

  it('қавсдаги сўзни жавоб билан алмаштиради', () => {
    expect(fullAnswer(item({ prompt: 'Я горжусь (сын).', answers: ['сыном'] }), 'bracket')).toBe(
      'Я горжусь *сыном*.',
    );
  });

  it('identify турида таҳлил қилинган сўзни ажратади', () => {
    expect(
      fullAnswer(item({ prompt: 'Я пишу [[ручкой]].', answers: ['творительный'] }), 'identify'),
    ).toBe('Я пишу *ручкой*.');
  });

  it('таржимада тўлиқ гапни қайтаради', () => {
    expect(fullAnswer(item(), 'translate')).toBe('Я живу в Ташкенте.');
  });
});

describe('maskWords', () => {
  it('фойдаланувчи топа олмаган сўзларни белгилайди', () => {
    const words = maskWords('Я живу в Ташкенте.', 'Я живу в Ташкент');
    expect(words.map((w) => w.hit)).toEqual([true, true, true, false]);
  });
});

describe('dealByType', () => {
  it('турларни навбатма-навбат тарқатади ва сонни чеклайди', () => {
    const groups = [
      [{ type: 'translate' as const, id: 'a1' }, { type: 'translate' as const, id: 'a2' }],
      [{ type: 'fix' as const, id: 'b1' }, { type: 'fix' as const, id: 'b2' }],
    ];
    const all = dealByType(groups, 'all', () => 0.5);
    expect(all).toHaveLength(4);
    const three = dealByType(groups, 3, () => 0.5);
    expect(three).toHaveLength(3);
    const types = new Set(three.map((t) => t.type));
    expect(types.size).toBe(2);
  });
});
