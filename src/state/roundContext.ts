// state/roundContext.ts — Lit Context для RoundController (оркестрация раунда вопроса).

import { createContext } from '@lit/context';
import type { RoundController } from './roundController';

export const roundContext = createContext<RoundController>('round-controller');
