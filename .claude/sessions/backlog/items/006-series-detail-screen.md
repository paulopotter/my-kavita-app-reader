# Backlog 006 — Series Detail Screen

## What
Shows metadata, cover, and chapter list for a single series. Sixth screen in migration order.

## Why
Entry point to reading — user selects a chapter from here.

## Scope (when planned)
- Kotlin: `kavita.getSeriesDetail(id)`, `kavita.getChapters(seriesId)`
- RN: `SeriesDetailScreen` → `ChapterList` (dummy) + `SeriesHeader` (dummy)
  + `useSeriesDetail` hook + `SeriesDetailService` + chapter sort logic (from Config preferences)
- Chapter sort modes: ascending, descending, smart (threshold from Config)

## Dependencies
- Plan 001 (Config — chapter sort preferences)
- Backlog 003 (Library — navigation source)
