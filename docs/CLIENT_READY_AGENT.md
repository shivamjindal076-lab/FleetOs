# FleetOs Client-Ready Agent

## Mission

Take FleetOs from the current in-progress local state to a client-ready handoff.

Work in:

`C:\Users\jinda\Desktop\WORK\Projects\Project alpha\FleetOs`

Do not stop at diagnosis. Finish the implementation, verify the result, and prepare a concise client handoff note.

## Current State

- The hardcoded Mappls integration has been removed.
- Ola Maps is wired through `src/lib/olaMaps.ts`.
- Local `.env` contains `VITE_OLA_MAPS_API_KEY`.
- `npm run build` currently passes.
- Admin sidebar/header navigation was recently wired, but must be verified in a fresh dev session.
- The browser screenshot showing `Add VITE_OLA_MAPS_API_KEY...` is most likely from a stale Vite dev server that started before the env var existed.
- Console lines from `read.js` / `content.js` are browser extension noise, not FleetOs app errors.
- React Router future-flag warnings are not blocking issues.

## Non-Negotiable Constraints

- Do not expose or commit secrets.
- Keep `.env` local-only.
- Do not revert unrelated user changes.
- Do not leave the repo in a half-fixed state.
- Prefer fixing root causes over patching symptoms.

## Primary Objectives

1. Ensure the admin and driver Ola Maps flows are fully working in a fresh runtime.
2. Ensure the admin sidebar and top navigation work consistently.
3. Remove obvious client-facing regressions or rough edges that block handoff.
4. Verify the app with actual runtime checks, not only static inspection.
5. Produce a handoff note suitable for the client or project owner.

## Required Work

### 1. Start Clean Runtime Verification

- Stop any stale FleetOs dev servers.
- Start a fresh dev server from the repo root with:

```powershell
npm run dev
```

- Confirm the server is the fresh process, not an old reused session.
- Hard refresh the browser after startup.

### 2. Verify the Admin Experience

- Open `http://localhost:8080/`.
- Confirm the admin map no longer shows the `VITE_OLA_MAPS_API_KEY` fallback state.
- Confirm the left sidebar changes sections:
  - Dashboard
  - Bookings
  - Drivers
  - Collections
  - Settings
- Confirm the top header navigation changes sections too.
- Confirm `New Dispatch` / `New Booking` still open the booking flow.

### 3. Verify the Driver Experience

- Confirm the driver trip map renders or degrades correctly without breaking the screen.
- Confirm no leftover Mappls references remain in runtime code or user-facing copy.

### 4. Fix Client-Facing Issues

Address anything blocking a clean handoff, including:

- runtime map failures
- broken navigation flows
- stale env assumptions
- obvious broken copy
- visible mojibake such as `â†’`, `â‚¹`, or similar encoding artifacts in UI text

If an issue cannot be fixed locally, isolate it precisely and document the blocker with evidence.

### 5. Verification

Run at minimum:

```powershell
npm run build
```

If practical, also run targeted checks such as:

```powershell
npm run test
```

or Playwright validation against a fresh dev server.

Do not claim runtime success unless you verified a fresh session.

## Acceptance Criteria

The task is complete only when all of the following are true:

- Admin map renders from Ola Maps in a fresh dev session.
- Sidebar and header navigation are clickable and visibly change the active section.
- No Mappls references remain in runtime code paths.
- No client-blocking console/runtime errors remain from FleetOs itself.
- Build passes.
- A concise handoff summary exists.

## Output Required From The Agent

Return a final handoff with:

1. What changed
2. What was verified
3. Any residual risks or follow-ups
4. Exact files changed
5. Clear instruction for the client/project owner, if any

## Suggested Handoff Format

Use this structure:

```md
## FleetOs Handover

### Completed
- ...

### Verified
- ...

### Remaining Risk
- ...

### Files Changed
- ...

### Client Notes
- ...
```
