# MOV laptop beta

The laptop serves the production build at `http://localhost:5173/`. API files, keys and the data directory are outside the public web root. The Node API listens only on loopback.

Start: `node scripts/beta-control.mjs start`

Status and current tester URL: `node scripts/beta-control.mjs status`

Stop: `node scripts/beta-control.mjs stop`

The server runs independently of the terminal or Codex. `scripts/install-beta-autostart.ps1` installs a startup entry for the current Windows user. It does not prevent laptop sleep; the laptop must stay awake and connected for testers to reach it.

## First owner and testers

1. Open the local app. In Settings > Account, create a profile **with a password you choose**. The first profile is the owner. Existing guest workouts and nutrition are adopted into that new profile.
2. The supervisor detects the owner, enables invite-only signup, disables guest access, and starts the official Cloudflare connector. It updates the API origin and passkey hostname to the resulting HTTPS address.
3. Check Status for `publicUrl` with no error. Give testers that URL and a single-use invite code from Settings > Account > Admin dashboard.
4. Testers create individual profiles. The admin dashboard shows their workouts, weigh-ins, routines and recent food/water progress. Ordinary users cannot read another user's data or open the admin dashboard.

Quick Tunnel addresses can change when the connector restarts. Names and passwords remain valid on the next address. Passkeys are tied to a hostname, so password registration is the default for this temporary-URL test. Use a stable owned domain before a wider launch.

## Storage and sync

- `data/db.json`: accounts, password hashes, passkeys, roles, invites and session metadata.
- `data/state-<uid>.json`: per-account workout/profile progress.
- `data/nutrition-<uid>-YYYY-MM.json`: per-account food/water progress, food library and revision.
- `data/mov.db`: derived leaderboard metrics.
- The browser keeps an account-specific offline cache. Sign-in restores server nutrition, and sign-out/account switching isolates that cache. Revision conflicts merge entries, deletion markers and water events rather than overwriting unseen changes.
- Food AI calls require a signed-in account while guest mode is disabled. The testing budget remains 50 provider calls per UTC day, shared by text and audio. Configure production quotas and billing separately before 500 users.

## Backups

The supervisor takes a backup at startup and once every 24 hours while running. Archives and checksums are in `backups/`; the existing backup script retains 14 days. SQLite is snapshotted through SQLite before compression so a live WAL is not copied inconsistently.

`node scripts/backup-data.mjs` also creates a manual backup when `DATA_DIR` and `BACKUP_DIR` are set. Archives contain account/session secrets: keep them private. Copy backups to another device or storage location to protect against losing the laptop.

Restore into a **new directory** using `node scripts/restore-data.mjs <archive.tar.gz> <new-data-directory>`, then point `DATA_DIR` at the verified restored directory. Preserve the session secret and account records together.

## Updating and cloud migration

The beta serves `frontend/dist`, so UI source edits need `npm run build` in `frontend/`, then a browser reload. The old Vite dev server is stopped. Stop the beta before running a development server on the same ports.

For cloud migration, provision a small Linux server, build the API/web images from this repository, restore the data archive onto a persistent volume, configure the final HTTPS origin/RP_ID, and provide Gemini through backend environment secrets. The API build context is the repository root because API and frontend share nutrition modules. Do not copy `.food.local.json`, `.local-server`, `.local-tools` or backup archives into the public image.

Verify sign-in, account isolation, a workout, food and water save/restore, admin access and backup restore before moving testers. Keep the same domain when changing servers to preserve passkey usability. The domain change from a temporary URL requires testers to add passkeys again; passwords carry with the account records.

This is a beta setup. Its cloud capacity must be load-tested with the intended usage; 500 accounts does not specify simultaneous usage or upload volume.
