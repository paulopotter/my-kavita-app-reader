import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';

// ── service mocks — every debug step is a thin wrapper over these ─────────────
const mk = () => jest.fn();
const mockS = {
  providersList: mk(),
  groupsList: mk(),
  groupGet: mk(),
  urlsList: mk(),
  activeGet: mk(),
  activeSet: mk(),
  boundGroupGet: mk(),
};
const mockEXT = {
  providersList: mk(),
  groupsList: mk(),
  groupGet: mk(),
  groupGetInfo: mk(),
  urlsList: mk(),
  activeGetUrl: mk(),
};
const mockSERIAL = {
  rawList: mk(),
  get: mk(),
  rawGet: mk(),
  boundGetFull: mk(),
  boundRawChaptersList: mk(),
  rawChaptersList: mk(),
  externalDetailSync: mk(),
};
const mockCHAPTER = { get: mk(), boundGetFull: mk(), boundRawGet: mk(), boundProgressGet: mk() };
const mockPAGE = { get: mk(), boundDimensions: mk(), boundUrl: mk() };

jest.mock('../../../shared/services/servers', () => ({
  ServersService: {
    providers: { list: (...a: unknown[]) => mockS.providersList(...a) },
    groups: { list: (...a: unknown[]) => mockS.groupsList(...a) },
  },
  ServerService: {
    group: { get: (...a: unknown[]) => mockS.groupGet(...a), active: { get: (...a: unknown[]) => mockS.activeGet(...a), set: (...a: unknown[]) => mockS.activeSet(...a) } },
    urls: { list: (...a: unknown[]) => mockS.urlsList(...a) },
    bound: () => ({ group: { get: (...a: unknown[]) => mockS.boundGroupGet(...a) } }),
  },
  ExternalsService: {
    providers: { list: (...a: unknown[]) => mockEXT.providersList(...a) },
    groups: { list: (...a: unknown[]) => mockEXT.groupsList(...a) },
  },
  ExternalService: {
    group: { get: (...a: unknown[]) => mockEXT.groupGet(...a), getInfo: (...a: unknown[]) => mockEXT.groupGetInfo(...a) },
    urls: { list: (...a: unknown[]) => mockEXT.urlsList(...a) },
    active: { getUrl: (...a: unknown[]) => mockEXT.activeGetUrl(...a) },
  },
}));
jest.mock('../../../shared/services/serials', () => ({
  SerialsService: { raw: { list: (...a: unknown[]) => mockSERIAL.rawList(...a) } },
  SerialService: {
    get: (...a: unknown[]) => mockSERIAL.get(...a),
    raw: { get: (...a: unknown[]) => mockSERIAL.rawGet(...a), chapters: { list: (...a: unknown[]) => mockSERIAL.rawChaptersList(...a) } },
    externalDetail: { sync: (...a: unknown[]) => mockSERIAL.externalDetailSync(...a) },
    bound: () => ({
      getFull: (...a: unknown[]) => mockSERIAL.boundGetFull(...a),
      raw: { chapters: { list: (...a: unknown[]) => mockSERIAL.boundRawChaptersList(...a) } },
    }),
  },
}));
jest.mock('../../../shared/services/chapters', () => ({
  ChapterService: {
    get: (...a: unknown[]) => mockCHAPTER.get(...a),
    bound: () => ({
      getFull: (...a: unknown[]) => mockCHAPTER.boundGetFull(...a),
      raw: { get: (...a: unknown[]) => mockCHAPTER.boundRawGet(...a) },
      progress: { get: (...a: unknown[]) => mockCHAPTER.boundProgressGet(...a) },
    }),
  },
}));
jest.mock('../../../shared/services/pages', () => ({
  PageService: {
    get: (...a: unknown[]) => mockPAGE.get(...a),
    bound: () => ({ raw: { dimensions: (...a: unknown[]) => mockPAGE.boundDimensions(...a), url: (...a: unknown[]) => mockPAGE.boundUrl(...a) } }),
  },
}));

import {
  chapterSteps,
  discoverActiveGroupId,
  discoverFirstExternalGroupId,
  discoverFirstGroupId,
  externalSteps,
  pageSteps,
  runStep,
  serialSteps,
  serverServiceSteps,
  serverSteps,
} from './debug.steps';
import { useDebugIds } from './debug.hooks';
import { DebugScreen } from './debug.screen';

beforeEach(() => jest.clearAllMocks());

