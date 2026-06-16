// components/quiz-host-question.ts — экран ТВ: текст вопроса, варианты ответов, таймер.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-host-question')
class QuizHostQuestion extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}

export { QuizHostQuestion };
