# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

App releases use datetime versioning (`YYYY.MM.DD.HHmm`).
Kotlin and RN bundle versions follow Semantic Versioning independently.

## [Unreleased]

### **Backend**

- Adicionado scaffold Android multi-módulo (`app`, `core`, `tools`, `features`) com Kotlin 2.0.21, Room e Hilt
- Adicionado banco de dados Room v1 com entidades de configuração de servidor, autenticação e preferências de UI
- Adicionado seletor de URL ativa com probe paralelo de candidatos e cache de 15 minutos
- Adicionada bridge de configuração (`ConfigRepository`) e validador de banco (`DbValidatorModule`) como Native Modules
- Adicionada autenticação Kavita via `apiKey` com armazenamento de JWT
- Adicionada pipeline de CI/CD com geração automática de tag datetime, bump semver por componente e publicação de APK no GitHub Releases

### **Frontend**

- Adicionado projeto React Native 0.75.4 com TypeScript, ESLint e Metro configurados
- Adicionada `ConfigScreen` com três seções: Servidores Kavita, Autenticação e Preferências
- Adicionadas bridges TypeScript (`config.ts`, `db-validator.ts`) para comunicação com o backend nativo
