// components/quiz-lobby.ts — лобби: список подключившихся игроков, QR-код, старт игры.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-lobby')
export class QuizLobby extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать экран
    return html``;
  }
}
