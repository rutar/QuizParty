import type * as Party from "partykit/server";

/** Pub/sub relay: пересылает входящее сообщение всем остальным подключениям комнаты. */
export default class QuizPartyServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onMessage(message: string, sender: Party.Connection) {
    this.room.broadcast(message, [sender.id]);
  }
}

QuizPartyServer satisfies Party.Worker;
