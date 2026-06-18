// components/quiz-qr.ts — QR-код для быстрого подключения игроков к комнате.

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import QRCode from 'qrcode';

@customElement('quiz-qr')
class QuizQr extends LitElement {
  @property({ type: String })
  roomCode = '';

  /** Размер в пикселях — и для генерации, и для <img>. Менять снаружи. */
  @property({ type: Number })
  size = 400;

  @state()
  private dataUrl = '';

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override async updated(changedProps: Map<string, unknown>): Promise<void> {
    if ((changedProps.has('roomCode') || changedProps.has('size')) && this.roomCode) {
      await this.generateQR();
    }
  }

  // import.meta.env.BASE_URL = '/QuizParty/' в prod, '/' в dev (из vite.config.ts base)
  static buildJoinUrl(roomCode: string): string {
    return `${window.location.origin}${import.meta.env.BASE_URL}?room=${roomCode}`;
  }

  private async generateQR(): Promise<void> {
    const url = QuizQr.buildJoinUrl(this.roomCode);
    try {
      this.dataUrl = await QRCode.toDataURL(url, {
        width: this.size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (err) {
      console.error('Ошибка генерации QR-кода:', err);
    }
  }

  protected override render() {
    if (!this.dataUrl) return html``;
    return html`
      <img
        src=${this.dataUrl}
        alt="QR-код для подключения к комнате ${this.roomCode}"
        class="rounded-2xl"
        width=${this.size}
        height=${this.size}
      />
    `;
  }
}

export { QuizQr };
