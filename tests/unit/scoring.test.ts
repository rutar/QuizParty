import { describe, expect, it } from 'vitest';
import { calculateScore } from '../../src/game/scoring';

describe('calculateScore', () => {
  it('возвращает 0 за неверный ответ независимо от времени', () => {
    expect(calculateScore(false, 0, 10000)).toBe(0);
    expect(calculateScore(false, 9999, 10000)).toBe(0);
  });

  it('возвращает 1000 за мгновенный верный ответ', () => {
    expect(calculateScore(true, 0, 10000)).toBe(1000);
  });

  it('возвращает 500 за верный ответ на грани таймера', () => {
    expect(calculateScore(true, 10000, 10000)).toBe(500);
  });

  it('линейно убывает между 1000 и 500', () => {
    expect(calculateScore(true, 5000, 10000)).toBe(750);
    expect(calculateScore(true, 2500, 10000)).toBe(875);
  });

  it('округляет результат до целого', () => {
    expect(calculateScore(true, 1000, 3000)).toBe(833);
  });

  it('не зависит от единиц измерения, только от соотношения времени', () => {
    expect(calculateScore(true, 1000, 2000)).toBe(calculateScore(true, 500, 1000));
  });
});
