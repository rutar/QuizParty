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

export interface QuestionPreviewMessage {
  type: 'question_preview';
  questionId: string;
  index: number;
  total: number;
  deadline: number; // unix ms — конец preview-отсчёта
}

export interface QuestionMessage {
  type: 'question';
  questionId: string;
  text: string;
  options: readonly [string, string, string, string];
  durationMs: number;
  deadline: number; // unix ms
}

export interface AnswersClosedMessage {
  type: 'answers_closed';
  questionId: string;
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

export interface WelcomeMessage {
  type: 'welcome';
  playerId: string;
  roomCode: string;
}

export interface KickedMessage {
  type: 'kicked';
  playerId: string;
}

export interface GameEndedMessage {
  type: 'game_ended';
}

export type HostMessage =
  | QuestionPreviewMessage
  | QuestionMessage
  | AnswersClosedMessage
  | RevealMessage
  | SyncMessage
  | LobbyUpdateMessage
  | WelcomeMessage
  | KickedMessage
  | GameEndedMessage;

// player → host

export interface JoinMessage {
  type: 'join';
  playerId: string;
  nickname: string;
}

export interface AnswerMessage {
  type: 'answer';
  playerId: string; // relay не сохраняет отправителя в сообщении — указываем явно
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
