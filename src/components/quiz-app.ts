// components/quiz-app.ts — корневой компонент: создаёт GameStore
// и предоставляет его потомкам через Lit Context.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { gameContext } from '../state/gameContext';
import { GameStore } from '../state/gameStore';

@customElement('quiz-app')
export class QuizApp extends LitElement {
  @provide({ context: gameContext })
  accessor gameStore = new GameStore();

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    // TODO: маршрутизация по GameState.phase → конкретный экран
    return html``;
  }
}
