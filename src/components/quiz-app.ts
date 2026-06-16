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
import { gameContext } from '../state/gameContext';
import { lobbyContext } from '../state/lobbyContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, GameStore } from '../state/gameStore';
import { LobbyController } from '../state/lobbyController';
import { RoundController } from '../state/roundController';
import { createTransport } from '../net/createTransport';

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

    if (phase !== 'idle') {
      // TODO: экран finished и переход к следующему вопросу — Этап 5
      return html`<p class="p-8 text-center text-xl">Экран для фазы «${phase}» пока не реализован.</p>`;
    }

    if (this.view === 'join') {
      return html`<quiz-join .roomCode=${this.initialRoomCode}></quiz-join>`;
    }

    return html`<quiz-start @navigate-join=${this.handleNavigateJoin}></quiz-start>`;
  }
}

export { QuizApp };
