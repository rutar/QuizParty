// game/validator.ts — чистая функция проверки ответа игрока. Без побочных эффектов.

/**
 * Ответ принимается, если clientTs <= deadline и ещё не получен ответ
 * от этого игрока на этот вопрос.
 */
export function validateAnswer(
  clientTs: number,
  deadline: number,
  alreadyAnswered: boolean,
): boolean {
  return !alreadyAnswered && clientTs <= deadline;
}
