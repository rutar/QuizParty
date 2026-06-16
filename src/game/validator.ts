// game/validator.ts — чистая функция проверки ответа игрока. Без побочных эффектов.

/**
 * Ответ принимается, если clientTs <= deadline и ещё не получен ответ
 * от этого игрока на этот вопрос.
 */
export function validateAnswer(
  _clientTs: number,
  _deadline: number,
  _alreadyAnswered: boolean,
): boolean {
  // TODO: реализовать правило приёма ответа
  throw new Error('not implemented');
}
