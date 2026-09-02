import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { OtaEmitter, OtaModule, OtaPolicyMode } from '../../../native/OtaModule';
import { StartupBridge } from '../../../shared/bridge/startup';
import { FollowedSeriesBridge } from '../../../shared/bridge/followedSeries';
import { ServersService, ServerService } from '../../../shared/services/servers';
import { SerialService } from '../../../shared/services/serials';
import { assembleLibrary, seedLibrary } from '../../library/hooks/library.hooks';
import { useStrings } from '../../../shared/i18n/useStrings';
import { Routes } from '../../../navigation/routes';
import type { AppAlertButton } from '../../../shared/components/AppAlert';
import type { SplashDestination, SplashNavAction, SplashOtaAlert, SplashState } from '../splash.types';

// Re-show the highly_recommended dialog this long after it's first dismissed. recommended is
// dismissed once and never re-shown.
const HIGHLY_REC_RESHOW_MS = 5 * 60_000;

// Discrete progress checkpoints for the boot graph. The bar isn't a real percentage — it's "how
// far along the known steps we are", so a slow network still shows forward motion.
const P = {
  start: 0.05,
  serverOk: 0.25,
  authOk: 0.5,
  followWarm: 0.7,
  libraryWarm: 0.95,
  done: 1,
} as const;

// ── boot graph ───────────────────────────────────────────────────────────────
// Pure async orchestration — no React. Same "sits next to the hook, not in a separate file"
// arrangement as the library's assembleLibrary. Tested with a plain `await` (see splash.tests).
//
// Two independent front-runners with the same priority: the OTA policy check (handled by the
// hook's effect, can hard-stop on `required`) and the server check here. If there's no server,
// nothing else matters — bail to 'setup'. Once a server is active and authenticated, warm the
// followed series' cache, then assemble the full Library list and seed it, then land on 'home'.
// Everything after the auth gate is best-effort: a warm-up failure never changes the destination.
export async function runSplashBoot(opts: {
  onStep: (label: string) => void;
  onProgress: (value: number) => void;
}): Promise<{ destination: SplashDestination }> {
  const { onStep, onProgress } = opts;

  onStep('checking server');
  onProgress(P.start);

  const groups = await ServersService.groups.list().catch(() => [] as Awaited<ReturnType<typeof ServersService.groups.list>>);
  if (groups.length === 0) {
    return { destination: { kind: 'setup' } };
  }
  onProgress(P.serverOk);

  // setActiveGroup authenticates internally when the group has no session yet. A failure here is
  // an auth failure — try one forced re-authentication before giving up to setup.
  const groupId = groups[0].id;
  onStep('signing in');
  const authed = await activateAndAuth(groupId);
  if (!authed) {
    return { destination: { kind: 'setup' } };
  }
  onProgress(P.authOk);

  // Best-effort from here on.
  onStep('loading library');
  const followedIds = await FollowedSeriesBridge.getAllIds().catch(() => [] as string[]);
  await Promise.allSettled(followedIds.map(seriesId => SerialService.get({ seriesId })));
  onProgress(P.followWarm);

  try {
    const { entries, lastUpdatedEpochMs } = await assembleLibrary({ force: false });
    seedLibrary(entries, lastUpdatedEpochMs);
  } catch {
    // The Library screen will assemble on its own mount; the seed is just a head start.
  }
  onProgress(P.libraryWarm);

  onProgress(P.done);
  return { destination: { kind: 'home' } };
}

async function activateAndAuth(groupId: string): Promise<boolean> {
  try {
    await ServerService.group.active.set({ groupId });
    return true;
  } catch {
    // Session likely stale/expired — force a fresh login, then re-activate.
    try {
      await ServerService.auth.reauthenticate({ groupId });
      await ServerService.group.active.set({ groupId });
      return true;
    } catch {
      return false;
    }
  }
}

