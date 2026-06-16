// components/quiz-host-reveal.ts — экран ТВ: правильный ответ и распределение ответов.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-host-reveal')
export class QuizHostReveal extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