describe('runStep', () => {
  it('marks ok with the returned detail', async () => {
    const step = await runStep('label', async () => 'all good');
    expect(step).toEqual({ label: 'label', ok: true, detail: 'all good' });
  });

  it('marks not-ok with the thrown error message', async () => {
    const step = await runStep('label', async () => {
      throw new Error('boom');
    });
    expect(step).toEqual({ label: 'label', ok: false, detail: 'boom' });
  });

  it('stringifies a non-Error throw', async () => {
    const step = await runStep('label', async () => {
      throw 'plain string';
    });
    expect(step.ok).toBe(false);
    expect(step.detail).toBe('plain string');
  });
});

describe('discover* helpers swallow failures', () => {
  it('discoverActiveGroupId returns the id, or null on throw', async () => {
    mockS.activeGet.mockResolvedValueOnce('g1');
    expect(await discoverActiveGroupId()).toBe('g1');
    mockS.activeGet.mockRejectedValueOnce(new Error('x'));
    expect(await discoverActiveGroupId()).toBeNull();
  });

  it('discoverFirstGroupId returns groups[0].id or null', async () => {
    mockS.groupsList.mockResolvedValueOnce([{ id: 'g7' }]);
    expect(await discoverFirstGroupId()).toBe('g7');
    mockS.groupsList.mockResolvedValueOnce([]);
    expect(await discoverFirstGroupId()).toBeNull();
    mockS.groupsList.mockRejectedValueOnce(new Error('x'));
    expect(await discoverFirstGroupId()).toBeNull();
  });

  it('discoverFirstExternalGroupId mirrors the server one for :external', async () => {
    mockEXT.groupsList.mockResolvedValueOnce([{ id: 'm1' }]);
    expect(await discoverFirstExternalGroupId()).toBe('m1');
    mockEXT.groupsList.mockRejectedValueOnce(new Error('x'));
    expect(await discoverFirstExternalGroupId()).toBeNull();
  });
});

