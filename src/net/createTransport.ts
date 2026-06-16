// net/createTransport.ts — фабрика Transport. Скрывает выбор конкретной реализации
// (CloudTransport сейчас; LocalTransport — в v2.0) от всего кода вне net/.

import type { Transport } from './transport';
import { CloudTransport } from './cloudTransport';

export function createTransport(): Transport {
  return new CloudTransport();
}
