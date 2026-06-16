// net/cloudTransport.ts — реализация Transport на базе partysocket.
// ПРАВИЛО №1: partysocket импортируется только в этом файле.

import PartySocket from 'partysocket';
import type { ConnectionState, Transport } from './transport';
import type { GameMessage } from './protocol';

// TODO: заменить на свой PartyKit-аккаунт после `npx partykit deploy` в party/
const PARTYKIT_USERNAME = 'TODO_USERNAME';

// В dev подключаемся к локальному `partykit dev` (cd party && npm run dev), в prod — к облаку.
const PARTYKIT_HOST = import.meta.env.DEV
  ? 'localhost:1999'
  : `quiz-party-server.${PARTYKIT_USERNAME}.partykit.dev`;

export class CloudTransport implements Transport {
  private socket: PartySocket | null = null;
  private readonly messageHandlers: Array<(msg: GameMessage) => void> = [];
  private readonly connectionHandlers: Array<(state: ConnectionState) => void> = [];

  async connect(roomCode: string, role: 'host' | 'player'): Promise<void> {
    this.emitConnectionChange('connecting');

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomCode,
      query: { role },
    });
    this.socket = socket;

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as GameMessage;
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    });

    socket.addEventListener('close', () => {
      this.emitConnectionChange('disconnected');
    });

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener(
        'open',
        () => {
          this.emitConnectionChange('connected');
          resolve();
        },
        { once: true },
      );
      socket.addEventListener(
        'error',
        () => {
          reject(new Error('connection failed'));
        },
        { once: true },
      );
    });
  }

  send(message: GameMessage): void {
    this.socket?.send(JSON.stringify(message));
  }

  onMessage(handler: (msg: GameMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (state: ConnectionState) => void): void {
    this.connectionHandlers.push(handler);
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  private emitConnectionChange(state: ConnectionState): void {
    for (const handler of this.connectionHandlers) {
      handler(state);
    }
  }
}
