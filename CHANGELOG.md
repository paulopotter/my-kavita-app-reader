# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

App releases use datetime versioning (`YYYY.MM.DD.HHmm`).
Kotlin and RN bundle versions follow Semantic Versioning independently.

## [Unreleased]

### **Backend**

- feat: add Android multi-module scaffold (app, core, tools, features) with Kotlin 2.0.21, Room and Hilt
- feat: add Room v1 database with server config, auth and UI preferences entities
- feat: add active URL selector with parallel candidate probing and 15-min cache
- feat: add ConfigRepository bridge and DbValidatorModule as Native Modules
- feat: add Kavita authentication via apiKey with JWT storage
- feat: add CI/CD pipeline with datetime tag, per-component semver bump and APK publish on GitHub Releases

### **Frontend**

- feat: add React Native 0.75.4 project with TypeScript, ESLint and Metro
- feat: add ConfigScreen with three sections: Kavita Servers, Authentication and Preferences
- feat: add TypeScript bridges (config.ts, db-validator.ts) for native backend communication
