# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> 🇧🇷 [Versão em Português](README.md)

Android manga reader app powered by a [Kavita](https://www.kavitareader.com/) server,
with a React Native UI and over-the-air updates (no APK reinstall required).

> **Status**: early development — no stable release yet.

## Screenshots

![App screens overview](docs/external/screenshots/grid_preview.png)

## Planned features

- [ ] Manga reader with reading progress tracking
- [ ] New-chapter notifications
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
