import { describe, expect, it } from 'vitest';
import { validateAnswer } from '../../src/game/validator';

describe('validateAnswer', () => {
  it('принимает ответ до дедлайна, если игрок ещё не отвечал', () => {
    expect(validateAnswer(1000, 2000, false)).toBe(true);
  });

  it('принимает ответ ровно в момент дедлайна', () => {
    expect(validateAnswer(2000, 2000, false)).toBe(true);
  });

  it('отклоняет ответ после дедлайна', () => {
    expect(validateAnswer(2001, 2000, false)).toBe(false);
  });

  it('отклоняет повторный ответ, даже если успели вовремя', () => {
    expect(validateAnswer(1000, 2000, true)).toBe(false);
  });

  it('отклоняет повторный просроченный ответ', () => {
    expect(validateAnswer(3000, 2000, true)).toBe(false);
  });
});
