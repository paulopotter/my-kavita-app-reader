const mockMarkReadByChapter = jest.fn();
const mockMarkSerialRead = jest.fn();

jest.mock('./notifications.services', () => ({
  NotificationsService: {
    history: {
      markReadByChapter: (...a: unknown[]) => mockMarkReadByChapter(...a),
      markSerialRead: (...a: unknown[]) => mockMarkSerialRead(...a),
    },
  },
}));

import { EventBus } from '../../managers/events';
import { NotificationEvents } from './notifications.events';
import { registerNotificationHistoryListener } from './notifications.listener';

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkReadByChapter.mockResolvedValue(undefined);
  mockMarkSerialRead.mockResolvedValue(undefined);
  // Registration is idempotent and never unsubscribes (app-lifetime listener) — calling it here
  // covers the first test and is a no-op for the rest.
  registerNotificationHistoryListener();
});

describe('registerNotificationHistoryListener', () => {
  it('marks the chapter own row read when the consumed content names a chapter', () => {
    EventBus.emit(NotificationEvents.contentConsumed, { content: { seriesId: 's1', chapterId: 'c1' } });

    expect(mockMarkReadByChapter).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1' });
    expect(mockMarkSerialRead).not.toHaveBeenCalled();
  });

  it('marks the serial chapter-less rows read when no chapter is named', () => {
    EventBus.emit(NotificationEvents.contentConsumed, { content: { seriesId: 's1' } });

    expect(mockMarkSerialRead).toHaveBeenCalledWith({ seriesId: 's1' });
    expect(mockMarkReadByChapter).not.toHaveBeenCalled();
  });

  it('swallows a failed mark — nothing in the UI waits on it', async () => {
    mockMarkReadByChapter.mockRejectedValue(new Error('boom'));

    expect(() =>
      EventBus.emit(NotificationEvents.contentConsumed, { content: { seriesId: 's1', chapterId: 'c1' } }),
    ).not.toThrow();
    await Promise.resolve();
  });

  it('registering twice does not double-handle an event', () => {
    registerNotificationHistoryListener();

    EventBus.emit(NotificationEvents.contentConsumed, { content: { seriesId: 's1', chapterId: 'c1' } });

    expect(mockMarkReadByChapter).toHaveBeenCalledTimes(1);
  });
});
