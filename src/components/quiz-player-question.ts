// components/quiz-player-question.ts — экран игрока: 4 цветные кнопки без текста.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-player-question')
class QuizPlayerQuestion extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}

export { QuizPlayerQuestion };
