// components/quiz-timer.ts — обратный отсчёт до deadline. Считает не с нуля локальным
// интервалом, а как разницу deadline - now на каждый тик — устойчиво к моменту монтирования.

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('quiz-timer')
class QuizTimer extends LitElement {
  @property({ type: Number })
  deadline: number | null = null;

  @state()
  private remainingMs = 0;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 100);
  }

  override disconnectedCallback(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    super.disconnectedCallback();
  }

  private tick(): void {
    this.remainingMs = this.deadline === null ? 0 : Math.max(0, this.deadline - Date.now());
  }

  protected override render() {
    const seconds = Math.ceil(this.remainingMs / 1000);
    return html`<span>${seconds}</span>`;
  }
}

export { QuizTimer };
