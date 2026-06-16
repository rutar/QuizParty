// state/lobbyController.ts — оркестрация лобби: создание/вход в комнату, приём join,
// рассылка lobby_update, kick. С Transport работает только через интерфейс (net/transport.ts).

import { nanoid } from 'nanoid';
import { generateRoomCode } from '../game/roomCode';
import type { GameMessage, PlayerSummary } from '../net/protocol';
import type { Transport } from '../net/transport';
import type { GameStore } from './gameStore';
import type { Player } from './types';

function toSummaries(players: Player[]): PlayerSummary[] {
  return players.map(({ playerId, nickname, score }) => ({ playerId, nickname, score }));
}

export class LobbyController {
  private readonly gameStore: GameStore;
  private readonly transport: Transport;
  private localPlayerId: string | null = null;

  constructor(gameStore: GameStore, transport: Transport) {
    this.gameStore = gameStore;
    this.transport = transport;
    this.transport.onMessage((message) => this.handleMessage(message));
  }

  /** Хост создаёт комнату: генерирует код, подключается, переходит в лобби. */
  async createRoom(): Promise<string> {
    const roomCode = generateRoomCode();
    await this.transport.connect(roomCode, 'host');
    this.gameStore.setRoomInfo('host', roomCode);
    this.gameStore.setPlayers([]);
    this.gameStore.dispatch({ type: 'start_lobby' });
    return roomCode;
  }

  /** Игрок подключается к существующей комнате по коду. */
  async joinRoom(roomCode: string, nickname: string): Promise<void> {
    this.localPlayerId = nanoid();
    await this.transport.connect(roomCode, 'player');
    this.gameStore.setRoomInfo('player', roomCode);
    this.gameStore.dispatch({ type: 'start_lobby' });
    this.transport.send({ type: 'join', playerId: this.localPlayerId, nickname });
  }

  /** Хост убирает игрока из комнаты и сообщает об этом всем участникам. */
  kickPlayer(playerId: string): void {
    const players = this.gameStore.getState().players.filter((p) => p.playerId !== playerId);
    this.gameStore.setPlayers(players);
    this.transport.send({ type: 'kicked', playerId });
    this.transport.send({ type: 'lobby_update', players: toSummaries(players) });
  }

  private handleMessage(message: GameMessage): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(message.playerId, message.nickname);
        break;
      case 'lobby_update':
        this.gameStore.setPlayers(
          message.players.map((player) => ({ ...player, connected: true })),
        );
        break;
      case 'welcome':
        // Подтверждение от хоста; переход в lobby уже произошёл оптимистично в joinRoom().
        break;
      case 'kicked':
        this.handleKicked(message.playerId);
        break;
      default:
        break;
    }
  }

  /** Хост регистрирует нового игрока, подтверждает вход и рассылает обновлённый ростер. */
  private handleJoin(playerId: string, nickname: string): void {
    const { role, roomCode, players } = this.gameStore.getState();
    if (role !== 'host' || players.some((p) => p.playerId === playerId)) {
      return;
    }

    const updated: Player[] = [...players, { playerId, nickname, score: 0, connected: true }];
    this.gameStore.setPlayers(updated);
    this.transport.send({ type: 'welcome', playerId, roomCode: roomCode ?? '' });
    this.transport.send({ type: 'lobby_update', players: toSummaries(updated) });
  }

  private handleKicked(playerId: string): void {
    if (playerId !== this.localPlayerId) {
      return;
    }
    this.transport.disconnect();
    this.gameStore.dispatch({ type: 'reset' });
  }
}
