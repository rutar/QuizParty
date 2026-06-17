// Единый источник игрового состояния. UI подписывается на изменения через EventTarget,
// доступ из компонентов — через Lit Context (gameContext.ts).

import type {
  AnswerRecord,
  CurrentQuestion,
  GameState,
  Player,
  Question,
  RevealInfo,
  Role,
} from './types';
import { transition, type GameEvent } from './machine';

/** Имя кастомного события, диспатчится при любом изменении state. */
export const GAME_STORE_CHANGE_EVENT = 'game-store-change';

function createInitialState(): GameState {
  return {
    phase: 'idle',
    roomCode: null,
    role: null,
    localPlayerId: null,
    players: [],
    questions: [],
    currentQuestionIndex: 0,
    currentQuestion: null,
    currentDeadline: null,
    lastReveal: null,
    answers: [],
    connectionState: 'disconnected',
  };
}

export class GameStore extends EventTarget {
  private state: GameState = createInitialState();

  /** Возвращает копию текущего состояния — мутировать напрямую нельзя. */
  getState(): Readonly<GameState> {
    return {
      ...this.state,
      players: [...this.state.players],
      questions: [...this.state.questions],
      answers: [...this.state.answers],
    };
  }

  /** Вычисляет новую фазу через transition() и нотифицирует подписчиков. */
  dispatch(event: GameEvent): void {
    const phase = transition(this.state.phase, event);
    this.state = { ...this.state, phase };
    this.notify();
  }

  /** Фиксирует роль участника и код комнаты после успешного connect(). */
  setRoomInfo(role: Role, roomCode: string): void {
    this.state = { ...this.state, role, roomCode };
    this.notify();
  }

  /** ID, под которым этот клиент участвует как игрок (нужен и Lobby-, и RoundController). */
  setLocalPlayerId(playerId: string): void {
    this.state = { ...this.state, localPlayerId: playerId };
    this.notify();
  }

  /** Заменяет ростер игроков целиком (используется LobbyController). */
  setPlayers(players: Player[]): void {
    this.state = { ...this.state, players };
    this.notify();
  }

  /** Загруженный набор вопросов раунда (используется RoundController). */
  setQuestions(questions: Question[]): void {
    this.state = { ...this.state, questions };
    this.notify();
  }

  /** Индекс текущего вопроса в this.state.questions. */
  setCurrentQuestionIndex(index: number): void {
    this.state = { ...this.state, currentQuestionIndex: index };
    this.notify();
  }

  /** Вопрос, отображаемый прямо сейчас (без correctIndex). */
  setCurrentQuestion(question: CurrentQuestion | null): void {
    this.state = { ...this.state, currentQuestion: question };
    this.notify();
  }

  /** Дедлайн текущего таймера (конец preview-отсчёта или конец приёма ответов). */
  setDeadline(deadline: number | null): void {
    this.state = { ...this.state, currentDeadline: deadline };
    this.notify();
  }

  /** Данные раскрытия последнего вопроса (правильный ответ + распределение голосов). */
  setLastReveal(reveal: RevealInfo | null): void {
    this.state = { ...this.state, lastReveal: reveal };
    this.notify();
  }

  /** Сброс для новой игры: обнуляет очки игроков, очищает данные раунда. Игроки остаются. */
  resetForNewGame(): void {
    const players = this.state.players.map((player) => ({ ...player, score: 0 }));
    this.state = {
      ...this.state,
      players,
      questions: [],
      answers: [],
      currentQuestionIndex: 0,
      currentQuestion: null,
      currentDeadline: null,
      lastReveal: null,
    };
    this.notify();
  }

  /** Принудительно устанавливает фазу в обход state machine — только для обработки sync. */
  forcePhase(phase: import('./types').Phase): void {
    this.state = { ...this.state, phase };
    this.notify();
  }

  /** Сохраняет принятый ответ и начисляет очки игроку. */
  recordAnswer(record: AnswerRecord): void {
    const players = this.state.players.map((player) =>
      player.playerId === record.playerId
        ? { ...player, score: player.score + record.score }
        : player,
    );
    this.state = { ...this.state, answers: [...this.state.answers, record], players };
    this.notify();
  }

  private notify(): void {
    this.dispatchEvent(new Event(GAME_STORE_CHANGE_EVENT));
  }
}
