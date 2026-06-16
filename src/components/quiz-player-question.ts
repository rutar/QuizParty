// components/quiz-player-question.ts — экран игрока: 4 цветные кнопки без текста.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import './quiz-timer';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';
import type { AnswerChoice } from '../state/types';
import { ANSWER_STYLES } from './answerStyles';

@customElement('quiz-player-question')
class QuizPlayerQuestion extends LitElement {
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

  private handleAnswer(choice: AnswerChoice): void {
    this.roundController.submitAnswer(choice);
    this.requestUpdate();
  }

  private renderPreview() {
    const { currentDeadline } = this.gameStore.getState();
    return html`
      <div class="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <p class="text-3xl font-bold">Приготовьтесь!</p>
        <quiz-timer class="text-5xl font-bold" .deadline=${currentDeadline}></quiz-timer>
      </div>
    `;
  }

  private renderWaitingAfterAnswer() {
    return html`
      <div class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p class="text-3xl font-bold">Ответ принят.</p>
        <p class="text-2xl text-slate-500">Ждём остальных…</p>
      </div>
    `;
  }

  private renderButtons() {
    return html`
      <div class="grid h-screen grid-cols-2 grid-rows-2 gap-2 p-2">
        ${ANSWER_STYLES.map(
          (style, index) => html`
            <button
              class="${style.bgClass} flex items-center justify-center text-7xl text-white active:opacity-80"
              aria-label="Вариант ${index + 1}"
              @click=${() => this.handleAnswer(index as AnswerChoice)}
            >
              ${style.symbol}
            </button>
          `,
        )}
      </div>
    `;
  }

  protected override render() {
    const { phase, currentQuestion } = this.gameStore.getState();
    if (phase === 'preview') {
      return this.renderPreview();
    }

    const myAnswer = this.roundController.getMyLastAnswer();
    const hasAnswered = myAnswer !== null && myAnswer.questionId === currentQuestion?.questionId;
    return hasAnswered ? this.renderWaitingAfterAnswer() : this.renderButtons();
  }
}

export { QuizPlayerQuestion };
