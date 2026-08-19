export type Language = 'pt-BR' | 'en';

export interface Strings {
  // ── Config screen ────────────────────────────────────────────────────────
  configTitle: string;
  configLoadError: string;
  configKavitaServers: string;
  configAddServer: string;
  configAuth: string;
  configApiKeySet: string;
  configNoApiKey: string;
  configPreferences: string;
  configKeepScreenOn: string;
  configLanguage: string;
  configLanguagePtBr: string;
  configLanguageEn: string;
  configMenuServer: string;
  configMenuReading: string;
  configMenuChapter: string;
  configChapterSortGroupTitle: string;

  // ── Server form ─────────────────────────────────────────────────────────
  serverFormUrlLabel: string;
  serverFormUrlPlaceholder: string;
  serverFormTimeoutLabel: string;
  serverFormPriorityLabel: string;
  serverFormHealthCheckLabel: string;
  serverFormCancel: string;
  serverFormSave: string;

  // ── Server list ─────────────────────────────────────────────────────────
  serverListEmpty: string;
  serverListPriority: string;
  serverListEdit: string;
  serverListDelete: string;

  // ── API Key form ─────────────────────────────────────────────────────────
  apiKeyChange: string;
  apiKeyPlaceholder: string;
  apiKeyCancel: string;
  apiKeySave: string;

  // ── BFF config ──────────────────────────────────────────────────────────
  bffServers: string;
  bffAddServer: string;
  bffUrlLabel: string;
  bffUrlPlaceholder: string;
  bffLinkKavitaLabel: string;
  bffLinkKavitaNone: string;
  bffPathLabel: string;
  bffPathPlaceholder: string;
  bffAdd: string;
  bffRemove: string;
  bffLinkedTo: string;

  // ── Library screen ───────────────────────────────────────────────────────
  libraryTitle: string;
  libraryLoading: string;
  libraryEmpty: string;
  libraryError: string;
  libraryRetry: string;
  librarySortRecentlyUpdated: string;
  librarySortAlphabetical: string;
  libraryViewGrid: string;
  libraryViewList: string;
  librarySeriesCount: string;

  // ── Following screen ─────────────────────────────────────────────────────
  followingEmpty: string;

  // ── Series card ──────────────────────────────────────────────────────────
  readStatusUnread: string;
  readStatusReading: string;
  readStatusRead: string;
  publicationOngoing: string;
  publicationCompleted: string;
  publicationCancelled: string;
  publicationOnHiatus: string;
  publicationAbandoned: string;
  chaptersFormat: string;
  hasErrors: string;

  // ── Bottom bar ───────────────────────────────────────────────────────────
  bottomBarLibrary: string;
  bottomBarSettings: string;

  // ── Bottom nav (react-navigation tabs) ───────────────────────────────────
  navLibrary: string;
  navFollowing: string;
  navSearch: string;
  navConfig: string;

  // ── Splash screen ─────────────────────────────────────────────────────────
  splashVersion: string;
  splashUpdateButton: string;

  // ── OTA policy dialogs ───────────────────────────────────────────────────
  otaRequiredTitle: string;
  otaRequiredBody: string;
  otaHighlyRecTitle: string;
  otaRecommendedTitle: string;
  otaAdvisoryBody: string;
  otaDismiss: string;
  otaViewNotes: string;

  // ── Version labels ────────────────────────────────────────────────────────
  versionBackend: string;
  versionApp: string;
  versionFrontend: string;

  // ── Setup screen ─────────────────────────────────────────────────────────
  setupTitle: string;
  setupSubtitle: string;
  setupGoToLibrary: string;
  setupTestConnection: string;
  setupForceReselect: string;
  setupTesting: string;
  setupConnectionOk: string;
  setupAuthenticate: string;
  setupAuthenticating: string;
  setupAuthOk: string;
  setupApiKeyLabel: string;
  setupBffSection: string;
  setupBffTestConnection: string;
  setupBffConnectionOk: string;

  // ── Exit dialog ──────────────────────────────────────────────────────────
  exitTitle: string;
  exitMessage: string;
  exitCancel: string;
  exitConfirm: string;

