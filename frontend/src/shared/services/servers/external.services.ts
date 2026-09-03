import {
  ExternalMetadataBridge,
  type ExternalMetadataActiveInfo,
  type ExternalMetadataGroupFullInfo,
  type ExternalMetadataGroupInfo,
  type ExternalMetadataUrlInfo,
} from '../../bridge/external';
import type { ProviderInfo, UrlProbeResult } from '../../bridge/server';
import { Methods } from '../../tools/methods';

// Layer 4 — thin wrapper over ExternalMetadataBridge (ExternalMetadataServer, Layer 2). Same
// shape as ServersService/ServerService (servers.services.ts) — this file only covers the
// "server" surface of ExternalMetadataServer (providers/groups/urls/active); match/matches (the
// actual BFF/M3 data) live in SerialsService/SerialService instead, per the same-domain
// composition already used for Server's own content methods.
export const ExternalsService = {
  providers: {
    list(): Promise<ProviderInfo[]> {
      return ExternalMetadataBridge.listProviders();
    },
  },
  groups: {
    list(): Promise<ExternalMetadataGroupInfo[]> {
      return ExternalMetadataBridge.listGroups();
    },
  },
};

// Every method that takes an argument uses a single named-argument object (never positional
// params) — same convention as ServerService, lets bound() merge in the fixed groupId.
export const ExternalService = {
  group: {
    get({ groupId }: { groupId: string }): Promise<ExternalMetadataGroupInfo | null> {
      return ExternalMetadataBridge.getGroup(groupId);
    },
    getInfo({ groupId }: { groupId: string }): Promise<ExternalMetadataGroupFullInfo> {
      return ExternalMetadataBridge.getGroupInfo(groupId);
    },
    // Not bindable by groupId — a group doesn't exist yet when this is called, there is no id to
    // fix. Excluded by name from ExternalService.bound() (see below).
    add({
      name,
      providerId,
      credentialsJson,
      healthCheckPath,
      linkedServerGroupId,
    }: {
      name: string;
      providerId: string;
      credentialsJson: string;
      healthCheckPath: string;
      linkedServerGroupId?: string;
    }): Promise<ExternalMetadataGroupInfo> {
      return ExternalMetadataBridge.addGroup(name, providerId, credentialsJson, healthCheckPath, linkedServerGroupId);
    },
    update({
      groupId,
      name,
      credentialsJson,
      healthCheckPath,
      linkedServerGroupId,
    }: {
      groupId: string;
      name?: string;
      credentialsJson?: string;
      healthCheckPath?: string;
      linkedServerGroupId?: string;
    }): Promise<ExternalMetadataGroupInfo> {
      return ExternalMetadataBridge.updateGroup(groupId, name, credentialsJson, healthCheckPath, linkedServerGroupId);
    },
    remove({ groupId }: { groupId: string }): Promise<void> {
      return ExternalMetadataBridge.removeGroup(groupId);
    },
    active: {
      set({ groupId }: { groupId: string }): Promise<void> {
        return ExternalMetadataBridge.setActiveGroup(groupId);
      },
      // Takes no arguments at all — nothing to bind, nothing for a caller to ever supply.
      get(): Promise<string | null> {
        return ExternalMetadataBridge.getActiveGroupId();
      },
    },
  },
  urls: {
    list({ groupId }: { groupId: string }): Promise<ExternalMetadataUrlInfo[]> {
      return ExternalMetadataBridge.getGroupUrls(groupId);
    },
    add({
      groupId,
      url,
      timeoutMs,
      priority,
      linkedServerUrlId,
    }: {
      groupId: string;
      url: string;
      timeoutMs: number;
      priority: number;
      linkedServerUrlId?: string;
    }): Promise<ExternalMetadataUrlInfo> {
      return ExternalMetadataBridge.addGroupUrl(groupId, url, timeoutMs, priority, linkedServerUrlId);
    },
    update({
      groupId,
      urlId,
      url,
      timeoutMs,
      priority,
      linkedServerUrlId,
    }: {
      groupId: string;
      urlId: string;
      url?: string;
      timeoutMs?: number;
      priority?: number;
      linkedServerUrlId?: string;
    }): Promise<ExternalMetadataUrlInfo> {
      return ExternalMetadataBridge.updateGroupUrl(
        groupId,
        urlId,
        url,
        timeoutMs ?? -1,
        priority ?? -1,
        linkedServerUrlId,
      );
    },
    remove({ groupId, urlId }: { groupId: string; urlId: string }): Promise<void> {
      return ExternalMetadataBridge.removeGroupUrl(groupId, urlId);
    },
    // Re-tests every URL and switches the active one. The group section's "test connection".
    validate({ groupId }: { groupId: string }): Promise<ExternalMetadataUrlInfo> {
      return ExternalMetadataBridge.validateGroupUrls(groupId);
    },
    // Point check on one URL — reachable now? — without changing which URL is active. The
    // per-URL modal's "test connection".
    test({ groupId, url }: { groupId: string; url: string }): Promise<UrlProbeResult> {
      return ExternalMetadataBridge.testGroupUrl(groupId, url);
    },
    active: {
      get({ groupId }: { groupId: string }): Promise<ExternalMetadataUrlInfo | null> {
        return ExternalMetadataBridge.getGroupActive(groupId);
      },
    },
  },
  auth: {
    reauthenticate({ groupId }: { groupId: string }): Promise<void> {
      return ExternalMetadataBridge.reauthenticateActiveGroup(groupId);
    },
  },
  active: {
    getUrl(): Promise<ExternalMetadataUrlInfo | null> {
      return ExternalMetadataBridge.getActive();
    },
    getInfo(): Promise<ExternalMetadataActiveInfo | null> {
      return ExternalMetadataBridge.getActiveInfo();
    },
    getGroupInfo(): Promise<ExternalMetadataGroupFullInfo | null> {
      return ExternalMetadataBridge.getActiveGroupInfo();
    },
  },
  // bound({groupId}) fixes only the id (object-merge underneath, via Methods.bound) — see
  // servers.services.ts for the same pattern and rationale. `group.add` is excluded (skipKeys)
  // since it doesn't take a groupId at all — a group doesn't exist yet when it's called.
  // `group.active.get()`/`active.*` take no argument at all, so binding leaves them unchanged.
  bound(fixed: { groupId: string }) {
    return Methods.bound(ExternalService, ['add'], fixed);
  },
};
