import { renderHook } from '@testing-library/react-native';
import { createEvent, EventBus, useEvent } from './event-bus.manager';

describe('EventBus', () => {
  it('emit with no subscriber is a no-op (does not throw)', () => {
    const event = createEvent<number>('test/none');
    expect(() => EventBus.emit(event, 1)).not.toThrow();
  });

  it('on receives the exact payload passed to emit', () => {
    const event = createEvent<{ id: string }>('test/payload');
    const handler = jest.fn();
    EventBus.on(event, handler);

    EventBus.emit(event, { id: 'abc' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 'abc' });
  });

  it('the returned unsubscribe stops further delivery', () => {
    const event = createEvent<number>('test/unsub');
    const handler = jest.fn();
    const off = EventBus.on(event, handler);

    EventBus.emit(event, 1);
    off();
    EventBus.emit(event, 2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('calling unsubscribe twice is safe (second call is a no-op)', () => {
    const event = createEvent<number>('test/unsub-twice');
    const handler = jest.fn();
    const off = EventBus.on(event, handler);

    off();
    expect(() => off()).not.toThrow();

    EventBus.emit(event, 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('delivers to every subscriber of the same event', () => {
    const event = createEvent<string>('test/multi');
    const a = jest.fn();
    const b = jest.fn();
    EventBus.on(event, a);
    EventBus.on(event, b);

    EventBus.emit(event, 'x');

    expect(a).toHaveBeenCalledWith('x');
    expect(b).toHaveBeenCalledWith('x');
  });

  it('two tokens with different names are isolated', () => {
    const one = createEvent<number>('test/iso-1');
    const two = createEvent<number>('test/iso-2');
    const onOne = jest.fn();
    EventBus.on(one, onOne);

    EventBus.emit(two, 99);

    expect(onOne).not.toHaveBeenCalled();
  });

  it('a handler that throws does not stop the other handlers', () => {
    const event = createEvent<void>('test/throwing');
    const boom = jest.fn(() => {
      throw new Error('boom');
    });
    const after = jest.fn();
    EventBus.on(event, boom);
    EventBus.on(event, after);

    expect(() => EventBus.emit(event, undefined)).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('a handler unsubscribing during emit does not corrupt the current fan-out', () => {
    const event = createEvent<void>('test/reentrant-unsub');
    const calls: string[] = [];
    const off1 = EventBus.on(event, () => {
      calls.push('first');
      off1(); // remove self mid-emit
    });
    EventBus.on(event, () => calls.push('second'));

    EventBus.emit(event, undefined);
    EventBus.emit(event, undefined);

    // First emit still reaches both (snapshot taken before iterating); second emit only 'second'.
    expect(calls).toEqual(['first', 'second', 'second']);
  });
});

describe('EventBus — chain/cycle guard', () => {
  it('a legitimate 3-deep chain (A -> B -> C, no repeat) runs fully and unwinds', () => {
    const a = createEvent<void>('chain/a');
    const b = createEvent<void>('chain/b');
    const c = createEvent<void>('chain/c');
    const seen: string[] = [];

    EventBus.on(a, () => {
      seen.push('a');
      EventBus.emit(b, undefined);
    });
    EventBus.on(b, () => {
      seen.push('b');
      EventBus.emit(c, undefined);
    });
    EventBus.on(c, () => seen.push('c'));

    expect(() => EventBus.emit(a, undefined)).not.toThrow();
    expect(seen).toEqual(['a', 'b', 'c']);

    // Stack fully unwound: a plain emit right after still works.
    const after = jest.fn();
    EventBus.on(c, after);
    EventBus.emit(c, undefined);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('a direct cycle (X handler emits X) throws with the trail', () => {
    const x = createEvent<void>('cycle/direct');
    EventBus.on(x, () => EventBus.emit(x, undefined));

    expect(() => EventBus.emit(x, undefined)).toThrow(/ciclo de eventos detectado/);
    expect(() => EventBus.emit(x, undefined)).toThrow(/cycle\/direct -> cycle\/direct/);
  });

  it('an indirect cycle (A -> B -> A) throws', () => {
    const a = createEvent<void>('cycle/a');
    const b = createEvent<void>('cycle/b');
    EventBus.on(a, () => EventBus.emit(b, undefined));
    EventBus.on(b, () => EventBus.emit(a, undefined));

    expect(() => EventBus.emit(a, undefined)).toThrow(
      /ciclo de eventos detectado — cycle\/a -> cycle\/b -> cycle\/a/,
    );
  });

  it('after a cycle error, a fresh unrelated emit works (stack was reset)', () => {
    const loop = createEvent<void>('cycle/reset-loop');
    const ok = createEvent<number>('cycle/reset-ok');
    EventBus.on(loop, () => EventBus.emit(loop, undefined));
    const handler = jest.fn();
    EventBus.on(ok, handler);

    expect(() => EventBus.emit(loop, undefined)).toThrow();

    EventBus.emit(ok, 7);
    expect(handler).toHaveBeenCalledWith(7);
  });

  it('a long non-repeating chain past MAX_CHAIN_DEPTH throws the backstop error', () => {
    // 60 distinct tokens, each handler emitting the next — no token ever repeats, so only the
    // depth backstop can catch it.
    const tokens = Array.from({ length: 60 }, (_, i) => createEvent<void>(`depth/${i}`));
    tokens.forEach((tok, i) => {
      EventBus.on(tok, () => {
        if (i + 1 < tokens.length) {
          EventBus.emit(tokens[i + 1], undefined);
        }
      });
    });

    expect(() => EventBus.emit(tokens[0], undefined)).toThrow(/excedeu 50 níveis/);
  });

  it('a normal handler error inside a chain stays contained (not treated as a guard error)', () => {
    const a = createEvent<void>('chain/contained-a');
    const b = createEvent<void>('chain/contained-b');
    const afterBoom = jest.fn();

    EventBus.on(a, () => EventBus.emit(b, undefined));
    EventBus.on(b, () => {
      throw new Error('handler bug');
    });
    EventBus.on(b, afterBoom);

    expect(() => EventBus.emit(a, undefined)).not.toThrow();
    expect(afterBoom).toHaveBeenCalledTimes(1);
  });
});

describe('useEvent', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const event = createEvent<number>('test/hook-lifecycle');
    const handler = jest.fn();
    const { unmount } = renderHook(() => useEvent(event, handler));

    EventBus.emit(event, 1);
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    EventBus.emit(event, 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('uses the latest handler on re-render without re-subscribing', () => {
    const event = createEvent<number>('test/hook-latest');
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ h }) => useEvent(event, h), {
      initialProps: { h: first },
    });

    EventBus.emit(event, 1);
    expect(first).toHaveBeenCalledWith(1);

    rerender({ h: second });
    EventBus.emit(event, 2);

    expect(second).toHaveBeenCalledWith(2);
    expect(first).toHaveBeenCalledTimes(1); // never got the second emit
  });
});
