// components/quiz-start.ts — экран старта: хост создаёт комнату, игрок переходит к форме входа.

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { lobbyContext } from '../state/lobbyContext';
import type { LobbyController } from '../state/lobbyController';

@customElement('quiz-start')
class QuizStart extends LitElement {
  // @consume гарантированно заполняет поле до первого render()
  @consume({ context: lobbyContext })
  lobbyController!: LobbyController;

  @state()
  private error: string | null = null;

  @state()
  private isCreating = false;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private async handleCreate(): Promise<void> {
    this.error = null;
    this.isCreating = true;
    try {
      await this.lobbyController.createRoom();
    } catch (cause) {
      console.error('Не удалось создать комнату:', cause);
      this.error = 'Не удалось создать комнату. Попробуйте снова.';
    } finally {
      this.isCreating = false;
    }
  }

  private handleJoin(): void {
    this.dispatchEvent(new CustomEvent('navigate-join', { bubbles: true, composed: true }));
  }

  protected override render() {
    return html`
      <div class="flex min-h-screen flex-col items-center justify-center gap-10 px-4 text-center">
        <h1 class="text-5xl font-extrabold">QuizParty</h1>
        <div class="flex w-full max-w-xs flex-col gap-4">
          <button
            class="rounded-2xl bg-blue-600 px-8 py-6 text-2xl font-semibold text-white disabled:opacity-50"
            ?disabled=${this.isCreating}
            @click=${this.handleCreate}
          >
            ${this.isCreating ? 'Создаём…' : 'Создать игру'}
          </button>
          <button
            class="rounded-2xl bg-slate-700 px-8 py-6 text-2xl font-semibold text-white"
            @click=${this.handleJoin}
          >
            Присоединиться
          </button>
        </div>
        ${this.error ? html`<p class="text-lg text-red-500">${this.error}</p>` : ''}
      </div>
    `;
  }
}

export { QuizStart };
