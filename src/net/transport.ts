// net/transport.ts — единственный публичный интерфейс сетевого слоя.
// КЛЮЧЕВОЙ ШОВ под офлайн-режим v2.0: весь код вне net/ работает только через этот
// интерфейс и фабрику createTransport(). Конкретные реализации (CloudTransport,
// в будущем LocalTransport) за пределы net/ не экспортируются.

import type { GameMessage } from './protocol';

/** Статус сетевого соединения транспорта. */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface Transport {
  connect(roomCode: string, role: 'host' | 'player'): Promise<void>;
  send(message: GameMessage): void;
  onMessage(handler: (msg: GameMessage) => void): void;
  onConnectionChange(handler: (state: ConnectionState) => void): void;
  disconnect(): void;
}
