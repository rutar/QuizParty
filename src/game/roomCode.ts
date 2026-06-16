// game/roomCode.ts — генерация кода комнаты для подключения игроков.

import { customAlphabet } from 'nanoid';

// Без визуально неоднозначных символов: O/0, I/1.
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 6;

const generate = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

/** Генерирует код комнаты: 6 символов из алфавита без неоднозначных O/0, I/1. */
export function generateRoomCode(): string {
  return generate();
}
