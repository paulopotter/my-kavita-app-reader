# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao / and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

<!--
Exemplo de entrada / Entry example:

### 0.1.0 - 2026-01-01

[pt-BR]
- Descrição da mudança

[en]
- Change description
-->

## [0.1.0] - 2026-08-09

[pt-BR]

### Adicionado

- **Scaffold Android multi-módulo** (`app`, `core`, `tools`, `features`) com AGP 8.13.2, Kotlin 2.2.21, KSP 2.2.21-2.0.5, Gradle 8.14.1
- **Banco de dados Room v1** (`AppDatabase`) com entidades `ServerConfigEntity`, `AuthConfigEntity`, `UiPreferencesEntity` e DAOs correspondentes
- **Script de geração de migration** (`scripts/generate-migration.sh`) e validação de paridade de schema via hook pré-commit
- **Seleção ativa de URL** (`ActiveUrlSelector`) com probe paralelo de candidatos e cache de 15 min
- **Bridge de configuração** (`ConfigRepository` Native Module) + `ConfigStore` (lógica pura testável com Hilt)
- **Validador de banco** (`DbValidatorModule` Native Module) expondo versão e estado aberto do Room
- **KavitaUrlSelector**: mapeia `ServerConfigEntity` → `UrlCandidate`, encapsulando a lógica de prioridade/timeout
- **KavitaAuthFeature**: autenticação via `/api/Plugin/authenticate` com `apiKey`, armazenamento de JWT e limpeza de auth
- **Wiring completo de DI** com Hilt no `MainApplication`; `AppReactPackage` registra os dois Native Modules
- **Frontend React Native** com TypeScript 5.9.3, ESLint e Metro configurados
- **Bridge TypeScript** (`config.ts`, `db-validator.ts`) com tipos `ServerConfig`, `AuthConfig`, `UiPreferences`, `DbStatus`
- **ConfigService + ConfigTransform**: lógica de carga/gravação e transformação entre form e entidade nativa
- **useConfig hook** com `useReducer` para gerenciar estado da tela de configuração
- **ConfigScreen**: três seções (Servidores Kavita, Autenticação, Preferências) com edição inline
- **Makefile** com targets `setup`, `test`, `lint`, `build`; `make setup` instala git hooks automaticamente
- **Git hooks** pré-commit (paridade de schema Room, sem paths absolutos de máquina) e commit-msg (Conventional Commits)

[en]

### Added

- **Android multi-module scaffold** (`app`, `core`, `tools`, `features`) with AGP 8.13.2, Kotlin 2.2.21, KSP 2.2.21-2.0.5, Gradle 8.14.1
- **Room v1 database** (`AppDatabase`) with `ServerConfigEntity`, `AuthConfigEntity`, `UiPreferencesEntity` entities and matching DAOs
- **Migration generation script** (`scripts/generate-migration.sh`) and schema parity validation via pre-commit hook
- **Active URL selection** (`ActiveUrlSelector`) with parallel candidate probing and 15-min cache
- **Config bridge** (`ConfigRepository` Native Module) + `ConfigStore` (pure testable logic with Hilt)
- **Database validator** (`DbValidatorModule` Native Module) exposing Room version and open state
- **KavitaUrlSelector**: maps `ServerConfigEntity` → `UrlCandidate`, encapsulating priority/timeout logic
- **KavitaAuthFeature**: authentication via `/api/Plugin/authenticate` with `apiKey`, JWT storage and auth cleanup
- **Full Hilt DI wiring** in `MainApplication`; `AppReactPackage` registers both Native Modules
- **React Native frontend** with TypeScript 5.9.3, ESLint and Metro configured
- **TypeScript bridge** (`config.ts`, `db-validator.ts`) with `ServerConfig`, `AuthConfig`, `UiPreferences`, `DbStatus` types
- **ConfigService + ConfigTransform**: load/save logic and form-to-native entity transformation
- **useConfig hook** with `useReducer` to manage Config screen state
- **ConfigScreen**: three sections (Kavita Servers, Authentication, Preferences) with inline editing
- **Makefile** with `setup`, `test`, `lint`, `build` targets; `make setup` installs git hooks automatically
- **Git hooks** pre-commit (Room schema parity, no machine-absolute paths) and commit-msg (Conventional Commits)
