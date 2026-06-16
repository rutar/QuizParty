// components/quiz-timer.ts — визуальный обратный отсчёт до deadline вопроса.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-timer')
export class QuizTimer extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать таймер
    return html``;
  }
}
