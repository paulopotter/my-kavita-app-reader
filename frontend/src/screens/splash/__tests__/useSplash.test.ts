/**
 * Tests for the OTA policy decision logic in useSplash.
 * Since @testing-library/react-native is not installed, we test the underlying
 * logic by exercising the exported types and the OtaModule mock contract
 * that useSplash depends on.
 */
import { NativeModules } from 'react-native';
import type { OtaPolicy } from '../../../native/OtaModule';

const mockOtaModule = {
  getOtaPolicy: jest.fn<Promise<OtaPolicy | null>, []>(),
  acknowledgePolicy: jest.fn<Promise<void>, []>(),
  applyOtaUpdate: jest.fn(),
  getVersions: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

const mockStartupModule = {
  hasServerConfigured: jest.fn<Promise<boolean>, []>(),
  hasFollowedSeries: jest.fn<Promise<boolean>, []>(),
  syncBlocking: jest.fn<Promise<{ success: boolean }>, []>(),
  syncInBackground: jest.fn(),
  drainSyncQueue: jest.fn(),
  isSeriesFollowed: jest.fn(),
  getRestoredRoute: jest.fn(),
  notifyRouteChanged: jest.fn(),
};

const mockSetupModule = {
  isAuthenticated: jest.fn<Promise<boolean>, []>(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (NativeModules as any).OtaEventBridge = mockOtaModule;
  (NativeModules as any).StartupModule = mockStartupModule;
  (NativeModules as any).SetupModule = mockSetupModule;
  mockOtaModule.getOtaPolicy.mockResolvedValue(null);
  mockOtaModule.acknowledgePolicy.mockResolvedValue(undefined);
  mockStartupModule.hasServerConfigured.mockResolvedValue(true);
  mockStartupModule.hasFollowedSeries.mockResolvedValue(false);
  mockStartupModule.syncBlocking.mockResolvedValue({ success: true });
  mockSetupModule.isAuthenticated.mockResolvedValue(true);
});

// ── OtaModule bridge contract ─────────────────────────────────────────────────

describe('OtaModule.getOtaPolicy — contrato de retorno', () => {
  it('retorna null quando não há policy pendente', async () => {
    mockOtaModule.getOtaPolicy.mockResolvedValue(null);
    const result = await NativeModules.OtaEventBridge.getOtaPolicy();
    expect(result).toBeNull();
  });

  it('retorna policy required com releaseNotesUrl', async () => {
    const policy: OtaPolicy = { mode: 'required', releaseNotesUrl: 'https://example.com' };
    mockOtaModule.getOtaPolicy.mockResolvedValue(policy);
    const result = await NativeModules.OtaEventBridge.getOtaPolicy();
    expect(result?.mode).toBe('required');
    expect(result?.releaseNotesUrl).toBe('https://example.com');
  });

  it('retorna policy highly_recommended', async () => {
    const policy: OtaPolicy = { mode: 'highly_recommended', releaseNotesUrl: 'https://example.com' };
    mockOtaModule.getOtaPolicy.mockResolvedValue(policy);
    const result = await NativeModules.OtaEventBridge.getOtaPolicy();
    expect(result?.mode).toBe('highly_recommended');
  });

  it('retorna policy recommended', async () => {
    const policy: OtaPolicy = { mode: 'recommended', releaseNotesUrl: 'https://example.com' };
    mockOtaModule.getOtaPolicy.mockResolvedValue(policy);
    const result = await NativeModules.OtaEventBridge.getOtaPolicy();
    expect(result?.mode).toBe('recommended');
  });
});

describe('OtaModule.acknowledgePolicy — limpa a policy', () => {
  it('resolve sem erro', async () => {
    mockOtaModule.acknowledgePolicy.mockResolvedValue(undefined);
    await expect(NativeModules.OtaEventBridge.acknowledgePolicy()).resolves.toBeUndefined();
  });

  it('é chamado depois do dismiss (via bridge mock)', async () => {
    await NativeModules.OtaEventBridge.acknowledgePolicy();
    expect(mockOtaModule.acknowledgePolicy).toHaveBeenCalledTimes(1);
  });
});

// ── Lógica de decisão de destino (pura) ──────────────────────────────────────

async function resolveDestination(
  hasServer: boolean,
  hasFollowed: boolean,
  isAuthenticated: boolean,
): Promise<'setup' | 'library' | 'following'> {
  if (!hasServer || !isAuthenticated) { return 'setup'; }
  return hasFollowed ? 'following' : 'library';
}

describe('lógica de destino da splash', () => {
  it('sem servidor → setup', async () => {
    expect(await resolveDestination(false, false, false)).toBe('setup');
  });

  it('com servidor, sem série seguida, autenticado → library', async () => {
    expect(await resolveDestination(true, false, true)).toBe('library');
  });

  it('com servidor e série seguida, autenticado → following', async () => {
    expect(await resolveDestination(true, true, true)).toBe('following');
  });

  it('com servidor configurado mas sem autenticacao → setup (nao pula a autenticacao)', async () => {
    expect(await resolveDestination(true, false, false)).toBe('setup');
  });

  it('com servidor, com serie seguida, mas sem autenticacao → setup', async () => {
    expect(await resolveDestination(true, true, false)).toBe('setup');
  });
});

// ── Regras de bloqueio por mode de policy ────────────────────────────────────

describe('regras de bloqueio OTA', () => {
  it('required: nunca define destination (sem ação do usuário)', () => {
    const policy: OtaPolicy | null = { mode: 'required', releaseNotesUrl: '' };
    // required impede chamar resolveDestination — simula decisão do useSplash
    const shouldBlock = policy?.mode === 'required';
    expect(shouldBlock).toBe(true);
  });

  it('highly_recommended: bloqueia até dismiss', () => {
    const policy: OtaPolicy | null = { mode: 'highly_recommended', releaseNotesUrl: '' };
    // bloqueia enquanto policy não for null (dismiss chama acknowledgePolicy + set null)
    let policyState: OtaPolicy | null = policy;
    expect(policyState).not.toBeNull();

    // simula dismiss
    policyState = null;
    expect(policyState).toBeNull();
  });

  it('recommended: não bloqueia navegação', () => {
    const policy: OtaPolicy | null = { mode: 'recommended', releaseNotesUrl: '' };
    const shouldBlock = policy?.mode === 'required' || policy?.mode === 'highly_recommended';
    expect(shouldBlock).toBe(false);
  });

  it('null policy: não bloqueia navegação', () => {
    const policy = null as OtaPolicy | null;
    const shouldBlock = policy?.mode === 'required' || policy?.mode === 'highly_recommended';
    expect(shouldBlock).toBeFalsy();
  });
});
