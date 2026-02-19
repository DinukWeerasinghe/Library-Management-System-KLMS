# KLMS Deployment Guide

## Version Management

### How Versioning Works

- **Version Name**: Stored in `package.json` (e.g., `"1.0.0"`)
- **Version Code**: Automatically calculated from version name
  - Formula: `major * 10000 + minor * 100 + patch`
  - Examples:
    - `1.0.0` → Code `10000`
    - `1.1.0` → Code `10100`
    - `1.0.5` → Code `10005`
    - `2.5.3` → Code `20503`
- **Database Tracking**: Automatically updated when app detects version change

### ⚠️ Important: You DON'T Need to Manually Update Version Code

The version code is **automatically calculated** from the version in `package.json`. You only need to update the version string in `package.json`.

---

## Deployment Steps for New Version

### Step 1: Update Version in `package.json`

Edit `package.json` and update the `version` field:

```json
{
  "version": "1.1.0",  // ← Update this (e.g., 1.0.0 → 1.1.0)
  ...
}
```

**Version Number Guidelines:**
- **Major** (X.0.0): Breaking changes, major features
- **Minor** (1.X.0): New features, backward compatible
- **Patch** (1.0.X): Bug fixes, small improvements

**Examples:**
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.0` → `1.1.0` (new feature)
- `1.0.0` → `2.0.0` (major update)

### Step 2: Build the Application

Run the build command:

```bash
npm run dist
```

This will:
1. Build the React frontend (`npm run build`)
2. Package the Electron app with electron-builder
3. Create installer in `dist/` folder
4. Installer filename will be: `KLMS_v1.1.0_Setup.exe` (version from package.json)

### Step 3: Test the Build

1. Install the generated installer from `dist/` folder
2. Launch the application
3. Go to **Settings → About** section
4. Verify the version displays correctly

### Step 4: Deploy

1. **Distribute the installer** (`KLMS_v1.X.X_Setup.exe`) to users
2. Users install the new version
3. **On first launch**, the app will:
   - Detect the new version from `package.json`
   - Automatically update the database version record
   - Log the version change

---

## What Happens Automatically

### On App Startup (Boot Sequence)

1. App reads version from `package.json`
2. Calculates version code automatically
3. Checks database for stored version
4. **If version changed**: Inserts new record in `AppMeta` table
5. **If version same**: No action needed

### Version Update Detection

The app compares:
- **Database version code** vs **Current package.json version code**

If they differ → New version detected → Database updated automatically

---

## Version History

All version changes are stored in the `AppMeta` table:

```sql
SELECT * FROM AppMeta ORDER BY id DESC;
```

This shows:
- `id`: Record ID
- `version_name`: "KLMS v1.1.0"
- `version_code`: 10100
- `updated_at`: Timestamp when version was recorded

---

## Build Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode (hot reload) |
| `npm run build` | Build React frontend only |
| `npm run pack` | Build + package (no installer) |
| `npm run dist` | **Build + create installer** (for deployment) |

---

## Checklist for New Release

- [ ] Update `version` in `package.json`
- [ ] Test application locally (`npm run dev`)
- [ ] Build installer (`npm run dist`)
- [ ] Test installer on clean system
- [ ] Verify version displays correctly in Settings → About
- [ ] Check logs for version update confirmation
- [ ] Distribute installer to users
- [ ] Document changes in release notes (if applicable)

---

## Troubleshooting

### Version Not Updating?

1. **Check package.json**: Ensure version is updated
2. **Check database**: Query `AppMeta` table to see current version
3. **Check logs**: Look for version update messages in app logs
4. **Rebuild**: Make sure you rebuilt after changing version

### Version Code Calculation Issues?

The version code is calculated as: `major * 10000 + minor * 100 + patch`

- Maximum supported: `99.99.99` → Code `999999`
- If you need higher versions, update the calculation in `electron/services/version-service.js`

---

## Example: Deploying Version 1.2.0

```bash
# 1. Update package.json
# Change: "version": "1.0.0" → "version": "1.2.0"

# 2. Build
npm run dist

# 3. Installer created: dist/KLMS_v1.2.0_Setup.exe

# 4. When user installs and runs:
# - App detects version change (10000 → 10200)
# - Database updated automatically
# - Settings → About shows "KLMS v1.2.0"
```

---

## Notes

- **Version code is READ-ONLY** - Don't edit it manually
- **Database updates are automatic** - No manual SQL needed
- **Version history is preserved** - Old versions remain in database
- **Installer filename includes version** - Automatically from package.json