  // ── Series detail screen ─────────────────────────────────────────────────
  seriesDetailLoading: string;
  seriesDetailError: string;
  seriesDetailRetry: string;
  seriesDetailStartReading: string;
  seriesDetailContinueReading: string;
  seriesDetailRereadFromStart: string;
  seriesDetailChaptersRead: string;
  seriesDetailChapterNumberLabel: string;
  seriesDetailChapterUntitled: string;
  seriesDetailSortAscending: string;
  seriesDetailSortDescending: string;
  seriesDetailSortAutoFixed: string;
  seriesDetailSortAutoProgress: string;
  seriesDetailSelectionMarkRead: string;
  seriesDetailSelectionMarkUnread: string;
  seriesDetailSelectionSelectAll: string;
  seriesDetailSelectionInvert: string;
  seriesDetailSortConfigTitle: string;
  seriesDetailSortConfigFixedThresholdLabel: string;
  seriesDetailSortConfigFixedThresholdHint: string;
  seriesDetailSortConfigProgressPercentLabel: string;
  seriesDetailSortConfigProgressPercentHint: string;
  seriesDetailSortConfigCancel: string;
  seriesDetailSortConfigSave: string;
  seriesDetailSortConfigReset: string;
  seriesDetailSortConfigOverrideNote: string;

  // ── Reader screen ────────────────────────────────────────────────────────
  readerLoading: string;
  readerError: string;
  readerRetry: string;
  readerOffline: string;
  readerEndOfChapter: string;
  readerNextChapterLabel: string;
  readerNoNextChapter: string;
  readerNoPrevChapter: string;

  // ── Errors ───────────────────────────────────────────────────────────────
  errorApiKeyEmpty: string;
  errorDbVersionMismatch: string;
  errorDbNotOpen: string;
}

