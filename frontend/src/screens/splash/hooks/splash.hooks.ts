import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { OtaEmitter, OtaModule, OtaPolicyMode } from '../../../native/OtaModule';
import { StartupBridge } from '../../../shared/bridge/startup';
import {
  ExternalsService,
  ExternalService,
  ServersService,
  ServerService,
} from '../../../shared/services/servers';
import { assembleLibrary, seedLibrary } from '../../library/hooks/library.hooks';
import { useStrings } from '../../../shared/i18n/useStrings';
import { Routes } from '../../../navigation/routes';
import type { AppAlertButton } from '../../../shared/components/app-alert';
import type { SplashDestination, SplashNavAction, SplashOtaAlert, SplashState } from '../splash.types';

// Re-show the highly_recommended dialog this long after it's first dismissed. recommended is
// dismissed once and never re-shown.
const HIGHLY_REC_RESHOW_MS = 5 * 60_000;

// When the boot finishes and a downloaded OTA bundle is already staged (the "apply update" button
// is showing), hold the splash this long before redirecting — long enough for the user to see the
// button and tap it if they want. They can still just wait it out; the redirect fires after.
const UPDATE_BUTTON_GRACE_MS = 5_000;

// Discrete progress checkpoints for the boot graph. The bar isn't a real percentage — it's "how
// far along the known steps we are", so a slow network still shows forward motion.
const P = {
  start: 0.1,
  serverOk: 0.35,
  authOk: 0.6,
  warmingLibrary: 0.85,
  done: 1,
} as const;

// Safety cap on waiting for the (light) Library warm-up. The warm-up is just the list + the BFF
// batch match now — no per-series digest fetches (those were the ~25s tail; they move to lazy
// per-viewport fetches on the Library/Following screen). So this normally resolves well under the
// cap; the cap only matters if the BFF call hangs. On timeout the splash navigates anyway and
// the warm-up keeps running and still seeds.
const WARMUP_BUDGET_MS = 2000;

// ── boot graph ───────────────────────────────────────────────────────────────
// Pure async orchestration — no React. Same "sits next to the hook, not in a separate file"
// arrangement as the library's assembleLibrary. Tested with a plain `await` (see splash.tests).
//
// Two independent front-runners with the same priority: the OTA policy check (handled by the
// hook's effect, can hard-stop on `required`) and the server check here. If there's no server,
// nothing else matters — bail to 'setup'. Once a server is active and authenticated, the splash
// runs the LIGHT Library warm-up (list + BFF match only) with a small safety cap, then navigates.
// The warm-up still seeds the handoff even if it outlasts the cap. The heavy per-series digests
// no longer run here — the Library/Following screen fetches those lazily per viewport.
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

  // The server's active URL is now resolved. If a metadata server exists, resolve it too against
  // that URL — cascade, per the user's design. Best-effort, non-blocking: a missing metadata
  // group or an unreachable one is fine, the Library's own metadata sync re-resolves lazily.
  resolveMetadataServer();

  onStep('loading library');
  onProgress(P.warmingLibrary);
  await Promise.race([
    warmLibrary(),
    new Promise<void>(resolve => setTimeout(resolve, WARMUP_BUDGET_MS)),
  ]);

  onProgress(P.done);
  return { destination: { kind: 'home' } };
}

// Runs the light Library assembly (list + BFF batch match; no per-series digests) and seeds the
// module-level handoff so a Library mount right after can paint without its own fetch. Detached
// from any component (only services + the seedLibrary module var, never React state), so it's
// safe outside a mounted tree — runSplashBoot may stop awaiting it (cap) while it's still going.
// All failures swallowed; the Library screen assembles on its own mount anyway.
function warmLibrary(): Promise<void> {
  return (async () => {
    try {
      const { entries, lastUpdatedEpochMs } = await assembleLibrary({ force: false, light: true });
      seedLibrary(entries, lastUpdatedEpochMs);
    } catch {
      /* head start only */
    }
  })();
}

