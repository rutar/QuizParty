// components/quiz-connection-status.ts — индикатор статуса сети.
// ConnectionState получаем из state/types (UI не импортирует net/ напрямую).

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-connection-status')
class QuizConnectionStatus extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать индикатор по GameState.connectionState
    return html``;
  }
}

export { QuizConnectionStatus };
