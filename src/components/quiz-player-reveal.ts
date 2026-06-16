// components/quiz-player-reveal.ts — экран игрока: верно/неверно, начисленные очки, место.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { roundContext } from '../state/roundContext';
import { GAME_STORE_CHANGE_EVENT, type GameStore } from '../state/gameStore';
import type { RoundController } from '../state/roundController';

@customElement('quiz-player-reveal')
class QuizPlayerReveal extends LitElement {
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

  protected override render() {
    const { lastReveal, players, localPlayerId } = this.gameStore.getState();
    if (!lastReveal) {
      return html``;
    }

    const myAnswer = this.roundController.getMyLastAnswer();
    const isCorrect = myAnswer?.choice === lastReveal.correctIndex;
    const pointsGained = this.roundController.getLastPointsGained() ?? 0;
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const rank = ranked.findIndex((player) => player.playerId === localPlayerId) + 1;

    return html`
      <div class="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <p class="text-5xl font-extrabold ${isCorrect ? 'text-answer-green' : 'text-answer-red'}">
          ${isCorrect ? 'Правильно!' : 'Неправильно'}
        </p>
        <p class="text-3xl">+${pointsGained} очков</p>
        ${rank > 0 ? html`<p class="text-2xl text-slate-500">Место: ${rank}</p>` : ''}
      </div>
    `;
  }
}

export { QuizPlayerReveal };
