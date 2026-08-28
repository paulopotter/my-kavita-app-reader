import { ServerService, ServersService } from '../../shared/services/servers/servers.services';

// Server (Layer 2)'s activeGroupId only lives in memory — it's never persisted, so it's always
// null right after a fresh boot. Any screen using the new Server-based bridges (SerialService/
// ChapterService, the digest builders under it) needs a group active before its first call, or
// it throws "No active server group set". No group picker exists yet — this activates whichever
// group ServersService.groups.list() returns first when more than one is configured; a no-op
// when there are none (nothing to activate; screens relying on Server just won't have data, same
// as today). Never throws — useSplash fires this off best-effort, exactly like every other
// startup check it already runs.
//
// Kept in its own file, not inside useSplash.ts, so it can be imported and tested without
// pulling in native/OtaModule.ts (which runs `new NativeEventEmitter(...)` at import time —
// unrelated to this function, but it makes useSplash.ts itself impossible to import under Jest
// without a native-module mock this project's test setup doesn't provide today).
export function activateFirstServerGroup(): Promise<void> {
  return ServersService.groups
    .list()
    .then(groups => {
      const firstGroup = groups[0];
      if (!firstGroup) {return;}
      return ServerService.group.active.set({ groupId: firstGroup.id });
    })
    .catch(() => undefined);
}
