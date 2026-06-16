// persistence/storage.ts — обёртка над idb-keyval для сохранения состояния игрока/хоста.

export async function saveState(_key: string, _value: unknown): Promise<void> {
  // TODO: idb-keyval set()
  throw new Error('not implemented');
}

export async function loadState(_key: string): Promise<unknown> {
  // TODO: idb-keyval get()
  throw new Error('not implemented');
}
