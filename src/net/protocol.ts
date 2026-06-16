// net/protocol.ts — единый протокол сообщений между хостом и игроками.
// Намеренно не зависит от state/ и game/: формат сообщений на проводе
// должен быть стабилен независимо от внутреннего устройства домена (ШОВ под v2.0).

/** Индекс варианта ответа в протоколе: 0=▲, 1=◆, 2=●, 3=■. */
export type AnswerChoice = 0 | 1 | 2 | 3;

export interface PlayerSummary {
  playerId: string;
  nickname: string;
  score: number;
}

// host → players

export interface QuestionMessage {
  type: 'question';
  questionId: string;
  text: string;
  options: readonly [string, string, string, string];
  deadline: number; // unix ms
}

export interface RevealMessage {
  type: 'reveal';
  correctIndex: AnswerChoice;
  distribution: Record<AnswerChoice, number>;
  scoreboard: PlayerSummary[];
}

export interface SyncMessage {
  type: 'sync';
  phase: string;
  state: unknown;
}

export interface LobbyUpdateMessage {
  type: 'lobby_update';
  players: PlayerSummary[];
}

export type HostMessage =
  | QuestionMessage
  | RevealMessage
  | SyncMessage
  | LobbyUpdateMessage;

// player → host

export interface JoinMessage {
  type: 'join';
  playerId: string;
  nickname: string;
}

export interface AnswerMessage {
  type: 'answer';
  questionId: string;
  choice: AnswerChoice;
  clientTs: number;
}

export interface RequestSyncMessage {
  type: 'request_sync';
  playerId: string;
}

export type PlayerMessage = JoinMessage | AnswerMessage | RequestSyncMessage;

/** Служебные сообщения транспортного уровня (не относятся к игровой логике). */
export type SystemMessage = { type: 'ping' } | { type: 'pong' };

export type GameMessage = HostMessage | PlayerMessage | SystemMessage;
