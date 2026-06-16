// components/quiz-lobby.ts — лобби хоста: код комнаты, список игроков, кик, старт игры.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { lobbyContext } from '../state/lobbyContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { LobbyController } from '../state/lobbyController';

@customElement('quiz-lobby')
class QuizLobby extends LitElement {
  // @consume гарантированно заполняет поля до первого render()
  @consume({ context: gameContext })
  gameStore!: GameStore;

  @consume({ context: lobbyContext })
  lobbyController!: LobbyController;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.gameStore.addEventListener(GAME_STORE_CHANGE_EVENT, this.handleStoreChange);
  }

  override disconnectedCallback(): void {
    this.gameStore.removeEventListener(GAME_STORE_CHANGE_EVENT, this.handleStoreChange);
    super.disconnectedCallback();
  }

  private readonly handleStoreChange = (): void => {
    this.requestUpdate();
  };

  private handleKick(playerId: string): void {
    this.lobbyController.kickPlayer(playerId);
  }

  private handleStart(): void {
    // TODO: разослать игрокам sync о смене фазы — экраны preview/question будут в следующем этапе
    this.gameStore.dispatch({ type: 'start_preview' });
  }

  protected override render() {
    const { roomCode, players } = this.gameStore.getState();

    return html`
      <div class="flex min-h-screen flex-col items-center gap-10 px-6 py-10 text-center">
        <div>
          <p class="text-2xl text-slate-500">Код комнаты</p>
          <p class="text-7xl font-extrabold tracking-widest">${roomCode}</p>
        </div>

        <ul class="flex flex-wrap justify-center gap-4">
          ${players.map(
            (player) => html`
              <li class="flex items-center gap-2 rounded-full bg-slate-200 px-5 py-3 text-xl">
                <span>${player.nickname}</span>
                <button
                  class="text-base text-red-600"
                  aria-label="Кикнуть ${player.nickname}"
                  @click=${() => this.handleKick(player.playerId)}
                >
                  ✕
                </button>
              </li>
            `,
          )}
        </ul>

        <button
          class="rounded-2xl bg-green-600 px-12 py-6 text-3xl font-bold text-white disabled:opacity-50"
          ?disabled=${players.length === 0}
          @click=${this.handleStart}
        >
          Начать игру
        </button>
      </div>
    `;
  }
}

export { QuizLobby };
