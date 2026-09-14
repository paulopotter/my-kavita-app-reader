import { EventBus } from './event-bus.manager';
import { EventsManager } from './events.manager';

describe('EventsManager.build', () => {
  it('emits on the domain token with the content it was built for', () => {
    const events = EventsManager.build({ domain: 'chapter', content: { seriesId: 's1', chapterId: 'c1' } });
    const { opened } = events.opened();
    const handler = jest.fn();
    const off = EventBus.on(opened.key, handler);

    opened.exec();

    expect(handler).toHaveBeenCalledWith({ content: { seriesId: 's1', chapterId: 'c1' }, payload: undefined });
    off();
  });

  it('names the token <domain>/<event>', () => {
    const { opened } = EventsManager.build({ domain: 'serie', content: { seriesId: 's1' } }).opened();
    expect(opened.key.name).toBe('serie/opened');
  });

  it('reuses the same token across instances, so a boot listener can subscribe without one', () => {
    const a = EventsManager.build({ domain: 'chapter', content: { seriesId: 's1', chapterId: 'c1' } }).opened();
    const b = EventsManager.build({ domain: 'chapter', content: { seriesId: 's2', chapterId: 'c9' } }).opened();

    expect(a.opened.key).toBe(b.opened.key);
    expect(EventsManager.key({ domain: 'chapter', event: 'opened' })).toBe(a.opened.key);
  });

  it('a listener registered by key receives events from any instance', () => {
    const handler = jest.fn();
    const off = EventBus.on(EventsManager.key({ domain: 'serie', event: 'opened' }), handler);

    EventsManager.build({ domain: 'serie', content: { seriesId: 's7' } }).opened().opened.exec();

    expect(handler).toHaveBeenCalledWith({ content: { seriesId: 's7' }, payload: undefined });
    off();
  });

  it('carries a payload embedded at declaration time', () => {
    const { opened } = EventsManager.build({ domain: 'serie', content: { seriesId: 's1' } }).opened({
      payload: { total: 42 },
    });
    const handler = jest.fn();
    const off = EventBus.on(opened.key, handler);

    opened.exec();

    expect(handler).toHaveBeenCalledWith({ content: { seriesId: 's1' }, payload: { total: 42 } });
    off();
  });

  it('runs `after` once the domain token has been emitted', () => {
    const order: string[] = [];
    const { opened } = EventsManager.build({ domain: 'serie', content: { seriesId: 's1' } }).opened({
      after: () => order.push('after'),
    });
    const off = EventBus.on(opened.key, () => order.push('emit'));

    opened.exec();

    expect(order).toEqual(['emit', 'after']);
    off();
  });

  it('does not emit just by being built — only exec() fires it', () => {
    const handler = jest.fn();
    const off = EventBus.on(EventsManager.key({ domain: 'chapter', event: 'opened' }), handler);

    EventsManager.build({ domain: 'chapter', content: { seriesId: 's1', chapterId: 'c1' } }).opened();

    expect(handler).not.toHaveBeenCalled();
    off();
  });
});
