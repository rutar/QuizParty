// Чистая функция перехода состояний хоста.
// idle → lobby → preview → question → reveal → leaderboard → (preview | finished) → idle | lobby

import type { Phase } from './types';

/** События, инициирующие переход фазы. */
export type GameEvent =
  | { type: 'start_lobby' }
  | { type: 'start_preview' }
  | { type: 'start_question' }
  | { type: 'reveal' }
  | { type: 'show_leaderboard' }
  | { type: 'next_question' }
  | { type: 'finish' }
  | { type: 'reset' };

/**
 * Таблица допустимых переходов: phase → { тип события → следующая фаза }.
 * Любая пара (фаза, событие), отсутствующая в таблице, не меняет фазу.
 */
const TRANSITIONS: Record<Phase, Partial<Record<GameEvent['type'], Phase>>> = {
  idle: {
    start_lobby: 'lobby',
  },
  lobby: {
    start_preview: 'preview',
  },
  preview: {
    start_question: 'question',
  },
  question: {
    reveal: 'reveal',
  },
  reveal: {
    show_leaderboard: 'leaderboard',
  },
  leaderboard: {
    next_question: 'preview',
    finish: 'finished',
  },
  finished: {
    start_lobby: 'lobby',
  },
};

/**
 * Вычисляет следующую фазу по текущей фазе и событию.
 * 'reset' работает из любой фазы и всегда ведёт в idle.
 * Неизвестная комбинация фазы и события возвращает текущую фазу без изменений.
 */
export function transition(phase: Phase, event: GameEvent): Phase {
  if (event.type === 'reset') {
    return 'idle';
  }
  return TRANSITIONS[phase][event.type] ?? phase;
}
