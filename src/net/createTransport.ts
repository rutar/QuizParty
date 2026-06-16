// net/createTransport.ts — фабрика Transport. Скрывает выбор конкретной реализации
// (CloudTransport сейчас; LocalTransport — в v2.0) от всего кода вне net/.

import type { Transport } from './transport';

export function createTransport(): Transport {
  // TODO: вернуть new CloudTransport() (см. cloudTransport.ts)
  throw new Error('not implemented');
}
