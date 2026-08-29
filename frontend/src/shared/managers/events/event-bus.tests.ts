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