const ptBR: Strings = {
  configTitle: 'Configurações',
  configLoadError: 'Erro ao carregar',
  configKavitaServers: 'Servidores Kavita',
  configAddServer: '+ Adicionar servidor',
  configAuth: 'Autenticação',
  configApiKeySet: 'API Key configurada',
  configNoApiKey: 'Sem API Key',
  configPreferences: 'Preferências',
  configKeepScreenOn: 'Manter tela ligada durante leitura',
  configLanguage: 'Idioma',
  configLanguagePtBr: 'Português',
  configLanguageEn: 'English',
  configMenuServer: 'Servidor',
  configMenuReading: 'Preferências de leitura',
  configMenuChapter: 'Página do mangá',
  configChapterSortGroupTitle: 'Ordenação de capítulos',

  serverFormUrlLabel: 'URL do servidor',
  serverFormUrlPlaceholder: 'http://192.168.1.100:5000',
  serverFormTimeoutLabel: 'Timeout (ms)',
  serverFormPriorityLabel: 'Prioridade',
  serverFormHealthCheckLabel: 'Health check path',
  serverFormCancel: 'Cancelar',
  serverFormSave: 'Salvar',

  serverListEmpty: 'Nenhum servidor configurado',
  serverListPriority: 'Prioridade',
  serverListEdit: 'Editar',
  serverListDelete: 'Excluir',

  apiKeyChange: 'Alterar',
  apiKeyPlaceholder: 'Cole aqui a API key do Kavita',
  apiKeyCancel: 'Cancelar',
  apiKeySave: 'Salvar API Key',

  bffServers: 'Servidor BFF',
  bffAddServer: '+ Adicionar URL do BFF',
  bffUrlLabel: 'URL do BFF',
  bffUrlPlaceholder: 'http://192.168.1.100:8080',
  bffLinkKavitaLabel: 'Vincular a um servidor Kavita (opcional)',
  bffLinkKavitaNone: 'Nenhum',
  bffPathLabel: 'Path da API',
  bffPathPlaceholder: '/manga',
  bffAdd: 'Adicionar',
  bffRemove: 'Remover',
  bffLinkedTo: 'Vinculado a',

  libraryTitle: 'Biblioteca',
  libraryLoading: 'Carregando...',
  libraryEmpty: 'Nenhuma série encontrada',
  libraryError: 'Erro ao carregar a biblioteca',
  libraryRetry: 'Tentar novamente',
  librarySortRecentlyUpdated: 'Atualizado recentemente',
  librarySortAlphabetical: 'Alfabético',
  libraryViewGrid: 'Grade',
  libraryViewList: 'Lista',
  librarySeriesCount: 'séries',

  followingEmpty: 'Nenhuma série seguida. Marque séries na Biblioteca para vê-las aqui.',

  readStatusUnread: 'Não lido',
  readStatusReading: 'Lendo',
  readStatusRead: 'Lido',
  publicationOngoing: 'Em andamento',
  publicationCompleted: 'Completo',
  publicationCancelled: 'Cancelado',
  publicationOnHiatus: 'Hiato',
  publicationAbandoned: 'Abandonado',
  chaptersFormat: 'caps.',
  hasErrors: 'Erros',

  bottomBarLibrary: 'Biblioteca',
  bottomBarSettings: 'Ajustes',

  navLibrary: 'Biblioteca',
  navFollowing: 'Seguindo',
  navSearch: 'Buscar',
  navConfig: 'Ajustes',

  splashVersion: 'v',
  splashUpdateButton: 'Aplicar atualização',

  otaRequiredTitle: 'Atualização obrigatória',
  otaRequiredBody: 'Esta versão não é mais suportada. Para continuar usando o app, acesse as notas de versão e instale a atualização.',
  otaHighlyRecTitle: 'Atualização altamente recomendada',
  otaRecommendedTitle: 'Nova versão disponível',
  otaAdvisoryBody: 'Uma nova versão do app está disponível. Recomendamos atualizar para ter a melhor experiência.',
  otaDismiss: 'Agora não',
  otaViewNotes: 'Ver novidades',

  versionBackend: 'backend',
  versionApp: 'app',
  versionFrontend: 'frontend',

  setupTitle: 'Bem-vindo',
  setupSubtitle: 'Configure seu servidor Kavita para começar.',
  setupGoToLibrary: 'Ir para a Biblioteca',
  setupTestConnection: 'Testar conexão',
  setupForceReselect: 'Forçar reconfiguração',
  setupTesting: 'Testando...',
  setupConnectionOk: 'Conexão OK',
  setupAuthenticate: 'Autenticar',
  setupAuthenticating: 'Autenticando...',
  setupAuthOk: 'Autenticado',
  setupApiKeyLabel: 'API Key do Kavita',
  setupBffSection: 'Servidor BFF (opcional)',
  setupBffTestConnection: 'Testar BFF',
  setupBffConnectionOk: 'BFF OK',

  exitTitle: 'Sair do app',
  exitMessage: 'Deseja fechar o aplicativo?',
  exitCancel: 'Cancelar',
  exitConfirm: 'Sair',

  seriesDetailLoading: 'Carregando...',
  seriesDetailError: 'Erro ao carregar a série',
  seriesDetailRetry: 'Tentar novamente',
  seriesDetailStartReading: 'Começar a ler',
  seriesDetailContinueReading: 'Continuar lendo cap. {0}',
  seriesDetailRereadFromStart: 'Reler',
  seriesDetailChaptersRead: '{0}/{1} lidos',
  seriesDetailChapterNumberLabel: 'Capítulo {0}',
  seriesDetailChapterUntitled: 'Sem título',
  seriesDetailSortAscending: 'Crescente',
  seriesDetailSortDescending: 'Decrescente',
  seriesDetailSortAutoFixed: 'Auto (cap. {0})',
  seriesDetailSortAutoProgress: 'Auto ({0}%)',
  seriesDetailSelectionMarkRead: 'Marcar como lido',
  seriesDetailSelectionMarkUnread: 'Marcar como não lido',
  seriesDetailSelectionSelectAll: 'Selecionar tudo',
  seriesDetailSelectionInvert: 'Inverter seleção',
  seriesDetailSortConfigTitle: 'Ordenação de capítulos',
  seriesDetailSortConfigFixedThresholdLabel: 'Capítulo limiar',
  seriesDetailSortConfigFixedThresholdHint: 'Decrescente a partir deste capítulo',
  seriesDetailSortConfigProgressPercentLabel: 'Percentual de progresso',
  seriesDetailSortConfigProgressPercentHint: 'Decrescente a partir deste percentual (0–100)',
  seriesDetailSortConfigCancel: 'Cancelar',
  seriesDetailSortConfigSave: 'Salvar',
  seriesDetailSortConfigReset: 'Usar padrão do app',
  seriesDetailSortConfigOverrideNote: 'Esta série tem uma ordenação própria, diferente do padrão do app.',

  readerLoading: 'Carregando...',
  readerError: 'Erro ao carregar o capítulo',
  readerRetry: 'Tentar novamente',
  readerOffline: 'Sem conexão',
  readerEndOfChapter: 'Fim do capítulo {0}',
  readerNextChapterLabel: 'Próximo:',
  readerNoNextChapter: 'Não há próximo capítulo',
  readerNoPrevChapter: 'Não há capítulo anterior',

  errorApiKeyEmpty: 'A API key não pode estar vazia',
  errorDbVersionMismatch: 'Versão do banco incompatível',
  errorDbNotOpen: 'Banco de dados não está aberto',
};