describe('*Steps builders', () => {
  it('serverSteps runs the 4 :server reads against the given groupId', async () => {
    mockS.providersList.mockResolvedValue([{}, {}]);
    mockS.groupsList.mockResolvedValue([{}]);
    mockS.groupGet.mockResolvedValue({ name: 'Home' });
    mockS.urlsList.mockResolvedValue([{}, {}, {}]);

    const results = await Promise.all(serverSteps('g1').map(s => s()));
    expect(results.map(r => r.ok)).toEqual([true, true, true, true]);
    expect(results[2].detail).toBe('name=Home');
    expect(mockS.groupGet).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('serverServiceSteps sets then reads the in-memory active group', async () => {
    mockS.activeSet.mockResolvedValue(undefined);
    mockS.activeGet.mockResolvedValue('g1');
    mockS.boundGroupGet.mockResolvedValue({ name: 'Home' });

    const results = await Promise.all(serverServiceSteps('g1').map(s => s()));
    expect(results.map(r => r.ok)).toEqual([true, true, true]);
    expect(mockS.activeSet).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('externalSteps covers the 6 :external reads', async () => {
    mockEXT.providersList.mockResolvedValue([{}]);
    mockEXT.groupsList.mockResolvedValue([{}]);
    mockEXT.groupGet.mockResolvedValue({ name: 'M3' });
    mockEXT.groupGetInfo.mockResolvedValue({ urls: [{}] });
    mockEXT.urlsList.mockResolvedValue([{}]);
    mockEXT.activeGetUrl.mockResolvedValue(null);

    const results = await Promise.all(externalSteps('m1').map(s => s()));
    expect(results).toHaveLength(6);
    expect(results.every(r => r.ok)).toBe(true);
  });

  it('serialSteps / chapterSteps / pageSteps each resolve their reads', async () => {
    mockSERIAL.rawList.mockResolvedValue([{}]);
    mockSERIAL.get.mockResolvedValue({ isSuccess: true });
    mockSERIAL.boundGetFull.mockResolvedValue({ isSuccess: true });
    mockSERIAL.rawGet.mockResolvedValue({ name: 'S' });
    mockSERIAL.boundRawChaptersList.mockResolvedValue([{}]);
    const serials = await Promise.all(serialSteps('s1').map(s => s()));
    expect(serials.every(r => r.ok)).toBe(true);

    mockCHAPTER.get.mockResolvedValue({ isSuccess: true });
    mockCHAPTER.boundGetFull.mockResolvedValue({ isSuccess: true });
    mockCHAPTER.boundRawGet.mockResolvedValue({ title: 'C' });
    mockCHAPTER.boundProgressGet.mockResolvedValue({ pageIndex: 2 });
    const chapters = await Promise.all(chapterSteps('s1', 'c1').map(s => s()));
    expect(chapters.every(r => r.ok)).toBe(true);

    mockPAGE.get.mockResolvedValue({ isSuccess: true });
    mockPAGE.boundDimensions.mockResolvedValue({ width: 8, height: 12 });
    mockPAGE.boundUrl.mockResolvedValue('http://page');
    const pages = await Promise.all(pageSteps('s1', 'c1', 0).map(s => s()));
    expect(pages.every(r => r.ok)).toBe(true);
    expect(pages[1].detail).toBe('8x12');
  });

  it('a step whose underlying call rejects is reported ok:false', async () => {
    mockS.groupGet.mockRejectedValue(new Error('no group'));
    mockS.providersList.mockResolvedValue([]);
    mockS.groupsList.mockResolvedValue([]);
    mockS.urlsList.mockResolvedValue([]);
    const results = await Promise.all(serverSteps('bad').map(s => s()));
    expect(results[2]).toEqual({ label: 'ServerService.group.get', ok: false, detail: 'no group' });
  });
});

describe('useDebugIds', () => {
  it('seeds groupId from the active group when discovery finds one', async () => {
    mockS.activeGet.mockResolvedValue('g-active');
    mockEXT.groupsList.mockResolvedValue([{ id: 'm-1' }]);
    const { result } = renderHook(() => useDebugIds());
    await waitFor(() => expect(result.current.groupId).toBe('g-active'));
    await waitFor(() => expect(result.current.externalGroupId).toBe('m-1'));
  });

  it('falls back to the first group when there is no active one', async () => {
    mockS.activeGet.mockResolvedValue(null);
    mockS.groupsList.mockResolvedValue([{ id: 'g-first' }]);
    mockEXT.groupsList.mockResolvedValue([]);
    const { result } = renderHook(() => useDebugIds());
    await waitFor(() => expect(result.current.groupId).toBe('g-first'));
  });

  it('exposes setters for every editable id', async () => {
    mockS.activeGet.mockResolvedValue(null);
    mockS.groupsList.mockResolvedValue([]);
    mockEXT.groupsList.mockResolvedValue([]);
    const { result } = renderHook(() => useDebugIds());
    act(() => {
      result.current.setSeriesId('s9');
      result.current.setChapterId('c9');
      result.current.setPageIndex('3');
    });
    expect([result.current.seriesId, result.current.chapterId, result.current.pageIndex]).toEqual(['s9', 'c9', '3']);
  });
});

describe('DebugScreen', () => {
  beforeEach(() => {
    mockS.activeGet.mockResolvedValue(null);
    mockS.groupsList.mockResolvedValue([]);
    mockEXT.groupsList.mockResolvedValue([]);
  });

  it('renders a back chevron that calls onBack', async () => {
    const onBack = jest.fn();
    const { getByText } = render(<DebugScreen onBack={onBack} />);
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders the section run buttons', async () => {
    const { getAllByText } = render(<DebugScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getAllByText(/^Run /).length).toBeGreaterThan(0));
  });

  it('running the Server section discovers a group and executes every :server read', async () => {
    mockS.activeGet.mockResolvedValue('g-active');
    mockS.groupsList.mockResolvedValue([{}]);
    mockS.providersList.mockResolvedValue([{}]);
    mockS.groupGet.mockResolvedValue({ name: 'Home' });
    mockS.urlsList.mockResolvedValue([{}]);

    const { getByText } = render(<DebugScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText('Run Server')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Run Server'));
    });
    await waitFor(() => expect(getByText('name=Home')).toBeTruthy());
  });

  it('the Serials section auto-discovers a seriesId when the field is empty', async () => {
    mockS.activeGet.mockResolvedValue(null);
    mockS.groupsList.mockResolvedValue([]);
    mockEXT.groupsList.mockResolvedValue([]);
    mockSERIAL.rawList.mockResolvedValue([{ id: 's-disco' }]);
    mockSERIAL.get.mockResolvedValue({ isSuccess: true });
    mockSERIAL.boundGetFull.mockResolvedValue({ isSuccess: true });
    mockSERIAL.rawGet.mockResolvedValue({ name: 'S' });
    mockSERIAL.boundRawChaptersList.mockResolvedValue([{}]);
    mockSERIAL.externalDetailSync.mockResolvedValue(null);

    const { getByText } = render(<DebugScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText('Run Serials / SerialService')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Run Serials / SerialService'));
    });
    await waitFor(() => expect(mockSERIAL.rawList).toHaveBeenCalled());
  });

  it('the Serials section reports a helpful failure when nothing can be discovered', async () => {
    mockS.activeGet.mockResolvedValue(null);
    mockS.groupsList.mockResolvedValue([]);
    mockEXT.groupsList.mockResolvedValue([]);
    mockSERIAL.rawList.mockRejectedValue(new Error('offline'));

    const { getByText } = render(<DebugScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText('Run Serials / SerialService')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Run Serials / SerialService'));
    });
    await waitFor(() => expect(getByText(/no seriesId — type one in manually/)).toBeTruthy());
  });
});
