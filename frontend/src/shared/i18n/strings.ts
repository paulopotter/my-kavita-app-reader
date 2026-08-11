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

  errorApiKeyEmpty: 'API key cannot be empty',
  errorDbVersionMismatch: 'Database version mismatch',
  errorDbNotOpen: 'Database is not open',
};

export const allStrings: Record<Language, Strings> = { 'pt-BR': ptBR, en };

export function getStrings(language: string): Strings {
  return allStrings[(language as Language)] ?? ptBR;
}
