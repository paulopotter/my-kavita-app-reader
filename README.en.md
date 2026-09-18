# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> 🇧🇷 [Versão em Português](README.md)

Android manga reader app powered by a [Kavita](https://www.kavitareader.com/) server,
with a React Native UI and over-the-air updates (no APK reinstall required).

> **Status**: early development — no stable release yet.

## Screenshots

![App screens overview](docs/external/screenshots/grid_preview.png)

## Available features

- [x] Splash screen with initial sync and visual progress
- [x] Bottom-tab navigation (Library, Following, Search, Notifications, Settings)
- [x] OTA updates with configurable policies (none, recommended, highly_recommended, required)
- [x] Library screen with sorting and grid/list layouts
- [x] Series screen with chapter list and read marking
- [x] Manga and webtoon reader with reading progress tracking
- [x] Search by name, with a history of the series you opened
- [x] Following series (favourites) in a dedicated tab
- [x] New-chapter notifications
- [x] Settings screen with server management and preferences

## Planned features

- [ ] Multiple simultaneous servers
- [ ] Plugin support for data sources and notification providers

## Installation

Installation guide available in [`docs/`](docs/) and on the
[project site](https://paulopotter.github.io/my-kavita-app-reader).

## Building

```bash
# Install dependencies and validate environment
make setup

# Build debug APK
make build-android

# Build JS bundle
make build-bundle
```

See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for a detailed development environment setup.

## License

Distributed under the [GNU General Public License v3.0](LICENSE).
