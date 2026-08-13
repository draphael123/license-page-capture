# Changelog

## 1.2.0 — Production hardening

- Added durable transaction states for every supported forward navigation.
- Added image decoding, dimension, blank-image, and completed-download validation.
- Require two independent signals before recording a transition as confirmed.
- Added fail-closed anomaly recovery and interrupted-session reconciliation.
- Portal profiles now expire after 30 days and retain reviewed safety settings.
- Added a public readiness ledger describing the current production boundary.

## 0.5.0 - 2026-08-13

- Added confirmed individual screenshot removal from the completed-test review.
- Added Chrome Web Store icons, listing assets, privacy declarations, permission justifications, and reviewer instructions.
- Expanded public compatibility checks across six state licensing sites.

## 0.4.0 - 2026-08-13

- Rebuilt the popup as a clear Set up test, Capturing, and Test complete workflow.
- Added optional scroll-and-stitch full-page capture without debugger permission.
- Added screenshot thumbnails and saved, skipped, and failed totals for end-of-test review.
- Simplified user-facing language and moved technical actions into secondary menus.

## 0.3.0 - 2026-08-13

- Added duplicate-capture prevention, stronger automatic page names, and an active-session close warning.
- Added persistent on-page capture status and saved-page count.
- Added portal-specific button-label presets that are remembered by website.
- Added one-click access to saved screenshots and a readable HTML session summary.

## 0.2.1 - 2026-08-13

- Added a unique folder for every capture session so repeated tests never mix their screenshots.
- Moved each session ledger into the same folder as its screenshots.

## 0.2.0 — 2026-08-13

- Added per-tab sessions and recovery.
- Added safe mode, domain locking, custom button labels, and Enter-key handling.
- Added saved, skipped, blocked, and failed ledger events with JSON export.
- Added an interactive mock portal, privacy page, security page, and release history.
- Added automated tests for label recognition, sensitive-data detection, paths, capture, skipping, and domain blocking.

## 0.1.0 — 2026-08-12

- Initial developer preview.
