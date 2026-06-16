// game/scoring.ts — чистая функция подсчёта очков. Без побочных эффектов,
// без зависимостей на DOM/сеть/Lit (Game Logic не знает о сети и UI).

/**
 * Очки за ответ: 1000 за мгновенный верный ответ, 500 на грани таймера,
 * 0 за неверный или просроченный. Формула из CLAUDE.md:
 * score = round(1000 - 500 * (timeTakenMs / durationMs)).
 */
export function calculateScore(
  isCorrect: boolean,
  timeTakenMs: number,
  durationMs: number,
): number {
  if (!isCorrect) {
    return 0;
  }
  return Math.round(1000 - 500 * (timeTakenMs / durationMs));
}
