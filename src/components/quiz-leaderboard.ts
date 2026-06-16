// components/quiz-leaderboard.ts — экран ТВ: таблица лидеров между раундами.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-leaderboard')
export class QuizLeaderboard extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
