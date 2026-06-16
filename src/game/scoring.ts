// game/scoring.ts — чистая функция подсчёта очков. Без побочных эффектов,
// без зависимостей на DOM/сеть/Lit (Game Logic не знает о сети и UI).

/**
 * Очки за ответ: 1000 за мгновенный верный ответ, 500 на грани таймера,
 * 0 за неверный или просроченный. Формула из CLAUDE.md:
 * score = round(1000 - 500 * (timeTakenMs / durationMs)).
 */
export function calculateScore(
  _isCorrect: boolean,
  _timeTakenMs: number,
  _durationMs: number,
): number {
  // TODO: реализовать формулу подсчёта очков
  throw new Error('not implemented');
}
