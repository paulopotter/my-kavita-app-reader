import { ChapterService } from '../../shared/services/chapters';
import { PageService } from '../../shared/services/pages';
import { SerialService, SerialsService } from '../../shared/services/serials';
import { ExternalsService, ExternalService, ServersService, ServerService } from '../../shared/services/servers';

export interface SmokeTestStep {
  label: string;
  ok: boolean;
  detail: string;
}

// Manual, real-network smoke test for the Task 021 RN Services (Page/Chapter/Serial/Server) —
// exercises every Service (including bound()) against whatever server is currently active on
// the device. Read-only: no server_group/server_url/auth_config writes, no Kavita mutation
// (no status.set/progress.set/etc). ServerService.group.active.set is the one exception — it
// only writes Server's in-memory activeGroupId (Server.kt), never persisted, reset on app
// restart, and is a hard prerequisite for any content read (Server throws "No active server
// group set" otherwise) — not a mutation of user data.
// Not a substitute for the mocked unit tests in each *.tests.ts — this is a human-in-the-loop
// check that the real bridge round-trip matches what those mocks assume.
export async function runStep(
  label: string,
  run: () => Promise<string>,
): Promise<SmokeTestStep> {
  try {
    const detail = await run();
    return { label, ok: true, detail };
  } catch (e: unknown) {
    return { label, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

// ── Section 1: :server itself (Servers/Server, no Digest involved) ─────────────

export async function discoverActiveGroupId(): Promise<string | null> {
  try {
    return await ServerService.group.active.get();
  } catch {
    return null;
  }
}

export async function discoverFirstGroupId(): Promise<string | null> {
  try {
    const groups = await ServersService.groups.list();
    return groups[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function serverSteps(groupId: string): Array<() => Promise<SmokeTestStep>> {
  return [
    () => runStep('ServersService.providers.list', async () => {
      const providers = await ServersService.providers.list();
      return `${providers.length} provider(s)`;
    }),
    () => runStep('ServersService.groups.list', async () => {
      const groups = await ServersService.groups.list();
      return `${groups.length} group(s)`;
    }),
    () => runStep('ServerService.group.get', async () => {
      const group = await ServerService.group.get({ groupId });
      return group ? `name=${group.name}` : '(not found)';
    }),
    () => runStep('ServerService.urls.list', async () => {
      const urls = await ServerService.urls.list({ groupId });
      return `${urls.length} url(s)`;
    }),
  ];
}

// ── Section 2: ServerService session prerequisite (in-memory only) ─────────────

export function serverServiceSteps(groupId: string): Array<() => Promise<SmokeTestStep>> {
  return [
    () => runStep('ServerService.group.active.set', async () => {
      await ServerService.group.active.set({ groupId });
      return 'ok';
    }),
    () => runStep('ServerService.group.active.get (after set)', async () => {
      const active = await ServerService.group.active.get();
      return `groupId=${active ?? '(none)'}`;
    }),
    () => runStep('ServerService.bound(...).group.get', async () => {
      const bound = ServerService.bound({ groupId });
      const group = await bound.group.get();
      return group ? `name=${group.name}` : '(not found)';
    }),
  ];
}

// ── Section 3: SerialsService/SerialService (read-only) ────────────────────────

export async function discoverFirstSeriesId(): Promise<string | null> {
  try {
    const serials = await SerialsService.list();
    return serials[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function serialSteps(seriesId: string): Array<() => Promise<SmokeTestStep>> {
  const bound = SerialService.bound({ seriesId });
  return [
    () => runStep('SerialsService.list', async () => {
      const serials = await SerialsService.list();
      return `${serials.length} serial(s)`;
    }),
    () => runStep('SerialService.get', async () => {
      const digest = await SerialService.get({ seriesId });
      return `isSuccess=${digest.isSuccess}`;
    }),
    () => runStep('SerialService.bound(...).getFull', async () => {
      const digest = await bound.getFull();
      return `isSuccess=${digest.isSuccess}`;
    }),
    () => runStep('SerialService.raw.get', async () => {
      const raw = await SerialService.raw.get({ seriesId });
      return `name=${raw.name}`;
    }),
    () => runStep('SerialService.bound(...).raw.chapters.list', async () => {
      const chapters = await bound.raw.chapters.list();
      return `${chapters.length} chapter(s)`;
    }),
  ];
}

// ── Section 3b: SerialService.externalDetail (read-only, BFF/M3 metadata) ──────

export function serialExternalDetailSteps(seriesId: string): Array<() => Promise<SmokeTestStep>> {
  return [
    () => runStep('SerialService.externalDetail.sync', async () => {
      const raw = await SerialService.raw.get({ seriesId });
      const match = await SerialService.externalDetail.sync({ seriesId, seriesName: raw.name });
      return match ? `slug=${match.slug ?? '(none)'} status=${match.status}` : '(no match)';
    }),
  ];
}

// ── Section 3c: ExternalsService/ExternalService (:external-metadata-server, read-only) ──

export async function discoverFirstExternalGroupId(): Promise<string | null> {
  try {
    const groups = await ExternalsService.groups.list();
    return groups[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function externalSteps(groupId: string): Array<() => Promise<SmokeTestStep>> {
  return [
    () => runStep('ExternalsService.providers.list', async () => {
      const providers = await ExternalsService.providers.list();
      return `${providers.length} provider(s)`;
    }),
    () => runStep('ExternalsService.groups.list', async () => {
      const groups = await ExternalsService.groups.list();
      return `${groups.length} group(s)`;
    }),
    () => runStep('ExternalService.group.get', async () => {
      const group = await ExternalService.group.get({ groupId });
      return group ? `name=${group.name}` : '(not found)';
    }),
    () => runStep('ExternalService.group.getInfo', async () => {
      const info = await ExternalService.group.getInfo({ groupId });
      return `${info.urls.length} url(s)`;
    }),
    () => runStep('ExternalService.urls.list', async () => {
      const urls = await ExternalService.urls.list({ groupId });
      return `${urls.length} url(s)`;
    }),
    () => runStep('ExternalService.active.getUrl (before set)', async () => {
      const active = await ExternalService.active.getUrl();
      return active ? `url=${active.url}` : '(none resolved yet)';
    }),
  ];
}

// ── Section 4: ChapterService (read-only) ───────────────────────────────────────

export async function discoverFirstChapterId(seriesId: string): Promise<string | null> {
  try {
    const chapters = await SerialService.raw.chapters.list({ seriesId });
    return chapters[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function chapterSteps(seriesId: string, chapterId: string): Array<() => Promise<SmokeTestStep>> {
  const bound = ChapterService.bound({ seriesId, chapterId });
  return [
    () => runStep('ChapterService.get', async () => {
      const digest = await ChapterService.get({ seriesId, chapterId });
      return `isSuccess=${digest.isSuccess}`;
    }),
    () => runStep('ChapterService.bound(...).getFull', async () => {
      const digest = await bound.getFull();
      return `isSuccess=${digest.isSuccess}`;
    }),
    () => runStep('ChapterService.bound(...).raw.get', async () => {
      const raw = await bound.raw.get();
      return `title=${raw.title}`;
    }),
    () => runStep('ChapterService.bound(...).progress.get', async () => {
      const progress = await bound.progress.get();
      return progress ? `pageIndex=${progress.pageIndex}` : '(no progress yet)';
    }),
  ];
}

// ── Section 5: PageService (read-only) ──────────────────────────────────────────

export function pageSteps(seriesId: string, chapterId: string, pageIndex: number): Array<() => Promise<SmokeTestStep>> {
  const bound = PageService.bound({ seriesId, chapterId, pageIndex });
  return [
    () => runStep('PageService.get', async () => {
      const digest = await PageService.get({ seriesId, chapterId, pageIndex });
      return `isSuccess=${digest.isSuccess}`;
    }),
    () => runStep('PageService.bound(...).raw.dimensions', async () => {
      const dims = await bound.raw.dimensions();
      return `${dims.width}x${dims.height}`;
    }),
    () => runStep('PageService.bound(...).raw.url', async () => {
      const url = await bound.raw.url();
      return url;
    }),
  ];
}
