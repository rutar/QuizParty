// components/quiz-app.ts — корневой компонент: создаёт GameStore и LobbyController,
// предоставляет их потомкам через Lit Context, маршрутизирует экраны по фазе игры.

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import './quiz-start';
import './quiz-lobby';
import './quiz-join';
import './quiz-host-question';
import './quiz-player-question';
import './quiz-host-reveal';
import './quiz-player-reveal';
import './quiz-leaderboard';
import './quiz-final';
import { gameContext } from '../state/gameContext';
import { lobbyContext } from '../state/lobbyContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, GameStore } from '../state/gameStore';
import { LobbyController, SESSION_KEY } from '../state/lobbyController';
import type { PlayerSession } from '../state/lobbyController';
import { RoundController } from '../state/roundController';
import { createTransport } from '../net/createTransport';
import { loadState } from '../persistence/storage';

type View = 'start' | 'join';

@customElement('quiz-app')
class QuizApp extends LitElement {
  @provide({ context: gameContext })
  gameStore = new GameStore();

  private readonly transport = createTransport();

  @provide({ context: lobbyContext })
  lobbyController = new LobbyController(this.gameStore, this.transport);

  @provide({ context: roundContext })
  roundController = new RoundController(this.gameStore, this.transport);

  @state()
  private view: View = 'start';

  @state()
  private initialRoomCode = '';

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.gameStore.addEventListener(GAME_STORE_CHANGE_EVENT, this.handleStoreChange);

    const roomFromUrl = new URLSearchParams(location.search).get('room');
    if (roomFromUrl) {
      this.initialRoomCode = roomFromUrl.toUpperCase();
      this.view = 'join';
    } else {
      // Пробуем переподключить игрока по сохранённой сессии (если страница была перезагружена)
      void this.tryReconnect();
    }
  }

  override disconnectedCallback(): void {
    this.gameStore.removeEventListener(GAME_STORE_CHANGE_EVENT, this.handleStoreChange);
    super.disconnectedCallback();
  }

  private readonly handleStoreChange = (): void => {
    this.requestUpdate();
  };

  /** Восстанавливает сессию игрока из IndexedDB и отправляет request_sync хосту. */
  private async tryReconnect(): Promise<void> {
    const saved = await loadState(SESSION_KEY);
    if (!isPlayerSession(saved)) {
      return;
    }
    try {
      await this.transport.connect(saved.roomCode, 'player');
      this.gameStore.setRoomInfo('player', saved.roomCode);
      this.gameStore.setLocalPlayerId(saved.localPlayerId);
      this.transport.send({ type: 'request_sync', playerId: saved.localPlayerId });
    } catch {
      // Сессия устарела или сервер недоступен — игнорируем
    }
  }

  private handleNavigateJoin(): void {
    this.view = 'join';
  }

  protected override render() {
    const { phase, role } = this.gameStore.getState();

    if (phase === 'lobby') {
      return role === 'host'
        ? html`<quiz-lobby></quiz-lobby>`
        : html`<quiz-join .roomCode=${this.initialRoomCode}></quiz-join>`;
    }

    if (phase === 'preview' || phase === 'question') {
      return role === 'host'
        ? html`<quiz-host-question></quiz-host-question>`
        : html`<quiz-player-question></quiz-player-question>`;
    }

    if (phase === 'reveal') {
      return role === 'host'
        ? html`<quiz-host-reveal></quiz-host-reveal>`
        : html`<quiz-player-reveal></quiz-player-reveal>`;
    }

    if (phase === 'leaderboard') {
      return html`<quiz-leaderboard></quiz-leaderboard>`;
    }

    if (phase === 'finished') {
      return html`<quiz-final></quiz-final>`;
    }

    if (this.view === 'join') {
      return html`<quiz-join .roomCode=${this.initialRoomCode}></quiz-join>`;
    }

    return html`<quiz-start @navigate-join=${this.handleNavigateJoin}></quiz-start>`;
  }
}

function isPlayerSession(value: unknown): value is PlayerSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)['role'] === 'player' &&
    typeof (value as Record<string, unknown>)['roomCode'] === 'string' &&
    typeof (value as Record<string, unknown>)['localPlayerId'] === 'string' &&
    typeof (value as Record<string, unknown>)['nickname'] === 'string'
  );
}

export { QuizApp };
