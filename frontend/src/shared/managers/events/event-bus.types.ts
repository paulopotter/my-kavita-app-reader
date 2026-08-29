// Shared types for EventBusManager (plano 017, Task 013 — the RN→RN mechanism).
// Kept separate from event-bus.manager.ts so an emitting module can import just EventToken /
// createEvent to declare its own tokens, without pulling the singleton or the React hook.

// A typed handle for one kind of event. `name` is the only runtime data — no auto-id, no central
// registry (Task 013's explicit call: don't over-design a contract with no real use case yet).
// `TPayload` never exists at runtime; the phantom `__payload` field only carries it through the
// type system so emit()/on() for the same token agree on the payload shape.
export interface EventToken<TPayload> {
  readonly name: string;
  readonly __payload?: TPayload;
}

// Every event's payload shape is its own — there is NO shared payload contract across events.
// createEvent<T> binds T to this one token; a different token can carry a completely different T.
export type EventHandler<TPayload> = (payload: TPayload) => void;

export interface EventBusManagerContract {
  // Fire `event` with `payload`. Synchronous: every subscribed handler runs before emit returns.
  // No subscribers → no-op. A handler that throws never blocks the others.
  emit<TPayload>(event: EventToken<TPayload>, payload: TPayload): void;

  // Subscribe `handler` to `event`. Returns an unsubscribe function — call it to stop receiving.
  on<TPayload>(event: EventToken<TPayload>, handler: EventHandler<TPayload>): () => void;
}
