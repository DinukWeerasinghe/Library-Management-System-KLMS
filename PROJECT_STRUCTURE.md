# KLMS – Project Folder Structure

```
KLMS/
├── package.json
├── vite.config.js
├── README.md
├── .gitignore
├── PROJECT_STRUCTURE.md
│
├── electron/                      # Electron main process
│   ├── main.js                    # App entry, window, IPC registration
│   ├── preload.js                 # contextBridge API for renderer
│   ├── ipc-handlers.js            # IPC route registration (auth, config, features, members, books, backup)
│   ├── database/
│   │   ├── connection.js          # Singleton SQLite connection, getDbPath, ensureDatabaseExists
│   │   ├── init-schema.js         # In-process schema + seed (when DB missing)
│   │   ├── config-repository.js   # Configuration table read/write
│   │   └── feature-toggle-repository.js
│   └── services/
│       ├── auth-service.js        # Login, logout, changePassword, getSession
│       ├── config-service.js     # Config get/set
│       ├── member-service.js     # Member CRUD + search
│       ├── book-service.js       # Book CRUD + search (respects enable_categories)
│       └── category-service.js   # Category list (for books)
│
├── database/                      # SQLite DB location (dev) + scripts
│   ├── klms.db                   # Created by npm run db:init or first run
│   ├── schema.sql                 # Reference schema
│   └── scripts/
│       └── init-db.js            # Standalone init script (npm run db:init)
│
└── src/                           # React UI (Vite)
    ├── index.html
    ├── main.jsx
    ├── App.jsx
    ├── styles/
    │   └── index.css
    ├── pages/
    │   ├── Login.jsx
    │   └── Dashboard.jsx
    └── components/
        ├── Members.jsx            # Member CRUD UI
        ├── Books.jsx              # Book CRUD UI (category dropdown when enabled)
        └── Settings.jsx          # Config, feature toggles, backup export
```

## Architecture summary

- **Electron main**: owns SQLite (better-sqlite3), runs services, handles IPC.
- **Preload**: exposes `window.klms` (auth, config, features, members, books, categories, backup).
- **React**: login → dashboard with tabs (Members, Books, Settings). No direct DB or Node; all via `window.klms`.
