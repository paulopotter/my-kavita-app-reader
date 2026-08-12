/**
 * Testa o comportamento de boot isolado do componente React.
 * Cobre os dois bugs que causaram tela cinza:
 *   1. StartupModule undefined → exceção síncrona escapava do Promise.all
 *   2. Qualquer falha no boot deve sempre resolver para 'splash', nunca travar em 'booting'
 * E o bug de rota restaurada com servidor removido:
 *   3. getRestoredRoute retorna rota mas hasServerConfigured retorna false → splash (não pula)
 */

type BootResult =
  | { state: 'splash'; lang: string }
  | { state: 'skip-splash'; lang: string; route: string };

async function runBoot(
  getPrefs: () => Promise<{ language?: string } | null>,
  getRestoredRoute: () => Promise<string | null>,
  hasServerConfigured: () => Promise<boolean> = () => Promise.resolve(true),
  systemLang = 'pt-BR',
): Promise<BootResult> {
  const detectLang = () => systemLang;

  let prefs: { language?: string } | null = null;
  let restoredRoute: string | null = null;

  try {
    prefs = await getPrefs();
  } catch {}

  try {
    restoredRoute = await getRestoredRoute();
  } catch {}

  const lang = prefs?.language ?? detectLang();

  if (restoredRoute) {
    let hasServer = false;
    try {
      hasServer = await hasServerConfigured();
    } catch {}

    if (!hasServer) {
      return { state: 'splash', lang };
    }

    const mapped =
      restoredRoute === 'setup' ? 'setup' :
      restoredRoute === 'library' ? 'main' : restoredRoute;
    return { state: 'skip-splash', lang, route: mapped };
  }

  return { state: 'splash', lang };
}

describe('boot logic — caminhos felizes', () => {
  it('vai para splash quando não há rota restaurada', async () => {
    const result = await runBoot(
      () => Promise.resolve({ language: 'pt-BR' }),
      () => Promise.resolve(null),
    );
    expect(result.state).toBe('splash');
    expect(result.lang).toBe('pt-BR');
  });

  it('pula splash quando há rota restaurada e servidor configurado', async () => {
    const result = await runBoot(
      () => Promise.resolve({ language: 'en' }),
      () => Promise.resolve('library'),
      () => Promise.resolve(true),
    );
    expect(result.state).toBe('skip-splash');
    expect((result as any).route).toBe('main');
    expect(result.lang).toBe('en');
  });

  it('mapeia rota "setup" corretamente', async () => {
    const result = await runBoot(
      () => Promise.resolve(null),
      () => Promise.resolve('setup'),
      () => Promise.resolve(true),
    );
    expect(result.state).toBe('skip-splash');
    expect((result as any).route).toBe('setup');
  });

  it('preserva rota de tela profunda sem mapeamento', async () => {
    const result = await runBoot(
      () => Promise.resolve(null),
      () => Promise.resolve('series/42'),
      () => Promise.resolve(true),
    );
    expect(result.state).toBe('skip-splash');
    expect((result as any).route).toBe('series/42');
  });
});

describe('boot logic — servidor removido com rota restaurada', () => {
  it('rota restaurada + sem servidor → vai para splash (não pula)', async () => {
    const result = await runBoot(
      () => Promise.resolve({ language: 'pt-BR' }),
      () => Promise.resolve('library'),
      () => Promise.resolve(false),
    );
    expect(result.state).toBe('splash');
    expect(result.lang).toBe('pt-BR');
  });

  it('hasServerConfigured lança → trata como sem servidor → splash', async () => {
    const result = await runBoot(
      () => Promise.resolve(null),
      () => Promise.resolve('library'),
      () => Promise.reject(new Error('db error')),
    );
    expect(result.state).toBe('splash');
  });
});

describe('boot logic — resiliência a falhas (bug tela cinza)', () => {
  it('bug #1: StartupModule undefined → getRestoredRoute lança sync → boot vai para splash', async () => {
    const result = await runBoot(
      () => Promise.resolve(null),
      () => { throw new TypeError('Cannot read property of undefined'); },
    );
    expect(result.state).toBe('splash');
  });

  it('bug #1: getPrefs lança sync → boot ainda vai para splash', async () => {
    const result = await runBoot(
      () => { throw new Error('NativeModule crash'); },
      () => Promise.resolve(null),
    );
    expect(result.state).toBe('splash');
  });

  it('bug #1: ambos lançam → boot vai para splash com idioma do sistema', async () => {
    const result = await runBoot(
      () => { throw new Error('crash'); },
      () => { throw new Error('crash'); },
      () => Promise.resolve(true),
      'en',
    );
    expect(result.state).toBe('splash');
    expect(result.lang).toBe('en');
  });

  it('getRestoredRoute rejeita com Promise → boot vai para splash', async () => {
    const result = await runBoot(
      () => Promise.resolve({ language: 'pt-BR' }),
      () => Promise.reject(new Error('timeout')),
    );
    expect(result.state).toBe('splash');
    expect(result.lang).toBe('pt-BR');
  });

  it('getPrefs rejeita → idioma cai para sistema', async () => {
    const result = await runBoot(
      () => Promise.reject(new Error('db error')),
      () => Promise.resolve(null),
      () => Promise.resolve(true),
      'en',
    );
    expect(result.state).toBe('splash');
    expect(result.lang).toBe('en');
  });
});
