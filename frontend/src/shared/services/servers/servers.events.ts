import { createEvent } from '../../managers/events';

// EventBus token the "servers" domain emits (plano 017, Task 013 — Mechanism 3, RN→RN). Declared
// next to the emitter (the config server hook and the splash boot both raise it), per Task 013.

// Emitted whenever the server's ACTIVE URL is (re)resolved — the splash's boot activation, or a
// "test connection" / a URL edit on the config screen. The metadata server is linked to the
// server: when the server's active URL moves, the linked metadata group may need to re-resolve
// too (a LAN URL vs. a DDNS URL can have different metadata endpoints). The one listener today
// is the config's useMetadataServer, which re-activates its group; the Library's lazy metadata
// sync would re-resolve on its own next call regardless.
//
// NO-LOOP contract: the listener only calls ExternalService.group.active.set (which never emits
// this event) — a server-URL change can't be produced by a metadata activation, so no cycle.
export interface ServerActiveUrlChangedPayload {
  groupId: string;
  urlId: string;
  url: string;
}

export const ServerEvents = {
  activeUrlChanged: createEvent<ServerActiveUrlChangedPayload>('serverActiveUrlChanged'),
} as const;
