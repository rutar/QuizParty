// components/quiz-final.ts — финальный экран: победитель, топ-5, кнопки новой игры/завершения.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';

@customElement('quiz-final')
class QuizFinal extends LitElement {
  // @consume гарантированно заполняет поля до первого render()
  @consume({ context: gameContext })
  gameStore!: GameStore;

  @consume({ context: roundContext })
  roundController!: RoundController;

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

  private handleNewGame(): void {
    this.roundController.newGame();
  }

  private handleEndGame(): void {
    this.roundController.endGame();
  }

  protected override render() {
    const { players, role } = this.gameStore.getState();
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const winner = ranked[0];
    const top5 = ranked.slice(0, 5);

    return html`
      <div class="flex min-h-screen flex-col items-center gap-10 px-8 py-10 text-center">
        <h1 class="text-6xl font-extrabold">Игра окончена!</h1>

        ${winner
          ? html`
              <div class="rounded-3xl bg-yellow-300 px-12 py-8 text-center shadow-lg">
                <p class="text-3xl font-semibold text-yellow-900">Победитель</p>
                <p class="mt-2 text-7xl font-extrabold">${winner.nickname}</p>
                <p class="mt-2 text-4xl font-bold text-yellow-800">${winner.score} очков</p>
              </div>
            `
          : ''}

        ${top5.length > 1
          ? html`
              <ol class="flex w-full max-w-xl flex-col gap-3">
                ${top5.map(
                  (player, index) => html`
                    <li
                      class="flex items-center justify-between rounded-xl bg-slate-100 px-6 py-4 text-3xl ${index === 0 ? 'opacity-0' : ''}"
                    >
                      <span>${index + 1}. ${player.nickname}</span>
                      <span class="font-bold">${player.score}</span>
                    </li>
                  `,
                )}
              </ol>
            `
          : ''}

        ${role === 'host'
          ? html`
              <div class="flex gap-6">
                <button
                  class="rounded-2xl bg-green-600 px-10 py-5 text-3xl font-bold text-white"
                  @click=${this.handleNewGame}
                >
                  Новая игра
                </button>
                <button
                  class="rounded-2xl bg-slate-600 px-10 py-5 text-3xl font-bold text-white"
                  @click=${this.handleEndGame}
                >
                  Закончить
                </button>
              </div>
            `
          : html`<p class="text-2xl text-slate-400">Ждём хоста…</p>`}
      </div>
    `;
  }
}

export { QuizFinal };
