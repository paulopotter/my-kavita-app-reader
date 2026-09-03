import { EventBus } from '../../managers/events';
import { ServerEvents, type ServerActiveUrlChangedPayload } from './servers.events';

describe('ServerEvents.activeUrlChanged', () => {
  it('is a distinct token with a stable name', () => {
    expect(ServerEvents.activeUrlChanged.name).toBe('serverActiveUrlChanged');
  });

  it('delivers the {groupId, urlId, url} payload to a subscriber', () => {
    const received: ServerActiveUrlChangedPayload[] = [];
    const off = EventBus.on(ServerEvents.activeUrlChanged, p => received.push(p));

    EventBus.emit(ServerEvents.activeUrlChanged, { groupId: 'g1', urlId: 'u1', url: 'http://host' });
    off();
    EventBus.emit(ServerEvents.activeUrlChanged, { groupId: 'g2', urlId: 'u2', url: 'http://other' });

    expect(received).toEqual([{ groupId: 'g1', urlId: 'u1', url: 'http://host' }]);
  });
});
