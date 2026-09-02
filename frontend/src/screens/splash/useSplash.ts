import { useCallback, useEffect, useRef, useState } from 'react';
import { OtaEmitter, OtaModule, OtaPolicy } from '../../native/OtaModule';
import { SetupBridge } from '../../shared/bridge/config';
import { StartupBridge } from '../../shared/bridge/startup';
import { activateFirstServerGroup } from './activateFirstServerGroup';

export type SplashDestination = 'setup' | 'library' | 'following';

export type OtaDialogAction = 'dismiss' | 'open_notes';

export interface SplashState {
  progress: number;
  otaUpdateReady: boolean;
  destination: SplashDestination | null;
  otaPolicy: OtaPolicy | null;
  // Called by SplashScreen when user acts on the highly_recommended / recommended dialog.
  onPolicyDismissed: (action: OtaDialogAction) => void;
}

const MIN_DURATION_MS = 5_000;
const MAX_DURATION_MS = 25_000;
const HIGHLY_REC_RESHOW_MS = 5 * 60_000;

export function useSplash(): SplashState {
  const [progress, setProgress] = useState(0);
  const [otaUpdateReady, setOtaUpdateReady] = useState(false);
  const [destination, setDestination] = useState<SplashDestination | null>(null);
  const [otaPolicy, setOtaPolicy] = useState<OtaPolicy | null>(null);

  // Resolves when user dismisses the highly_recommended dialog.
  const policyResolveRef = useRef<(() => void) | null>(null);
  // Tracks whether the splash is frozen waiting for a policy dismiss.
  // Used to prevent the 25s timeout from navigating while dialog is open.
  const blockedByPolicyRef = useRef(false);
  // Tracks whether navigation has already been triggered.
  const navigatedRef = useRef(false);

  const onPolicyDismissed = useCallback((_action: OtaDialogAction) => {
    setOtaPolicy(null);
    OtaModule.acknowledgePolicy().catch(() => undefined);
    blockedByPolicyRef.current = false;
    policyResolveRef.current?.();
    policyResolveRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const otaSub = OtaEmitter.addListener('otaBundleReady', () => {
      if (!cancelled) { setOtaUpdateReady(true); }
    });

    const startMs = Date.now();

    const timerInterval = setInterval(() => {
      if (cancelled) { return; }
      const elapsed = Date.now() - startMs;
      const timerProgress = Math.min(0.9, elapsed / MIN_DURATION_MS) * 0.9;
      setProgress(timerProgress);
    }, 50);

    // Hard timeout: navigate after 25s, but only if not blocked waiting for a policy dismiss.
    const timeoutHandle = setTimeout(() => {
      if (!cancelled && !navigatedRef.current && !blockedByPolicyRef.current) {
        navigatedRef.current = true;
        setProgress(1);
        setDestination('library');
      }
    }, MAX_DURATION_MS);

    function navigate(dest: SplashDestination) {
      if (navigatedRef.current || cancelled) { return; }
      navigatedRef.current = true;
      setProgress(1);
      setDestination(dest);
    }

    async function run() {
      try {
        const policy = await OtaModule.getOtaPolicy().catch(() => null);

        if (policy?.mode === 'required') {
          // Permanently frozen — never navigate. Android also blocks MainActivity.
          clearTimeout(timeoutHandle);
          setOtaPolicy(policy);
          return;
        }

        const [hasServer, hasFollowed, isAuthenticated] = await Promise.all([
          StartupBridge.hasServerConfigured().catch(() => false),
          StartupBridge.hasFollowedSeries().catch(() => false),
          SetupBridge.isAuthenticated().catch(() => false),
        ]);

        if (!hasServer || !isAuthenticated) {
          await waitForMinDuration(startMs);
          clearTimeout(timeoutHandle);
          navigate('setup');
          return;
        }

        // See activateFirstServerGroup's own doc for why this is needed (Server's activeGroupId
        // is never persisted) and why it lives in its own file. Best-effort — a failure here must
        // never block the splash (the legacy KavitaSeriesFeature path doesn't need this at all,
        // so a broken group doesn't have to mean a broken boot).
        await activateFirstServerGroup();

        // Hold for the minimum splash duration, measured from when the RN splash became visible.
        // (The old blocking Kotlin "sync" step is gone — it was a no-op since Task 028; the real
        // Library warm-up moves here in the splash migration, Task 038.)
        await waitForMinDuration(startMs);

        if (cancelled) { clearTimeout(timeoutHandle); return; }

        const dest: SplashDestination = hasFollowed ? 'following' : 'library';

        if (policy?.mode === 'highly_recommended' || policy?.mode === 'recommended') {
          // Both modes: show dialog and freeze splash until user acts.
          // highly_recommended: re-shows after 5 min once inside the app.
          // recommended: navigates immediately after dismiss (no re-show).
          blockedByPolicyRef.current = true;
          setOtaPolicy(policy);
          await new Promise<void>(resolve => { policyResolveRef.current = resolve; });
          if (cancelled) { clearTimeout(timeoutHandle); return; }

          clearTimeout(timeoutHandle);
          navigate(dest);

          if (policy.mode === 'highly_recommended') {
            const reshowHandle = setTimeout(() => {
              if (!cancelled) { setOtaPolicy(policy); }
            }, HIGHLY_REC_RESHOW_MS);
            return () => clearTimeout(reshowHandle);
          }
          return;
        }

        clearTimeout(timeoutHandle);
        navigate(dest);
      } catch {
        clearTimeout(timeoutHandle);
        navigate('library');
      }
    }

    run();

    return () => {
      cancelled = true;
      clearTimeout(timeoutHandle);
      clearInterval(timerInterval);
      otaSub.remove();
      policyResolveRef.current = null;
    };
  }, []);

  return { progress, otaUpdateReady, destination, otaPolicy, onPolicyDismissed };
}

function waitForMinDuration(startMs: number): Promise<void> {
  const elapsed = Date.now() - startMs;
  const remaining = MIN_DURATION_MS - elapsed;
  if (remaining <= 0) { return Promise.resolve(); }
  return new Promise(resolve => setTimeout(resolve, remaining));
}
