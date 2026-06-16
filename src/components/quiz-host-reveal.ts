// components/quiz-host-reveal.ts — экран ТВ: правильный ответ и распределение ответов.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';
import type { AnswerChoice } from '../state/types';
import { ANSWER_STYLES } from './answerStyles';

@customElement('quiz-host-reveal')
class QuizHostReveal extends LitElement {
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
    this.roundController.showLeaderboard();
  }

  protected override render() {
    const { currentQuestion, lastReveal, players } = this.gameStore.getState();
    if (!currentQuestion || !lastReveal) {
      return html``;
    }
    const total = players.length || 1;

    return html`
      <div class="flex min-h-screen flex-col items-center gap-10 px-8 py-10 text-center">
        <h1 class="text-5xl font-extrabold">${currentQuestion.text}</h1>
        <p class="text-4xl">
          Правильный ответ:
          <span class="font-bold">
            ${ANSWER_STYLES[lastReveal.correctIndex].symbol}
            ${currentQuestion.options[lastReveal.correctIndex]}
          </span>
        </p>

        <div class="flex w-full max-w-2xl flex-col gap-4">
          ${currentQuestion.options.map((option, index) => {
            const choice = index as AnswerChoice;
            const count = lastReveal.distribution[choice];
            const pct = Math.round((count / total) * 100);
            const isCorrect = choice === lastReveal.correctIndex;
            return html`
              <div class="flex items-center gap-4">
                <span class="w-12 text-3xl">${ANSWER_STYLES[choice].symbol}</span>
                <span class="w-40 truncate text-left text-xl">${option}</span>
                <div class="h-12 flex-1 overflow-hidden rounded-xl bg-slate-200">
                  <div
                    class="${ANSWER_STYLES[choice].bgClass} h-full ${isCorrect ? 'ring-4 ring-black' : ''}"
                    style="width: ${pct}%"
                  ></div>
                </div>
                <span class="w-16 text-2xl">${count}</span>
              </div>
            `;
          })}
        </div>

        <button
          class="rounded-2xl bg-blue-600 px-10 py-5 text-3xl font-bold text-white"
          @click=${this.handleNext}
        >
          Далее →
        </button>
      </div>
    `;
  }
}

export { QuizHostReveal };
