// net/reconnect.ts — вспомогательные функции переподключения (экспоненциальный backoff).

/** Задержка перед следующей попыткой переподключения, мс. */
export function getReconnectDelayMs(_attempt: number): number {
  // TODO: экспоненциальный backoff с джиттером
  throw new Error('not implemented');
}

/** Исчерпан ли лимит попыток переподключения. */
export function hasExceededRetryLimit(_attempt: number): boolean {
  // TODO: определить максимум попыток
  throw new Error('not implemented');
}
