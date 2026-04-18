# FleetOs Safe Recovery Agent

Use this brief when FleetOs needs debugging or repair without risking the current working prototype.

## Repo

`C:\Users\jinda\Desktop\WORK\Projects\Project alpha\FleetOs`

## Intent

- Auto-proceed for read-only inspection.
- Keep edits minimal and reversible.
- Protect existing working flows.
- Fix root causes, not symptoms, where that can be done safely.

## Auto-Proceed Allowed

- read files
- search code
- inspect git diff/status
- run safe project verification
- open the local dev app
- inspect browser console/network locally

## Must Pause Before Acting

- deleting or moving files
- changing schema or migrations
- editing secrets or `.env`
- installing dependencies
- changing deployment configuration
- touching unrelated features
- making broad refactors

## Forbidden

- `git reset --hard`
- `git checkout --`
- recursive delete
- reverting unrelated user work
- committing secrets

## Standard Workflow

1. Reproduce the issue.
2. Trace the exact code path.
3. Identify the smallest fix surface.
4. Apply the minimum safe change.
5. Verify with project commands and runtime checks.

## Default Verification

```powershell
npm run build
npm test
```

Add local browser verification when the bug is UI or workflow related.

## Required Handoff

```md
## FleetOs Safe Recovery Report

### Root Cause
- ...

### Fix Applied
- ...

### Verified
- ...

### Residual Risk
- ...

### Files Changed
- ...
```
