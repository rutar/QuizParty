// Lit Context для передачи GameStore от quiz-app.ts вниз по дереву компонентов.

import { createContext } from '@lit/context';
import type { GameStore } from './gameStore';

export const gameContext = createContext<GameStore>('game-store');
