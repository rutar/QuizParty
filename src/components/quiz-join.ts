// components/quiz-join.ts — экран входа игрока: код комнаты + никнейм.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-join')
export class QuizJoin extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
