// components/quiz-join.ts — экран входа игрока: код комнаты + никнейм; после входа — список игроков.

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { lobbyContext } from '../state/lobbyContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { LobbyController } from '../state/lobbyController';
import './quiz-qr';

@customElement('quiz-join')
class QuizJoin extends LitElement {
  // @consume гарантированно заполняет поля до первого render()
  @consume({ context: gameContext })
  gameStore!: GameStore;

  @consume({ context: lobbyContext })
  lobbyController!: LobbyController;

  @property()
  roomCode = '';

  @state()
  private nickname = '';

  @state()
  private error: string | null = null;

  @state()
  private isJoining = false;

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

  private handleRoomCodeInput(event: InputEvent): void {
    this.roomCode = (event.target as HTMLInputElement).value.toUpperCase();
  }

  private handleNicknameInput(event: InputEvent): void {
    this.nickname = (event.target as HTMLInputElement).value;
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const roomCode = this.roomCode.trim();
    const nickname = this.nickname.trim();
    if (!roomCode || !nickname || this.isJoining) {
      return;
    }

    this.error = null;
    this.isJoining = true;
    try {
      await this.lobbyController.joinRoom(roomCode, nickname);
    } catch (cause) {
      console.error('Не удалось подключиться к комнате:', cause);
      this.error = 'Не удалось подключиться. Проверьте код комнаты.';
    } finally {
      this.isJoining = false;
    }
  }

  private renderForm() {
    return html`
      <form class="mx-auto flex max-w-xs flex-col gap-4 px-4 py-12" @submit=${this.handleSubmit}>
        <h1 class="text-center text-3xl font-bold">Войти в игру</h1>
        <input
          class="rounded-xl border-2 border-slate-300 px-4 py-4 text-center text-2xl uppercase tracking-widest"
          placeholder="КОД КОМНАТЫ"
          maxlength="6"
          .value=${this.roomCode}
          @input=${this.handleRoomCodeInput}
        />
        <input
          class="rounded-xl border-2 border-slate-300 px-4 py-4 text-center text-2xl"
          placeholder="Ваш ник"
          maxlength="20"
          .value=${this.nickname}
          @input=${this.handleNicknameInput}
        />
        <button
          type="submit"
          class="rounded-2xl bg-blue-600 px-8 py-5 text-2xl font-semibold text-white disabled:opacity-50"
          ?disabled=${this.isJoining}
        >
          ${this.isJoining ? 'Подключение…' : 'Войти'}
        </button>
        ${this.error ? html`<p class="text-center text-lg text-red-500">${this.error}</p>` : ''}
      </form>
    `;
  }

  private renderWaiting() {
    const { players, roomCode } = this.gameStore.getState();
    return html`
      <div class="flex min-h-screen flex-col items-center gap-6 px-4 py-10 text-center">
        <p class="text-xl text-slate-500">Код комнаты</p>
        <p class="text-5xl font-bold tracking-widest">${roomCode}</p>
        <p class="text-2xl">Ждём начала игры…</p>

        <!-- QR только в фазе lobby — позвать ещё игроков -->
        <div class="flex flex-col items-center gap-2">
          <quiz-qr .roomCode=${roomCode} .size=${240}></quiz-qr>
          <p class="text-base text-slate-500">Позови ещё игроков — пусть отсканируют</p>
        </div>

        <ul class="flex flex-wrap justify-center gap-3">
          ${players.map(
            (player) => html`
              <li class="rounded-full bg-slate-200 px-5 py-2 text-lg">${player.nickname}</li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  protected override render() {
    const { phase } = this.gameStore.getState();
    return phase === 'lobby' ? this.renderWaiting() : this.renderForm();
  }
}

export { QuizJoin };
