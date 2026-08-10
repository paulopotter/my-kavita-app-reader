# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

App releases use datetime versioning (`YYYY.MM.DD.HHmm`).
Kotlin and RN bundle versions follow Semantic Versioning independently.

## [Unreleased]

Primeira versão utilizável do app com tela de configuração completa, autenticação Kavita e pipeline de CI/CD com distribuição automática de APK.
First usable version of the app with complete configuration screen, Kavita authentication and CI/CD pipeline with automatic APK distribution.

### **Backend** — `0.1.0`

**[pt-BR]**
- Adicionado scaffold Android multi-módulo (`app`, `core`, `tools`, `features`) com Kotlin 2.0.21, Room e Hilt
- Adicionado banco de dados Room v1 com entidades de configuração de servidor, autenticação e preferências de UI
- Adicionado seletor de URL ativa com probe paralelo de candidatos e cache de 15 minutos
- Adicionada bridge de configuração (`ConfigRepository`) e validador de banco (`DbValidatorModule`) como Native Modules
- Adicionada autenticação Kavita via `apiKey` com armazenamento de JWT
- Adicionada pipeline de CI/CD com geração automática de tag datetime, bump semver por componente e publicação de APK no GitHub Releases

**[en]**
- Added Android multi-module scaffold (`app`, `core`, `tools`, `features`) with Kotlin 2.0.21, Room and Hilt
- Added Room v1 database with server config, authentication and UI preferences entities
- Added active URL selector with parallel candidate probing and 15-minute cache
- Added config bridge (`ConfigRepository`) and database validator (`DbValidatorModule`) as Native Modules
- Added Kavita authentication via `apiKey` with JWT storage
- Added CI/CD pipeline with automatic datetime tag generation, per-component semver bump and APK publishing to GitHub Releases

### **Frontend** — `0.1.0`

**[pt-BR]**
- Adicionado projeto React Native 0.75.4 com TypeScript, ESLint e Metro configurados
- Adicionada `ConfigScreen` com três seções: Servidores Kavita, Autenticação e Preferências
- Adicionadas bridges TypeScript (`config.ts`, `db-validator.ts`) para comunicação com o backend nativo

**[en]**
- Added React Native 0.75.4 project with TypeScript, ESLint and Metro configured
- Added `ConfigScreen` with three sections: Kavita Servers, Authentication and Preferences
- Added TypeScript bridges (`config.ts`, `db-validator.ts`) for native backend communication
