// ── Server sub-screen shapes ─────────────────────────────────────────────────
// Local to screens/config/server/. The bridge/service shapes it maps to and from live in
// shared/ (bridge/config for now, shared/services/servers after the contract migration).

export type ConnStatus = 'idle' | 'testing' | 'ok' | 'error';
export type AuthStatus = 'idle' | 'loading' | 'ok' | 'error';

// Which row's "⋯" context menu is open, and what it acts on.
export interface MenuState {
  type: 'kavita' | 'bff' | 'apikey';
  id: string;
}

// A Kavita server URL as the sub-screen edits it (strings in the form, parsed on save).
export interface KavitaUrlForm {
  id: string;
  url: string;
}

// A BFF/M3 server as the sub-screen edits it.
export interface BffServerForm {
  id: string;
  url: string;
  path: string;
  linkedKavitaId?: string;
}
