// components/quiz-host-question.ts — экран ТВ: preview-отсчёт, затем вопрос с вариантами и таймером.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import './quiz-timer';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';
import { ANSWER_STYLES } from './answerStyles';

@customElement('quiz-host-question')
class QuizHostQuestion extends LitElement {
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

  private handleCloseEarly(): void {
    this.roundController.closeAnswers();
  }

  private renderPreview() {
    const { currentQuestionIndex, questions, currentDeadline } = this.gameStore.getState();
    return html`
      <div class="flex min-h-screen flex-col items-center justify-center gap-8 text-center">
        <p class="text-5xl font-extrabold">Вопрос ${currentQuestionIndex + 1} из ${questions.length}</p>
        <p class="text-4xl">Приготовьтесь!</p>
        <quiz-timer class="text-6xl font-bold" .deadline=${currentDeadline}></quiz-timer>
      </div>
    `;
  }

  private renderQuestion() {
    const { currentQuestion, currentDeadline, answers, players } = this.gameStore.getState();
    if (!currentQuestion) {
      return html``;
    }
    const answeredCount = answers.filter((a) => a.questionId === currentQuestion.questionId).length;

    return html`
      <div class="flex min-h-screen flex-col gap-8 px-8 py-10">
        <div class="flex items-center justify-between">
          <quiz-timer class="text-5xl font-bold" .deadline=${currentDeadline}></quiz-timer>
          <p class="text-3xl">${answeredCount} из ${players.length} ответили</p>
          <button
            class="rounded-xl bg-slate-700 px-6 py-3 text-2xl font-semibold text-white"
            @click=${this.handleCloseEarly}
          >
            Закрыть досрочно
          </button>
        </div>

        <h1 class="text-center text-5xl font-extrabold">${currentQuestion.text}</h1>

        <div class="grid grid-cols-2 gap-6">
          ${currentQuestion.options.map(
            (option, index) => html`
              <div class="${ANSWER_STYLES[index].bgClass} flex items-center gap-4 rounded-2xl p-8 text-white">
                <span class="text-5xl">${ANSWER_STYLES[index].symbol}</span>
                <span class="text-4xl font-semibold">${option}</span>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  protected override render() {
    const { phase } = this.gameStore.getState();
    return phase === 'preview' ? this.renderPreview() : this.renderQuestion();
  }
}

export { QuizHostQuestion };
