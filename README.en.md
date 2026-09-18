# My Manga Reader

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> 🇧🇷 [Versão em Português](README.md)

Android manga reader app powered by a [Kavita](https://www.kavitareader.com/) server,
with a React Native UI and over-the-air updates (no APK reinstall required).

## Screenshots

![App screens overview](docs/external/screenshots/grid_preview.png)

## Features

| Symbol | Meaning |
|:---:|---|
| ✅ | Available |
| ⚠️ | Available, but needs a manual build — it depends on settings in `android/local.properties`, which is not version-controlled, so the release APK ships without those values |
| — | Planned |

| Feature | | Notes |
|---|:---:|---|
| Splash screen with initial sync and visual progress | ✅ | |
| Bottom-tab navigation (Library, Following, Search, Notifications, Settings) | ✅ | |
| Library with sorting and grid/list layouts | ✅ | |
| Series screen with chapter list and read marking | ✅ | |
| Manga and webtoon reader with reading progress tracking | ✅ | |
| Search by name, with a history of the series you opened | ✅ | |
| Following series (favourites) in a dedicated tab | ✅ | |
| Settings with server management and preferences | ✅ | |
| OTA updates with configurable policies | ✅ | none, recommended, highly_recommended, required |
| New-chapter notifications | ⚠️ | Needs `NTFY_URL` and `NTFY_TOPIC` |
| Opening Kavita links straight in the app (deep links) | ⚠️ | Needs `deeplink.host1` / `deeplink.host2` |
| External series metadata | ✅ | Optional; the server is configured in-app, no build needed |
| Multiple simultaneous servers | — | |
| Plugins for data sources and notification providers | — | |

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
