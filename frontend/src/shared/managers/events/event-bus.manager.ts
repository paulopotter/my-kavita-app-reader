import { useEffect, useRef } from 'react';
import type { EventBusManagerContract, EventHandler, EventToken } from './event-bus.types';

// EventBusManager (RN) — the RN→RN communication mechanism (plano 017, Task 013, Mechanism 3).
// A process-wide publish/subscribe channel for events that have NO native origin: something
// finished in one part of the RN app and another part, not in the same component tree, needs to
// react. Kotlin never emits here — a native-observed event goes through NativeEventEmitter
// (Mechanism 2), and a confirmation of something RN asked for comes back on the caller's own
// Promise (Mechanism 1). See _contract-design-notes.md § "Task 013".
//
// Not a Provider/Context on purpose: this is a fact ("chapter X became READ now"), not shared
// state to read continuously. Emitters stay plain functions (a token is just an import), and only
// the handlers registered for a token run — no re-render fan-out.
//
// Each event is an EventToken<TPayload> declared by whichever module emits it, grouped in that
// module's own `XEvents` const so a listener imports the token (autocomplete, no typo) and never
// writes the event-name string. Payload shapes are per-token, no shared contract.

// createEvent — an emitting module calls this to mint its own token(s). The string is chosen by
// that module; no naming convention is enforced here (Task 013).
export function createEvent<TPayload>(name: string): EventToken<TPayload> {
  return { name };
}

class EventBusImpl implements EventBusManagerContract {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  emit<TPayload>(event: EventToken<TPayload>, payload: TPayload): void {
    const set = this.handlers.get(event.name);
    if (!set) {
      return;
    }
    // Snapshot before iterating: a handler that unsubscribes (or subscribes) during its own run
    // must not corrupt the loop.
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch {
        // One handler throwing never stops the rest — the bus has no way to surface the error
        // and swallowing it is safer than aborting the fan-out mid-way.
      }
    }
  }

  on<TPayload>(event: EventToken<TPayload>, handler: EventHandler<TPayload>): () => void {
    let set = this.handlers.get(event.name);
    if (!set) {
      set = new Set();
      this.handlers.set(event.name, set);
    }
    set.add(handler as EventHandler<unknown>);

    return () => {
      const current = this.handlers.get(event.name);
      if (!current) {
        return;
      }
      current.delete(handler as EventHandler<unknown>);
      if (current.size === 0) {
        this.handlers.delete(event.name);
      }
    };
  }
}

// Singleton — one bus for the whole app. Imported directly, no Provider needed.
export const EventBus: EventBusManagerContract = new EventBusImpl();

// useEvent — subscribe a component to an event for its mounted lifetime. `handler` is read
// through an internal ref on every render, so the caller does NOT need to memoize it to avoid
// re-subscribing; the subscription is torn down only on unmount (or if the token identity
// changes, which for a module-level `XEvents.x` const it never does).
export function useEvent<TPayload>(
  event: EventToken<TPayload>,
  handler: EventHandler<TPayload>,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return EventBus.on(event, payload => handlerRef.current(payload));
  }, [event]);
}