// The single place that turns a SplashDestination into the object the screen passes to
// navigation.reset(). Exhaustive — a new `kind` on SplashDestination breaks the build here until
// it's mapped, so there's no silent fallback to worry about.
function navActionFor(destination: SplashDestination): SplashNavAction {
  switch (destination.kind) {
    case 'setup':
      return { index: 0, routes: [{ name: Routes.SETUP }] };
    case 'home':
      return { index: 0, routes: [{ name: Routes.HUB }] };
    // Deep-link targets: land on the hub for now (no series/reader stacking yet). When deep
    // links are wired, add the extra route(s)/params here — the screen doesn't change.
    case 'serial':
      return { index: 0, routes: [{ name: Routes.HUB }] };
    case 'reader':
      return { index: 0, routes: [{ name: Routes.HUB }] };
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────
// Rewritten from the legacy useSplash, one concern at a time (Task 038).
//
//  - markUiReady: tell MainActivity the RN splash painted, so it drops the system splash.
//  - OTA: read the pending policy, surface the advisory dialog (`otaAlert`), drive the hidden
//    "apply update" button off `otaBundleReady`, log the download progress. `required` is a hard
//    stop — the boot never proceeds and there's no dismiss.
//  - Boot graph (runSplashBoot): server → auth → followed warm-up → Library warm-up → a
//    SplashDestination, which navActionFor() turns into the `navigate` object the screen resets to.
//
// `progress` and `navigate` are wired to the return. `progressLabel` is NOT — each step logs its
// label for now (the screen will show it once the sequence is proven on device).
export function useSplash(): SplashState {
  const t = useStrings();

  const [progress, setProgress] = useState(0);
  const [navigate, setNavigate] = useState<SplashNavAction | null>(null);

  const reportStep = useCallback((label: string) => {
    // eslint-disable-next-line no-console
    console.log('[splash] step:', label);
  }, []);

  // ── OTA state ───────────────────────────────────────────────────────────────
  const [policyMode, setPolicyMode] = useState<OtaPolicyMode | null>(null);
  const [releaseNotesUrl, setReleaseNotesUrl] = useState<string | null>(null);
  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);
  const [otaUpdateReady, setOtaUpdateReady] = useState(false);
  const [, setOtaDownloadProgress] = useState(-1);

  const reshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    StartupBridge.markUiReady().catch(() => undefined);
    reportStep('boot');

    // Front-runner 1: OTA policy. `required` is a hard stop — no boot graph, no destination.
    reportStep('checking updates');
    const otaPolicyReady = OtaModule.getOtaPolicy()
      .then(policy => {
        if (cancelled || !policy) { return false; }
        setPolicyMode(policy.mode);
        setReleaseNotesUrl(policy.releaseNotesUrl);
        if (policy.mode === 'required') {
          reportStep('update required');
          return true; // blocked
        }
        return false;
      })
      .catch(() => false);

    OtaModule.getOtaState()
      .then(state => {
        if (cancelled) { return; }
        if (state.phase === 'ready') { setOtaUpdateReady(true); }
        setOtaDownloadProgress(state.progress);
      })
      .catch(() => undefined);

    const readySub = OtaEmitter.addListener('otaBundleReady', () => {
      if (!cancelled) { setOtaUpdateReady(true); }
    });
    const progressSub = OtaEmitter.addListener('otaDownloadProgress', (e: { phase: string; progress: number }) => {
      if (cancelled) { return; }
      setOtaDownloadProgress(e.progress);
      // eslint-disable-next-line no-console
      console.log('[splash] ota download:', e.phase, e.progress);
    });

    // Front-runner 2: the boot graph. Runs in parallel with the OTA check; if OTA came back
    // `required`, discard the graph's result (the required dialog stays and nothing navigates).
    Promise.all([
      otaPolicyReady,
      runSplashBoot({
        onStep: reportStep,
        onProgress: v => { if (!cancelled) { setProgress(v); } },
      }).catch(() => ({ destination: { kind: 'setup' } as SplashDestination })),
    ]).then(([blocked, boot]) => {
      if (cancelled || blocked) { return; }
      setNavigate(navActionFor(boot.destination));
    });

    return () => {
      cancelled = true;
      readySub.remove();
      progressSub.remove();
      if (reshowTimerRef.current) { clearTimeout(reshowTimerRef.current); }
    };
  }, [reportStep]);

  // ── advisory dialog actions ─────────────────────────────────────────────────
  const dismissAdvisory = useCallback(() => {
    OtaModule.acknowledgePolicy().catch(() => undefined);
    setAdvisoryDismissed(true);
    if (policyMode === 'highly_recommended') {
      reshowTimerRef.current = setTimeout(() => setAdvisoryDismissed(false), HIGHLY_REC_RESHOW_MS);
    }
  }, [policyMode]);

  const openReleaseNotes = useCallback(() => {
    if (releaseNotesUrl) {
      Linking.openURL(releaseNotesUrl).catch(() => undefined);
    }
    if (policyMode !== 'required') { dismissAdvisory(); }
  }, [releaseNotesUrl, policyMode, dismissAdvisory]);

  // ── otaAlert: derive the AppAlert props from the policy mode + Strings ───────
  const otaAlert = useMemo<SplashOtaAlert | null>(() => {
    if (!policyMode) { return null; }
    if (policyMode !== 'required' && advisoryDismissed) { return null; }

    const isRequired = policyMode === 'required';
    const title = isRequired
      ? t.otaRequiredTitle
      : policyMode === 'highly_recommended'
        ? t.otaHighlyRecTitle
        : t.otaRecommendedTitle;
    const message = isRequired ? t.otaRequiredBody : t.otaAdvisoryBody;
    const buttons: AppAlertButton[] = isRequired
      ? [{ label: t.otaViewNotes, variant: 'primary', onPress: openReleaseNotes }]
      : [
          { label: t.otaDismiss, variant: 'secondary', onPress: dismissAdvisory },
          { label: t.otaViewNotes, variant: 'primary', onPress: openReleaseNotes },
        ];

    return { title, message, buttons, dismissible: !isRequired };
  }, [policyMode, advisoryDismissed, t, openReleaseNotes, dismissAdvisory]);

  return {
    progress,
    // progressLabel intentionally NOT wired yet — see reportStep above.
    progressLabel: undefined,
    otaUpdateReady,
    otaAlert,
    navigate,
  };
}
