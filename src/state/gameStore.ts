// Единый источник игрового состояния. UI подписывается на изменения через EventTarget,
// доступ из компонентов — через Lit Context (gameContext.ts).

import type { GameState, Player, Role } from './types';
import { transition, type GameEvent } from './machine';

/** Имя кастомного события, диспатчится при любом изменении state. */
export const GAME_STORE_CHANGE_EVENT = 'game-store-change';

function createInitialState(): GameState {
  return {
    phase: 'idle',
    roomCode: null,
    role: null,
    players: [],
    questions: [],
    currentQuestionIndex: 0,
    currentDeadline: null,
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

  /** Заменяет ростер игроков целиком (используется LobbyController). */
  setPlayers(players: Player[]): void {
    this.state = { ...this.state, players };
    this.notify();
  }

  private notify(): void {
    this.dispatchEvent(new Event(GAME_STORE_CHANGE_EVENT));
  }
}
