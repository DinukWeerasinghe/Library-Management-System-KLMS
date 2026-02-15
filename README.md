# KLMS – Kumaradasa Library Management System

Production-grade **offline-first** desktop application for small school libraries.

## Tech Stack

- **Platform:** Electron.js (Desktop)
- **Frontend:** React.js (Vite)
- **Backend:** Node.js (Electron main process)
- **Database:** SQLite (local, 100% offline)

## Architecture

```
Electron Desktop App
├── React UI Layer
├── Node.js Service Layer
├── Feature Toggle Engine
├── Configuration Management Layer
└── SQLite Local Database
```

## Getting Started

```bash
npm install
npm run db:init    # Optional: pre-create database/klms.db (otherwise created on first app launch)
npm run dev        # Start Vite dev server + Electron
```

The app uses **sql.js** for SQLite (no native build tools required). The database is created automatically on first run if it does not exist.

## Build

```bash
npm run build:electron
```

## Default Admin

- **Username:** `admin`
- **Password:** `admin123` (change on first login)

## Backup

Use **Admin Settings → Backup** to export the SQLite database file for manual backup.
