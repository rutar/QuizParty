// components/quiz-final.ts — финальный экран: итоговая таблица результатов.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-final')
export class QuizFinal extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
