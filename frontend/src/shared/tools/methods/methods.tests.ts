import { Methods } from './methods.tool';

describe('Methods.bound', () => {
  it('merges the fixed object into a top-level method call', () => {
    const target = { get: jest.fn((arg: { seriesId: string }) => arg) };
    const boundTarget = Methods.bound(target, [], { seriesId: 'series-1' });
    boundTarget.get();
    expect(target.get).toHaveBeenCalledWith({ seriesId: 'series-1' });
  });

  it('merges the fixed object into nested method calls, at any depth', () => {
    const target = {
      chapters: {
        status: {
          set: jest.fn((_arg: { seriesId: string; chapterIds: string[]; isRead: boolean }) => undefined),
        },
      },
    };
    const boundTarget = Methods.bound(target, [], { seriesId: 'series-1' });
    boundTarget.chapters.status.set({ chapterIds: ['ch-1'], isRead: true });
    expect(target.chapters.status.set).toHaveBeenCalledWith({
      seriesId: 'series-1',
      chapterIds: ['ch-1'],
      isRead: true,
    });
  });

  it('lets the caller override a fixed field for one call', () => {
    const target = { get: jest.fn((arg: { seriesId: string }) => arg) };
    const boundTarget = Methods.bound(target, [], { seriesId: 'series-1' });
    boundTarget.get({ seriesId: 'series-2' });
    expect(target.get).toHaveBeenCalledWith({ seriesId: 'series-2' });
  });

  it('tolerates a missing argument when nothing remains to supply', () => {
    const target = { get: jest.fn((arg: { seriesId: string; chapterId: string }) => arg) };
    const boundTarget = Methods.bound(target, [], { seriesId: 'series-1', chapterId: 'chapter-1' });
    boundTarget.get();
    expect(target.get).toHaveBeenCalledWith({ seriesId: 'series-1', chapterId: 'chapter-1' });
  });

  it('leaves non-function values untouched', () => {
    const target = { name: 'series-1', nested: { count: 3 } };
    const boundTarget = Methods.bound(target, [], { x: 1 });
    expect(boundTarget.name).toBe('series-1');
    expect(boundTarget.nested.count).toBe(3);
  });

  it('does not call anything or mutate the original target', () => {
    const get = jest.fn();
    const target = { get };
    Methods.bound(target, [], { seriesId: 'series-1' });
    expect(get).not.toHaveBeenCalled();
    expect(target.get).toBe(get);
  });

  it('drops a "bound" key instead of wrapping it around itself', () => {
    const target = {
      get: jest.fn(),
      bound: (fixed: { seriesId: string }) => Methods.bound(target, [], fixed),
    };
    const boundTarget = Methods.bound(target, [], { seriesId: 'series-1' });
    expect('bound' in boundTarget).toBe(false);
  });

  it('drops keys named in skipKeys, at the top level', () => {
    const target = {
      get: jest.fn(),
      add: jest.fn((arg: { name: string }) => arg),
    };
    const boundTarget = Methods.bound(target, ['add'], { groupId: 'group-1' });
    expect('add' in boundTarget).toBe(false);
    expect('get' in boundTarget).toBe(true);
  });

  it('drops keys named in skipKeys, at nested levels too', () => {
    const target = {
      group: {
        get: jest.fn(),
        add: jest.fn((arg: { name: string }) => arg),
      },
    };
    const boundTarget = Methods.bound(target, ['add'], { groupId: 'group-1' });
    expect('add' in boundTarget.group).toBe(false);
    expect('get' in boundTarget.group).toBe(true);
  });
});
