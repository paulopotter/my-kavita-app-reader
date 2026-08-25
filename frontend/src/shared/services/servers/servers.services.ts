import {
  ServerBridge,
  type ProviderInfo,
  type ServerGroupInfo,
  type ServerUrlInfo,
} from '../../bridge/server';
import { Methods } from '../../tools/methods';
import { ExternalService } from './external.services';

// Layer 4 — thin wrapper over ServerBridge (Server, Layer 2). No cache, no transformation:
// callers get the raw shapes exactly as Server produced them. ServersService (plural) is the
// batch namespace: listing providers/groups, both taking no arguments. ServerService (singular,
// below) is a specific group's management surface — its own group/urls/auth sub-resources.
export const ServersService = {
  providers: {
    list(): Promise<ProviderInfo[]> {
      return ServerBridge.listProviders();
    },
  },
  groups: {
    list(): Promise<ServerGroupInfo[]> {
      return ServerBridge.listGroups();
    },
  },
};

// Every method that takes an argument uses a single named-argument object (never positional
// params) — this is what lets bound() merge in the fixed groupId without needing to know each
// method's parameter order.
export const ServerService = {
  group: {
    get({ groupId }: { groupId: string }): Promise<ServerGroupInfo | null> {
      return ServerBridge.getGroup(groupId);
    },
    // Not bindable by groupId — a group doesn't exist yet when this is called, there is no id to
    // fix. Excluded by name from ServerService.bound() (see below).
    add({
      name,
      providerId,
      credentialsJson,
      healthCheckPath,
    }: {
      name: string;
      providerId: string;
      credentialsJson: string;
      healthCheckPath: string;
    }): Promise<ServerGroupInfo> {
      return ServerBridge.addGroup(name, providerId, credentialsJson, healthCheckPath);
    },
    update({
      groupId,
      name,
      credentialsJson,
      healthCheckPath,
    }: {
      groupId: string;
      name?: string;
      credentialsJson?: string;
      healthCheckPath?: string;
    }): Promise<ServerGroupInfo> {
      return ServerBridge.updateGroup(groupId, name, credentialsJson, healthCheckPath);
    },
    remove({ groupId }: { groupId: string }): Promise<void> {
      return ServerBridge.removeGroup(groupId);
    },
    active: {
      set({ groupId }: { groupId: string }): Promise<void> {
        return ServerBridge.setActiveGroup(groupId);
      },
      // Takes no arguments at all — nothing to bind, nothing for a caller to ever supply.
      get(): Promise<string | null> {
        return ServerBridge.getActiveGroupId();
      },
    },
  },
  urls: {
    list({ groupId }: { groupId: string }): Promise<ServerUrlInfo[]> {
      return ServerBridge.getGroupUrls(groupId);
    },
    add({
      groupId,
      url,
      timeoutMs,
      priority,
    }: {
      groupId: string;
      url: string;
      timeoutMs: number;
      priority: number;
    }): Promise<ServerUrlInfo> {
      return ServerBridge.addGroupUrl(groupId, url, timeoutMs, priority);
    },
    update({
      groupId,
      urlId,
      url,
      timeoutMs,
      priority,
    }: {
      groupId: string;
      urlId: string;
      url?: string;
      timeoutMs?: number;
      priority?: number;
    }): Promise<ServerUrlInfo> {
      return ServerBridge.updateGroupUrl(groupId, urlId, url, timeoutMs, priority);
    },
    remove({ groupId, urlId }: { groupId: string; urlId: string }): Promise<void> {
      return ServerBridge.removeGroupUrl(groupId, urlId);
    },
    validate({ groupId }: { groupId: string }): Promise<ServerUrlInfo> {
      return ServerBridge.validateGroupUrls(groupId);
    },
  },
  auth: {
    reauthenticate({ groupId }: { groupId: string }): Promise<void> {
      return ServerBridge.reauthenticateActiveGroup(groupId);
    },
  },
  // The BFF/M3 "server" surface — same generalizer shape as Server itself, own module
  // (:external-metadata-server), exposed here as a sibling namespace rather than a separate
  // top-level service, since it's conceptually "another kind of server" the app talks to.
  external: ExternalService,
  // bound({groupId}) fixes only the id (object-merge underneath, via Methods.bound) — see
  // serials.services.ts for the same pattern and rationale. `group.add` is excluded (skipKeys)
  // since it doesn't take a groupId at all — a group doesn't exist yet when it's called.
  // `active.get()` takes no argument at all, so binding leaves it unchanged. `external` is its
  // own independent service (its groupId is a different id than this ServerService's own),
  // excluded from binding here — call ExternalService.bound({groupId}) directly instead.
  bound(fixed: { groupId: string }) {
    return Methods.bound(ServerService, ['add', 'external'], fixed);
  },
};