const en: Strings = {
  configTitle: 'Settings',
  configLoadError: 'Load error',
  configKavitaServers: 'Kavita Servers',
  configAddServer: '+ Add server',
  configAuth: 'Authentication',
  configApiKeySet: 'API Key set',
  configNoApiKey: 'No API Key',
  configPreferences: 'Preferences',
  configKeepScreenOn: 'Keep screen on while reading',
  configLanguage: 'Language',
  configLanguagePtBr: 'Português',
  configLanguageEn: 'English',
  configMenuServer: 'Server',
  configMenuReading: 'Reading preferences',
  configMenuChapter: 'Manga page',
  configChapterSortGroupTitle: 'Chapter sort order',

  serverFormUrlLabel: 'Server URL',
  serverFormUrlPlaceholder: 'http://192.168.1.100:5000',
  serverFormTimeoutLabel: 'Timeout (ms)',
  serverFormPriorityLabel: 'Priority',
  serverFormHealthCheckLabel: 'Health check path',
  serverFormCancel: 'Cancel',
  serverFormSave: 'Save',

  serverListEmpty: 'No servers configured',
  serverListPriority: 'Priority',
  serverListEdit: 'Edit',
  serverListDelete: 'Delete',

  apiKeyChange: 'Change',
  apiKeyPlaceholder: 'Paste your Kavita API key here',
  apiKeyCancel: 'Cancel',
  apiKeySave: 'Save API Key',

  bffServers: 'BFF Server',
  bffAddServer: '+ Add BFF URL',
  bffUrlLabel: 'BFF URL',
  bffUrlPlaceholder: 'http://192.168.1.100:8080',
  bffLinkKavitaLabel: 'Link to a Kavita server (optional)',
  bffLinkKavitaNone: 'None',
  bffPathLabel: 'API path',
  bffPathPlaceholder: '/manga',
  bffAdd: 'Add',
  bffRemove: 'Remove',
  bffLinkedTo: 'Linked to',

  libraryTitle: 'Library',
  libraryLoading: 'Loading...',
  libraryEmpty: 'No series found',
  libraryError: 'Failed to load library',
  libraryRetry: 'Try again',
  librarySortRecentlyUpdated: 'Recently updated',
  librarySortAlphabetical: 'Alphabetical',
  libraryViewGrid: 'Grid',
  libraryViewList: 'List',
  librarySeriesCount: 'series',

  followingEmpty: 'No series followed. Star series in the Library to see them here.',

  readStatusUnread: 'Unread',
  readStatusReading: 'Reading',
  readStatusRead: 'Read',
  publicationOngoing: 'Ongoing',
  publicationCompleted: 'Completed',
  publicationCancelled: 'Cancelled',
  publicationOnHiatus: 'On hiatus',
  publicationAbandoned: 'Abandoned',
  chaptersFormat: 'chs.',
  hasErrors: 'Errors',

  bottomBarLibrary: 'Library',
  bottomBarSettings: 'Settings',

  navLibrary: 'Library',
  navFollowing: 'Following',
  navSearch: 'Search',
  navConfig: 'Settings',

  splashVersion: 'v',
  splashUpdateButton: 'Apply update',

  otaRequiredTitle: 'Mandatory update',
  otaRequiredBody: 'This version is no longer supported. To continue using the app, view the release notes and install the update.',
  otaHighlyRecTitle: 'Highly recommended update',
  otaRecommendedTitle: 'New version available',
  otaAdvisoryBody: 'A new version of the app is available. We recommend updating for the best experience.',
  otaDismiss: 'Not now',
  otaViewNotes: 'View release notes',

  versionBackend: 'backend',
  versionApp: 'app',
  versionFrontend: 'frontend',

  setupTitle: 'Welcome',
  setupSubtitle: 'Set up your Kavita server to get started.',
  setupGoToLibrary: 'Go to Library',
  setupTestConnection: 'Test connection',
  setupForceReselect: 'Force reselect',
  setupTesting: 'Testing...',
  setupConnectionOk: 'Connection OK',
  setupAuthenticate: 'Authenticate',
  setupAuthenticating: 'Authenticating...',
  setupAuthOk: 'Authenticated',
  setupApiKeyLabel: 'Kavita API Key',
  setupBffSection: 'BFF Server (optional)',
  setupBffTestConnection: 'Test BFF',
  setupBffConnectionOk: 'BFF OK',

  exitTitle: 'Exit app',
  exitMessage: 'Do you want to close the app?',
  exitCancel: 'Cancel',
  exitConfirm: 'Exit',

  seriesDetailLoading: 'Loading...',
  seriesDetailError: 'Failed to load series',
  seriesDetailRetry: 'Try again',
  seriesDetailStartReading: 'Start reading',
  seriesDetailContinueReading: 'Continue reading ch. {0}',
  seriesDetailRereadFromStart: 'Reread',
  seriesDetailChaptersRead: '{0}/{1} read',
  seriesDetailChapterNumberLabel: 'Chapter {0}',
  seriesDetailChapterUntitled: 'Untitled',
  seriesDetailSortAscending: 'Ascending',
  seriesDetailSortDescending: 'Descending',
  seriesDetailSortAutoFixed: 'Auto (ch. {0})',
  seriesDetailSortAutoProgress: 'Auto ({0}%)',
  seriesDetailSelectionMarkRead: 'Mark as read',
  seriesDetailSelectionMarkUnread: 'Mark as unread',
  seriesDetailSelectionSelectAll: 'Select all',
  seriesDetailSelectionInvert: 'Invert selection',
  seriesDetailSortConfigTitle: 'Chapter sort order',
  seriesDetailSortConfigFixedThresholdLabel: 'Threshold chapter',
  seriesDetailSortConfigFixedThresholdHint: 'Descending from this chapter onward',
  seriesDetailSortConfigProgressPercentLabel: 'Progress percentage',
  seriesDetailSortConfigProgressPercentHint: 'Descending from this percentage onward (0–100)',
  seriesDetailSortConfigCancel: 'Cancel',
  seriesDetailSortConfigSave: 'Save',
  seriesDetailSortConfigReset: 'Use app default',
  seriesDetailSortConfigOverrideNote: 'This series has its own sort order, different from the app default.',

  readerLoading: 'Loading...',
  readerError: 'Failed to load chapter',
  readerRetry: 'Retry',
  readerOffline: 'No connection',
  readerEndOfChapter: 'End of chapter {0}',
  readerNextChapterLabel: 'Next:',
  readerNoNextChapter: 'No next chapter',
  readerNoPrevChapter: 'No previous chapter',

  errorApiKeyEmpty: 'API key cannot be empty',
  errorDbVersionMismatch: 'Database version mismatch',
  errorDbNotOpen: 'Database is not open',
};

export const allStrings: Record<Language, Strings> = { 'pt-BR': ptBR, en };

export function getStrings(language: string): Strings {
  return allStrings[(language as Language)] ?? ptBR;
}
