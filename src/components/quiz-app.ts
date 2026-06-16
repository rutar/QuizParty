// components/quiz-app.ts — корневой компонент: создаёт GameStore и LobbyController,
// предоставляет их потомкам через Lit Context, маршрутизирует экраны по фазе игры.

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import './quiz-start';
import './quiz-lobby';
import './quiz-join';
import { gameContext } from '../state/gameContext';
import { lobbyContext } from '../state/lobbyContext';
import { GAME_STORE_CHANGE_EVENT, GameStore } from '../state/gameStore';
import { LobbyController } from '../state/lobbyController';
import { createTransport } from '../net/createTransport';

type View = 'start' | 'join';

@customElement('quiz-app')
class QuizApp extends LitElement {
  @provide({ context: gameContext })
  gameStore = new GameStore();

  @provide({ context: lobbyContext })
  lobbyController = new LobbyController(this.gameStore, createTransport());

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
    }
  }

  override disconnectedCallback(): void {
    this.gameStore.removeEventListener(GAME_STORE_CHANGE_EVENT, this.handleStoreChange);
    super.disconnectedCallback();
  }

  private readonly handleStoreChange = (): void => {
    this.requestUpdate();
  };

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

    if (phase !== 'idle') {
      // TODO: экраны preview/question/reveal/leaderboard/final — следующие этапы
      return html`<p class="p-8 text-center text-xl">Экран для фазы «${phase}» пока не реализован.</p>`;
    }

    if (this.view === 'join') {
      return html`<quiz-join .roomCode=${this.initialRoomCode}></quiz-join>`;
    }

    return html`<quiz-start @navigate-join=${this.handleNavigateJoin}></quiz-start>`;
  }
}

export { QuizApp };
