// components/quiz-player-reveal.ts — экран игрока: верно/неверно, начисленные очки.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-player-reveal')
export class QuizPlayerReveal extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