// Fire-and-forget: activate the (single) metadata server group so its active URL is resolved
// against the server URL the splash just picked. No metadata group → nothing to do. Never
// throws — an unreachable metadata endpoint is not a boot failure. The caller does not await it.
function resolveMetadataServer(): Promise<void> {
  return (async () => {
    try {
      const groups = await ExternalsService.groups.list();
      const g = groups[0];
      if (g) {
        await ExternalService.group.active.set({ groupId: g.id });
      }
    } catch {
      /* metadata resolves lazily on the first Library sync anyway */
    }
  })();
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
  // The boot graph's decision, held here until it's safe to hand to navigation.reset():
  // - null while the graph hasn't decided (or `required` blocked it — it's never set then).
  // - set but NOT forwarded while an advisory dialog (highly_recommended / recommended) is still
  //   on screen — the redirect only fires once the user dismisses it. `navigate` (below) applies
  //   that gate.
  const [pendingNav, setPendingNav] = useState<SplashNavAction | null>(null);

  const reportStep = useCallback((_label: string) => {
    // Boot-graph step trace — kept for the debug task (backlog 015-telemetria-interna-debug).
    // Uncomment (with an eslint-disable-next-line no-console) when profiling splash timing on
    // device; not wired to the return yet.
    // console.log('[splash] step:', _label);
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
      // OTA download trace — kept for the debug task (backlog 015-telemetria-interna-debug).
      // Uncomment (with an eslint-disable-next-line no-console) when profiling on device.
      // console.log('[splash] ota download:', e.phase, e.progress);
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
      // Decision is ready. Whether it's forwarded now or held for an advisory dismiss is decided
      // by the `navigate` gate below, not here.
      setPendingNav(navActionFor(boot.destination));
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

  // ── otaAlert: the advisory dialog — ONLY for highly_recommended ─────────────
  // Mode-by-mode, what the splash does:
  //  - required            → no RN alert; MainActivity shows a native blocking dialog and this
  //                          hook just freezes (no progress, no redirect).
  //  - highly_recommended  → this dialog. The bundle is NOT downloaded (ota-serve: "download
  //                          skipped"); the splash holds the redirect until the dialog is
  //                          dismissed, then re-shows it after 5 min inside the app. The buttons
  //                          are "dismiss" + "view notes" for now — an on-demand "download now"
  //                          button needs a Kotlin bridge that doesn't exist yet (backlog 020).
  //  - recommended         → NO dialog. The bundle downloads in the background; when it's staged
  //                          the "apply update" button appears and the grace period below gives
  //                          the user a moment to tap it before the redirect.
  const otaAlert = useMemo<SplashOtaAlert | null>(() => {
    if (policyMode !== 'highly_recommended' || advisoryDismissed) { return null; }

    const buttons: AppAlertButton[] = [
      { label: t.otaDismiss, variant: 'secondary', onPress: dismissAdvisory },
      { label: t.otaViewNotes, variant: 'primary', onPress: openReleaseNotes },
    ];

    return { title: t.otaHighlyRecTitle, message: t.otaAdvisoryBody, buttons, dismissible: true };
  }, [policyMode, advisoryDismissed, t, openReleaseNotes, dismissAdvisory]);

  // The redirect is held while an advisory dialog is still up: the boot decision may be ready, but
  // navigating out from under the dialog would flash the app behind it. `required` never reaches
  // here (pendingNav stays null — the boot result is discarded on `blocked`).
  const advisoryBlockingNav = otaAlert !== null;

  // Grace period: once the boot has decided AND a staged bundle's "apply update" button is
  // showing, hold the redirect UPDATE_BUTTON_GRACE_MS so the user actually gets to see/tap it.
  // Armed only when both are true and no advisory is still blocking; the timer flips `graceOver`
  // and the redirect goes through. Tapping the button applies the OTA (restarts) before this
  // fires anyway.
  const [graceOver, setGraceOver] = useState(false);
  const needsGrace = pendingNav !== null && otaUpdateReady && !advisoryBlockingNav;
  useEffect(() => {
    if (!needsGrace || graceOver) { return; }
    const h = setTimeout(() => {
      // The user saw the "apply update" button for the grace period and didn't tap it — treat
      // that as acknowledgement so the Kotlin side stops re-offering this (recommended) policy,
      // then let the redirect through.
      OtaModule.acknowledgePolicy().catch(() => undefined);
      setGraceOver(true);
    }, UPDATE_BUTTON_GRACE_MS);
    return () => clearTimeout(h);
  }, [needsGrace, graceOver]);

  const navigate = advisoryBlockingNav || (needsGrace && !graceOver) ? null : pendingNav;

  return {
    progress,
    // progressLabel intentionally NOT wired yet — see reportStep above.
    progressLabel: undefined,
    otaUpdateReady,
    otaAlert,
    navigate,
  };
}
