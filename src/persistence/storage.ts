// persistence/storage.ts — обёртка над idb-keyval для сохранения сессии игрока.
import { get, set, del } from 'idb-keyval';

export async function saveState(key: string, value: unknown): Promise<void> {
  await set(key, value);
}

export async function loadState(key: string): Promise<unknown> {
  return get(key);
}

export async function clearState(key: string): Promise<void> {
  await del(key);
}
