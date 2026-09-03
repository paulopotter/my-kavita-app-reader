import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../../shared/bridge/startup', () => ({
  StartupBridge: { markUiReady: jest.fn() },
}));

const listeners: Record<string, (payload: unknown) => void> = {};
jest.mock('../../../native/OtaModule', () => ({
  OtaModule: {
    getOtaPolicy: jest.fn(),
    getOtaState: jest.fn(),
    acknowledgePolicy: jest.fn(),
    applyOtaUpdate: jest.fn(),
  },
  OtaEmitter: {
    addListener: (name: string, cb: (payload: unknown) => void) => {
      listeners[name] = cb;
      return { remove: () => { delete listeners[name]; } };
    },
  },
}));

jest.mock('../../../shared/services/servers', () => ({
  ServersService: { groups: { list: jest.fn() } },
  ServerService: {
    group: { active: { set: jest.fn() } },
    auth: { reauthenticate: jest.fn() },
  },
}));

jest.mock('../../library/hooks/library.hooks', () => ({
  assembleLibrary: jest.fn(),
  seedLibrary: jest.fn(),
}));

import { StartupBridge } from '../../../shared/bridge/startup';
import { OtaModule } from '../../../native/OtaModule';
import { ServersService, ServerService } from '../../../shared/services/servers';
import { assembleLibrary, seedLibrary } from '../../library/hooks/library.hooks';
import { runSplashBoot, useSplash } from './splash.hooks';

const markUiReady = StartupBridge.markUiReady as jest.Mock;
const getOtaPolicy = OtaModule.getOtaPolicy as jest.Mock;
const getOtaState = OtaModule.getOtaState as jest.Mock;
const acknowledgePolicy = OtaModule.acknowledgePolicy as jest.Mock;
const listGroups = ServersService.groups.list as jest.Mock;
const setActiveGroup = ServerService.group.active.set as jest.Mock;
const reauthenticate = ServerService.auth.reauthenticate as jest.Mock;
const assemble = assembleLibrary as jest.Mock;
const seed = seedLibrary as jest.Mock;

function emit(name: string, payload?: unknown) {
  act(() => { listeners[name]?.(payload); });
}

const noopSteps = { onStep: () => {}, onProgress: () => {} };

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(listeners)) { delete listeners[k]; }
  markUiReady.mockResolvedValue(null);
  getOtaPolicy.mockResolvedValue(null);
  getOtaState.mockResolvedValue({ phase: 'idle', progress: -1, policy: null });
  acknowledgePolicy.mockResolvedValue(undefined);
  listGroups.mockResolvedValue([{ id: 'g1', name: 'S1' }]);
  setActiveGroup.mockResolvedValue(undefined);
  reauthenticate.mockResolvedValue(undefined);
  assemble.mockResolvedValue({ entries: [], lastUpdatedEpochMs: null });
  seed.mockReturnValue(undefined);
});

// ── runSplashBoot (pure) ─────────────────────────────────────────────────────

describe('runSplashBoot', () => {
  it('no server → destination setup, nothing else runs', async () => {
    listGroups.mockResolvedValue([]);
    const r = await runSplashBoot(noopSteps);
    expect(r.destination).toEqual({ kind: 'setup' });
    expect(setActiveGroup).not.toHaveBeenCalled();
    expect(assemble).not.toHaveBeenCalled();
  });

  it('groups.list rejects → treated as no server → setup', async () => {
    listGroups.mockRejectedValue(new Error('bridge'));
    const r = await runSplashBoot(noopSteps);
    expect(r.destination).toEqual({ kind: 'setup' });
  });

  it('server + auth ok → activates groups[0], warms the library (light), lands on home', async () => {
    const r = await runSplashBoot(noopSteps);
    expect(setActiveGroup).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(assemble).toHaveBeenCalledTimes(1);
    expect(seed).toHaveBeenCalledTimes(1);
    expect(r.destination).toEqual({ kind: 'home' });
  });

  it('navigates anyway if the warm-up outlasts the cap, then seeds when it finishes', async () => {
    jest.useFakeTimers();
    let resolveAssemble!: (v: { entries: []; lastUpdatedEpochMs: null }) => void;
    assemble.mockReturnValue(new Promise(res => { resolveAssemble = res; }));

    const p = runSplashBoot(noopSteps);
    // flush the awaited server/auth microtasks, then fire the safety cap
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(2000);

    const r = await p;
    expect(r.destination).toEqual({ kind: 'home' });
    expect(seed).not.toHaveBeenCalled(); // assemble still pending when the splash gave up

    resolveAssemble({ entries: [], lastUpdatedEpochMs: null });
    await jest.advanceTimersByTimeAsync(0);
    expect(seed).toHaveBeenCalledTimes(1); // background warm-up still seeded after the fact

    jest.useRealTimers();
  });

  it('setActiveGroup fails once → reauthenticate + retry → home', async () => {
    setActiveGroup.mockRejectedValueOnce(new Error('401')).mockResolvedValueOnce(undefined);
    const r = await runSplashBoot(noopSteps);
    expect(reauthenticate).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(setActiveGroup).toHaveBeenCalledTimes(2);
    expect(r.destination).toEqual({ kind: 'home' });
  });

  it('setActiveGroup fails and reauth also fails → setup, no warm-up', async () => {
    setActiveGroup.mockRejectedValue(new Error('401'));
    reauthenticate.mockRejectedValue(new Error('bad key'));
    const r = await runSplashBoot(noopSteps);
    expect(r.destination).toEqual({ kind: 'setup' });
    expect(assemble).not.toHaveBeenCalled();
  });

  it('a warm-up failure does not change the destination', async () => {
    assemble.mockRejectedValue(new Error('digest down'));
    const r = await runSplashBoot(noopSteps);
    expect(r.destination).toEqual({ kind: 'home' });
    expect(seed).not.toHaveBeenCalled();
  });

  it('drives progress forward through the steps', async () => {
    const seen: number[] = [];
    await runSplashBoot({ onStep: () => {}, onProgress: v => seen.push(v) });
    expect(seen[0]).toBeLessThan(seen[seen.length - 1]);
    expect(seen[seen.length - 1]).toBe(1);
  });
});

