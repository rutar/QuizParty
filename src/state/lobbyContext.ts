// state/lobbyContext.ts — Lit Context для LobbyController (оркестрация лобби).

import { createContext } from '@lit/context';
import type { LobbyController } from './lobbyController';

export const lobbyContext = createContext<LobbyController>('lobby-controller');
