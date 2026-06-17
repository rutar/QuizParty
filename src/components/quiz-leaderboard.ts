// components/quiz-leaderboard.ts — экран ТВ: таблица лидеров между раундами.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';

@customElement('quiz-leaderboard')
class QuizLeaderboard extends LitElement {
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

  private handleNext(): void {
    this.roundController.nextQuestion();
  }

  protected override render() {
    const { players, role, currentQuestionIndex, questions } = this.gameStore.getState();
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    return html`
      <div class="flex min-h-screen flex-col items-center gap-8 px-8 py-10">
        <h1 class="text-5xl font-extrabold">Таблица лидеров</h1>
        <ol class="flex w-full max-w-xl flex-col gap-3">
          ${ranked.map(
            (player, index) => html`
              <li class="flex items-center justify-between rounded-xl bg-slate-100 px-6 py-4 text-3xl">
                <span>${index + 1}. ${player.nickname}</span>
                <span class="font-bold">${player.score}</span>
              </li>
            `,
          )}
        </ol>

        ${role === 'host'
          ? html`
              <button
                class="rounded-2xl bg-blue-600 px-10 py-5 text-3xl font-bold text-white"
                @click=${this.handleNext}
              >
                ${isLastQuestion ? 'Завершить игру →' : 'Следующий вопрос →'}
              </button>
            `
          : html`<p class="text-2xl text-slate-400">Ждём хоста…</p>`}
      </div>
    `;
  }
}

export { QuizLeaderboard };
