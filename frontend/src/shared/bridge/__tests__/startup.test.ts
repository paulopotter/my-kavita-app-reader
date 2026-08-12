import { NativeModules } from 'react-native';
import { StartupBridge } from '../startup';

const mockModule = {
  hasServerConfigured: jest.fn(),
  hasFollowedSeries: jest.fn(),
  syncBlocking: jest.fn(),
  syncInBackground: jest.fn(),
  drainSyncQueue: jest.fn(),
  isSeriesFollowed: jest.fn(),
  getRestoredRoute: jest.fn(),
  notifyRouteChanged: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (NativeModules as any).StartupModule = mockModule;
});

describe('StartupBridge — módulo nativo disponível', () => {
  it('hasServerConfigured delega para o módulo nativo', async () => {
    mockModule.hasServerConfigured.mockResolvedValue(true);
    await expect(StartupBridge.hasServerConfigured()).resolves.toBe(true);
    expect(mockModule.hasServerConfigured).toHaveBeenCalledTimes(1);
  });

  it('getRestoredRoute retorna null quando nativo retorna null', async () => {
    mockModule.getRestoredRoute.mockResolvedValue(null);
    await expect(StartupBridge.getRestoredRoute()).resolves.toBeNull();
  });

  it('getRestoredRoute retorna a rota quando há rota salva', async () => {
    mockModule.getRestoredRoute.mockResolvedValue('library');
    await expect(StartupBridge.getRestoredRoute()).resolves.toBe('library');
  });

  it('notifyRouteChanged passa null como rootRoute quando omitido', async () => {
    mockModule.notifyRouteChanged.mockResolvedValue(null);
    await StartupBridge.notifyRouteChanged('library', true);
    expect(mockModule.notifyRouteChanged).toHaveBeenCalledWith('library', true, null);
  });

  it('notifyRouteChanged passa rootRoute quando fornecido', async () => {
    mockModule.notifyRouteChanged.mockResolvedValue(null);
    await StartupBridge.notifyRouteChanged('library', true, 'library');
    expect(mockModule.notifyRouteChanged).toHaveBeenCalledWith('library', true, 'library');
  });

  it('syncBlocking retorna resultado do nativo', async () => {
    mockModule.syncBlocking.mockResolvedValue({ success: true });
    await expect(StartupBridge.syncBlocking()).resolves.toEqual({ success: true });
  });

  it('isSeriesFollowed retorna valor do nativo', async () => {
    mockModule.isSeriesFollowed.mockResolvedValue(false);
    await expect(StartupBridge.isSeriesFollowed('42')).resolves.toBe(false);
    expect(mockModule.isSeriesFollowed).toHaveBeenCalledWith('42');
  });
});

describe('StartupBridge — StartupModule ausente (APK antigo, bug tela cinza)', () => {
  beforeEach(() => {
    delete (NativeModules as any).StartupModule;
  });

  it('hasServerConfigured lança erro descritivo em vez de crash opaco', async () => {
    await expect(StartupBridge.hasServerConfigured()).rejects.toThrow('StartupModule not available');
  });

  it('getRestoredRoute lança erro descritivo', async () => {
    await expect(StartupBridge.getRestoredRoute()).rejects.toThrow('StartupModule not available');
  });

  it('syncBlocking lança erro descritivo', async () => {
    await expect(StartupBridge.syncBlocking()).rejects.toThrow('StartupModule not available');
  });

  it('notifyRouteChanged lança erro descritivo', async () => {
    await expect(StartupBridge.notifyRouteChanged('library', true)).rejects.toThrow(
      'StartupModule not available',
    );
  });
});