// ── useSplash (hook) ─────────────────────────────────────────────────────────

describe('useSplash — mount', () => {
  it('signals native, then resolves navigate to the hub on a healthy boot', async () => {
    const { result } = renderHook(() => useSplash());
    expect(markUiReady).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(result.current.navigate).toEqual({ index: 0, routes: [{ name: 'hub' }] }),
    );
  });

  it('no server → navigate to setup', async () => {
    listGroups.mockResolvedValue([]);
    const { result } = renderHook(() => useSplash());
    await waitFor(() =>
      expect(result.current.navigate).toEqual({ index: 0, routes: [{ name: 'setup' }] }),
    );
  });

  it('progress ends at 1 on a healthy boot', async () => {
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(result.current.progress).toBe(1));
  });
});

describe('useSplash — OTA required is a hard stop', () => {
  it('required → no RN alert (native dialog covers it), navigate stays null even though the graph would finish', async () => {
    getOtaPolicy.mockResolvedValue({ mode: 'required', releaseNotesUrl: 'https://n' });
    const { result } = renderHook(() => useSplash());
    // Let the boot graph run to completion — a healthy boot would resolve `home`.
    await waitFor(() => expect(seed).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    // required never draws its own AppAlert — MainActivity's native dialog is the block.
    expect(result.current.otaAlert).toBeNull();
    // ...and the redirect is discarded: the splash just freezes.
    expect(result.current.navigate).toBeNull();
  });
});

describe('useSplash — highly_recommended (alert, no download, no button)', () => {
  it('shows a dismissible 2-button alert; dismiss clears it and acknowledges', async () => {
    getOtaPolicy.mockResolvedValue({ mode: 'highly_recommended', releaseNotesUrl: 'https://n' });
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(result.current.otaAlert).not.toBeNull());
    expect(result.current.otaAlert!.buttons).toHaveLength(2);
    act(() => { result.current.otaAlert!.buttons[0].onPress(); });
    await waitFor(() => expect(result.current.otaAlert).toBeNull());
    expect(OtaModule.acknowledgePolicy).toHaveBeenCalledTimes(1);
  });

  it('holds the redirect while the alert is up, releases it after dismiss', async () => {
    getOtaPolicy.mockResolvedValue({ mode: 'highly_recommended', releaseNotesUrl: 'https://n' });
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(seed).toHaveBeenCalled());
    await waitFor(() => expect(result.current.otaAlert).not.toBeNull());
    expect(result.current.navigate).toBeNull();
    act(() => { result.current.otaAlert!.buttons[0].onPress(); });
    await waitFor(() =>
      expect(result.current.navigate).toEqual({ index: 0, routes: [{ name: 'hub' }] }),
    );
  });

  it('"view notes" opens the URL', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    getOtaPolicy.mockResolvedValue({ mode: 'highly_recommended', releaseNotesUrl: 'https://notes' });
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(result.current.otaAlert).not.toBeNull());
    act(() => { result.current.otaAlert!.buttons[1].onPress(); });
    expect(openURL).toHaveBeenCalledWith('https://notes');
    openURL.mockRestore();
  });
});

describe('useSplash — recommended (no alert, bg download, update button + grace)', () => {
  it('never shows an alert', async () => {
    getOtaPolicy.mockResolvedValue({ mode: 'recommended', releaseNotesUrl: 'https://n' });
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(seed).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.otaAlert).toBeNull();
  });

  it('once the bundle is staged, holds the redirect for the grace period, then navigates + acknowledges', async () => {
    jest.useFakeTimers();
    getOtaPolicy.mockResolvedValue({ mode: 'recommended', releaseNotesUrl: 'https://n' });
    getOtaState.mockResolvedValue({ phase: 'ready', progress: 1, policy: null });
    const { result } = renderHook(() => useSplash());

    // Boot graph + the "ready" pull both settle → button is up, decision is ready, but held.
    await act(async () => { await jest.advanceTimersByTimeAsync(2100); });
    expect(result.current.otaUpdateReady).toBe(true);
    expect(result.current.navigate).toBeNull();
    expect(OtaModule.acknowledgePolicy).not.toHaveBeenCalled();

    // Grace elapses → acknowledge + redirect.
    await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
    expect(OtaModule.acknowledgePolicy).toHaveBeenCalledTimes(1);
    expect(result.current.navigate).toEqual({ index: 0, routes: [{ name: 'hub' }] });

    jest.useRealTimers();
  });

  it('otaBundleReady flips otaUpdateReady', async () => {
    const { result } = renderHook(() => useSplash());
    await waitFor(() => expect(getOtaState).toHaveBeenCalled());
    emit('otaBundleReady');
    await waitFor(() => expect(result.current.otaUpdateReady).toBe(true));
  });
});
