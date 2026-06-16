// components/quiz-qr.ts — QR-код для быстрого подключения игроков к комнате.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('quiz-qr')
export class QuizQr extends LitElement {
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: реализовать рендер QR (пакет qrcode)
    return html``;
  }
}
