# Obsidian Progress Hook

This repo includes a local progress hook at `scripts/obsidian-progress-hook.mjs`.

It appends a structured progress block into the current Obsidian daily note.

## Usage

Set your vault path for the current shell:

```powershell
$env:OBSIDIAN_VAULT_PATH='C:\Users\jinda\Desktop\WORK\Inbox\vault-by-obsidian'
```

Run the hook:

```powershell
npm run obsidian:progress -- --project FleetOs --summary "Map and booking flow progress" --status "in progress" --completed "Connected customer/admin pickup-drop fields to Krutrim/Ola search" --verification "npm run build" --verification "npm test" --next "Validate browser flow after key/domain whitelist"
```

## Notes

- If a root note like `2026-04-08.md` already exists in the vault, the hook appends there.
- Otherwise, if `Daily Notes/` exists, it writes to `Daily Notes/YYYY-MM-DD.md`.
- If neither note exists, it creates one.
- You can override the vault path with `--vault`.
- You can override the date with `--date YYYY-MM-DD`.
