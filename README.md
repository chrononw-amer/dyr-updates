# DYR — Real Estate Management System

A professional desktop & mobile real estate management application built for internal company use.

---

## 📦 Latest Release: v1.8.19

> Released: 2026-04-16

### Fixes
- **Contracts & Offers Search Bar** — Search input was clearing on every re-render. Fixed by switching from `onIonChange` to `onIonInput`.
- **Offer Payment Receipt — Reference/Notes Missing** — Reference field entered when adding a payment was not appearing on the receipt. Now correctly displayed.
- **Receipt Payment History — Notes Column Removed** — Merged into Reference column since Notes was always empty.
- **Receipt Date Off By 1 Day** — Fixed timezone bug where dates appeared one day earlier than expected in UTC+ timezones.
- **Received By on Receipts** — All receipts now print the currently logged-in user's name in the "Received By" signature block.

---

## 🗂️ Update Log

### v1.8.18 — 2026-04-15
- Payment attachment persistence fix — file attachments on payments now correctly saved to the database.

### v1.8.16 — 2026-04-15
- **What's New Version Badge** — Badge in the "What's New" panel now always reflects the actual running app version.

### v1.8.15 — 2026-04-15
- **What's New Version Badge Fix** — Panel was showing v1.8.14 as current even when running v1.8.15.

### v1.8.14 — 2026-04-15
- **Changelog Completeness** — In-app "What's New" panel and CHANGELOG.md are now kept in sync with every release.

### v1.8.13 — 2026-04-15
- **Changelog Discipline** — CHANGELOG.md and in-app panel updated with every release going forward.

### v1.8.12 — 2026-04-15
- **Payment Attachment Persistence** — Fixed `addInstallmentPayment` to persist the `attachments` array in the database.

### v1.8.11 — 2026-04-15
- **Settings Page Crash Fix** — Fixed React Hooks violation (Error #310) in the "What's New" changelog panel.

### v1.8.10 — 2026-04-15
- **WhatsApp Reminder Message** — Corrected reminder message template (was using overdue template by mistake).
- **Collection Intelligence Search Bar** — Switched to real-time `onIonInput` for instant search response.
- **Payment Attachment Clipboard Paste** — Fixed stale clipboard `File` objects when pasting images before recording a partial payment.

### v1.8.8 — 2026-04-15
- **Installer Error Fix** — Resolved NSIS "Failed to uninstall old application files: 2" error on updates.
- **Desktop Shortcut After Update** — Shortcuts are now always recreated on install/update.
- **Update Progress Bar** — Fixed progress bar not appearing when download starts.
- **Restart & Install Button** — Replaced auto-quit with an explicit green "🔄 Restart & Install Now" button.

### v1.7.9 — 2026-04-11
- **Broker Commission Statements** — Finalized statement generation with accurate financial calculations.
- Released for Windows (EXE) and Android (APK).

### v1.7.8 — 2026-04-11
- **Payment Plan Calculations** — Down payment and installment figures now derived from real installment records.

### v1.7.7 — 2026-04-09
- **Broker Commission System** — Completed migration to broker-centric architecture.
- **Login Security** — Single-session enforcement hardened.
- **Android Update Check** — Fixed version check on Android.

### v1.7.6 — 2026-04-08
- **Broker & Agent Management** — Full CRUD with data integrity validation.
- **Inventory Report Layouts** — Enhanced visual layouts.

### v1.7.5 — 2026-04-07
- **Offer Payment Optimization** — Improved offer payment and customer record handling.

---

## 🖥️ Downloads

| Platform | File |
|----------|------|
| Windows  | `DYR-{version}-Setup.exe` |
| Android  | `DYR-{version}.apk` |

> All releases: [github.com/chrononw-amer/dyr-updates/releases](https://github.com/chrononw-amer/dyr-updates/releases)
