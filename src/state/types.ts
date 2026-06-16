// Базовые типы игрового состояния. Используются State Layer, Game Logic и UI.

import type { ConnectionState } from '../net/transport';

/** Роль участника соединения. */
export type Role = 'host' | 'player';

/** Фазы игры. Переходы описаны в machine.ts. */
export type Phase =
  | 'idle'
  | 'lobby'
  | 'preview'
  | 'question'
  | 'reveal'
  | 'leaderboard'
  | 'finished';

/** Индекс варианта ответа: 0=▲ красный, 1=◆ синий, 2=● жёлтый, 3=■ зелёный. */
export type AnswerChoice = 0 | 1 | 2 | 3;

export interface Player {
  playerId: string;
  nickname: string;
  score: number;
  connected: boolean;
}

export interface Question {
  questionId: string;
  text: string;
  options: readonly [string, string, string, string];
  correctIndex: AnswerChoice;
  durationMs: number;
}

export interface AnswerRecord {
  playerId: string;
  questionId: string;
  choice: AnswerChoice;
  clientTs: number;
  score: number;
}

/** Каноническое определение — net/transport.ts (Transport — владелец контракта связи). */
export type { ConnectionState };

/** Полное игровое состояние, хранимое в GameStore. */
export interface GameState {
  phase: Phase;
  roomCode: string | null;
  role: Role | null;
  players: Player[];
  questions: Question[];
  currentQuestionIndex: number;
  currentDeadline: number | null;
  answers: AnswerRecord[];
  connectionState: ConnectionState;
}
