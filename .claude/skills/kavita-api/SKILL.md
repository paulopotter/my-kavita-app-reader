---
name: kavita-api
description: Reference for the Kavita server's REST API contract — endpoints, HTTP methods, auth flow, request bodies, and response DTO shapes, sourced from Kavita's official OpenAPI spec (v0.9.0.22). This skill is knowledge-only — it never calls the network and never manages/administers a Kavita instance. Use it whenever you need to know how the Kavita API actually behaves: implementing or reviewing a new DataSource, debugging a response-parsing bug, designing a domain abstraction that currently leaks Kavita specifics, checking whether a field is nullable, or building an example JSON response for a given endpoint. Trigger this proactively any time Kavita's HTTP API, endpoint paths (`/api/Series/...`, `/api/Reader/...`, etc.), or its DTOs come up — even if the user just says "what does the series endpoint return" without naming Kavita explicitly, if the context is this app's backend integration.
---

# Kavita API Reference

Kavita is the self-hosted manga/comics server this app's Android client talks to. This skill is a
**read-only contract reference** — it tells you what the Kavita API looks like (paths, verbs,
headers, request/response JSON shapes). It does not install, configure, or operate a Kavita
server, and it never makes HTTP calls itself. If the user wants to actually manage a Kavita
instance (libraries, users, scanning), that's out of scope here — point them at the Kavita admin
UI or docs instead.

Two reasons this exists as a skill rather than "just read the source": (1) the app's Kotlin
features (`android/features/src/main/kotlin/com/mymangareader/features/kavita/`) only exercise a
small slice of the API — Auth, Health, Series, Reader/Chapter — and the project's current
restructuring plan (`.claude/sessions/active/017 - Reestruturacao/`) is actively working to
isolate that coupling behind a `DataSource` abstraction, which means you'll often need to know
about endpoints the app *doesn't* use yet; (2) `openapi.json` itself is ~900KB and deeply
self-referential (DTOs nest DTOs nest DTOs), so reading it raw burns a lot of context for a small
answer.

## How this skill is organized

- `references/_index.md` — full list of the 44 API tags (Series, Reader, Library, Account, …)
  with endpoint counts and filenames. Start here if you don't know which file has what you need.
- `references/<tag>.md` — one file per Kavita API tag (lowercased), e.g. `series.md`, `reader.md`,
  `chapter.md`, `library.md`, `plugin.md`. Each entry has the HTTP method, path, summary,
  parameters, request body shape, and response shape per status code.
- `references/schemas.md` — every DTO referenced by any endpoint file, resolved **once** here.
  Endpoint files don't inline full DTO bodies (Kavita's `SeriesDto` alone is ~50 fields and gets
  reused in dozens of endpoints) — they just name the type (e.g. `[SeriesDto]`) and list
  `**See schemas:** SeriesDto, MangaFormat` at the bottom. Look the name up in `schemas.md`.
- `references/raw/openapi.json` — the full spec Kavita publishes, unmodified, for the rare case
  where the summarized `.md` files lost something you need (e.g. an exact enum's numeric values,
  a field's `format`, or a tag not worth its own summary). Prefer the `.md` files first; this is
  the fallback, not the starting point.

This split exists so you load only what's relevant: reading `series.md` (~20KB) plus one or two
lookups in `schemas.md` is far cheaper than parsing the full spec, and still gives exact shapes
instead of guessing from memory.

## Workflow

1. Figure out the tag (domain) the question is about — series, chapter/reader, library, auth,
   collections, reading lists, etc. Check `references/_index.md` if unsure.
2. Read `references/<tag>.md` for the endpoint(s) in question.
3. For any `SomeDto` / `SomeEnum` name that shows up in a shape or under **See schemas:**, look it
   up in `references/schemas.md` rather than assuming its fields.
4. If something is still missing or ambiguous (e.g. you need to confirm an enum's underlying int
   values, or a tag wasn't summarized in enough depth), grep `references/raw/openapi.json` for the
   exact path or schema name as a last resort.
5. When asked to "build an example response," construct realistic JSON from the resolved shape —
   pick plausible values per field type (real-looking series names, ISO date-times, small integer
   IDs), not placeholder text like `"string"` unless the user wants a literal type stub.

## Auth — how it actually works (read this before touching any endpoint)

The OpenAPI spec's top-level description says auth is via an `x-api-key` header. **That's the
Swagger UI convenience flow, not what this app does.** The app (and the pattern you should follow
when reasoning about "how would a client authenticate") uses a two-step flow:

1. `POST /api/Plugin/authenticate?apiKey={apiKey}&pluginName={name}` — the API key (found under
   Kavita's User Settings → API Key) is sent once, as a query param, to this single endpoint. See
   `references/plugin.md`. The response is a full user object; the field that matters is `token`
   (a JWT).
2. Every other authenticated endpoint takes that JWT as `Authorization: Bearer {token}` — not the
   raw API key, and not the `x-api-key` header the spec's UI hints at.
3. The raw API key resurfaces in exactly two places after that: image-serving URLs
   (`/api/image/series-cover?...&apiKey=...`, `/api/reader/image?...&apiKey=...`) that are meant
   to be dropped straight into an `<img src>` and can't carry a bearer header, and nowhere else.

Status codes worth knowing across most endpoints: `200` success, `401` invalid/expired auth,
`404` on read endpoints often means "resource/state doesn't exist" rather than a hard error — e.g.
`GET /api/Reader/get-progress` returns 404 when there's simply no saved progress yet, not a
failure to handle specially.

One more real-world quirk worth carrying into any client code you review or design: Kavita's DTOs
routinely return more fields than any given client cares about, so parsing code should tolerate
unknown fields rather than fail on them (this app's Kotlin DTOs all set
`Json { ignoreUnknownKeys = true }` for exactly this reason).

## Endpoints this app currently uses

Useful as a quick-reference starting point — these are the ones already wired into
`android/features/src/main/kotlin/com/mymangareader/features/kavita/`, so questions about current
behavior usually land on one of these:

| Concern | Endpoint | Reference file |
|---|---|---|
| Authenticate | `POST /api/Plugin/authenticate` | `plugin.md` |
| Health/URL selection | `GET /api/Health` | `health.md` |
| List series | `POST /api/Series/all-v2` | `series.md` |
| Series detail | `GET /api/Series/{id}` | `series.md` |
| Series metadata (summary/genres/tags) | `GET /api/Series/metadata` | `metadata.md` |
| Series cover image | `GET /api/image/series-cover` | `image.md` |
| List volumes/chapters | `GET /api/Series/volumes` | `series.md` |
| Mark chapters read/unread | `POST /api/Reader/mark-multiple-read` / `-unread` | `reader.md` |
| Reading progress (get) | `GET /api/Reader/get-progress` | `reader.md` |
| Page image | `GET /api/reader/image` | `reader.md` |
| Page dimensions | `GET /api/Reader/chapter-info` | `reader.md` |

Everything else in the spec (Collections, ReadingLists, Scrobbling, Stats, Admin/Server/Settings,
OPDS, Koreader/Tachiyomi compat, etc.) is fair game to explain or design against — it's just not
wired into the app yet, which is exactly the kind of gap this skill is meant to close for
restructuring/DataSource design work.
