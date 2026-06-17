/// <reference types="@cloudflare/workers-types" />

import { routePartykitRequest, Server } from "partyserver";
import type { Connection, WSMessage } from "partyserver";

interface Env {
  QuizPartyServer: DurableObjectNamespace;
}

/** Pub/sub relay: пересылает входящее сообщение всем остальным подключениям комнаты. */
export class QuizPartyServer extends Server<Env> {
  onMessage(connection: Connection, message: WSMessage): void {
    this.broadcast(message, [connection.id]);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) ?? new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
