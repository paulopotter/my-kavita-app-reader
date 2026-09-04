# Security Policy

> 🇧🇷 [Versão em português](SECURITY.md)

## Supported versions

This project is in early development (no stable release yet) and follows a
single active branch (`main`). Only the most recently published version
receives security fixes.

## Reporting a vulnerability

**Do not open a public issue** for security vulnerabilities — that would
expose the problem before a fix exists.

Instead, use this repository's
[GitHub Security Advisories](https://github.com/paulopotter/my-kavita-app-reader/security/advisories/new)
("Security" → "Report a vulnerability"). The report reaches the maintainer
privately, with room to describe the impact, reproduction steps, and a
suggested fix if you have one.

You can expect an initial response within 7 days. Once a vulnerability is
confirmed, an advisory is published and a fix is released as soon as
possible; credit is given to the reporter unless anonymity is requested.

## Scope

This is a client app for self-hosted [Kavita](https://www.kavitareader.com/)
servers — there's no backend or infrastructure of its own. The security scope
covers this repository's own code (Kotlin/React Native) and CI/CD workflows,
not the user's own Kavita installation.
