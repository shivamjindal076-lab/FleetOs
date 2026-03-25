# FleetOs — Kinetic Gallery UI Redesign
**Date:** 2026-03-26
**Status:** Approved
**Reference design:** `stitch.zip` → `DESIGN.md` + `code.html`

---

## Overview

Replace the current FleetOs UI with the "Kinetic Gallery" design system across all screens. The working prototype has full business logic; this spec covers making it look exactly like the stitch reference design. Scope: admin dashboard, driver app, customer booking form, login screen.

---

## Sub-projects (build order)

| # | Sub-project | Files affected |
|---|-------------|---------------|
| 1 | Design tokens | `src/index.css`, `tailwind.config.ts`, `index.html` |
| 2 | Shell layout | New `AdminShell.tsx`, `Sidebar.tsx`, `TopHeader.tsx`, update `Index.tsx` |
| 3 | Admin dashboard | `AdminDashboard.tsx`, new `BentoStats.tsx`, new `DriverFleetList.tsx` |
| 4 | Mappls live map | New `MapPanel.tsx`, new `useDriverLocations.ts` |
| 5 | Driver app | `DriverDashboard.tsx` and driver component screens |
| 6 | Customer + Login | `BookingForm.tsx`, `LoginPage.tsx`, `DriverLoginPage.tsx` |

---

## Sub-project 1: Design Tokens

### Approach
Remap existing shadcn HSL CSS variables in `src/index.css` to match the stitch palette. All shadcn components pick up the new palette immediately. No parallel token systems.

### Full color mapping — `:root` block

| CSS variable | New HSL value | Stitch hex | Stitch token name |
|---|---|---|---|
| `--background` | `216 45% 98%` | `#f7f9fc` | surface |
| `--foreground` | `204 9% 11%` | `#191c1e` | on-surface |
| `--card` | `0 0% 100%` | `#ffffff` | surface-container-lowest |
| `--card-foreground` | `204 9% 11%` | `#191c1e` | on-surface |
| `--popover` | `0 0% 100%` | `#ffffff` | surface-container-lowest |
| `--popover-foreground` | `204 9% 11%` | `#191c1e` | on-surface |
| `--primary` | `37 100% 26%` | `#865300` | primary |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | on-primary |
| `--secondary` | `221 22% 40%` | `#505e7d` | secondary |
| `--secondary-foreground` | `0 0% 100%` | `#ffffff` | on-secondary |
| `--accent` | `35 95% 57%` | `#f9a329` | primary-container (amber) |
| `--accent-foreground` | `37 100% 20%` | dark brown | on-primary-container |
| `--muted` | `216 11% 91%` | `#e6e8eb` | surface-container-high |
| `--muted-foreground` | `31 23% 26%` | `#534434` | on-surface-variant |
| `--border` | `30 35% 76%` | `#d8c3ae` | outline-variant |
| `--input` | `30 35% 76%` | `#d8c3ae` | outline-variant |
| `--ring` | `37 100% 26%` | `#865300` | primary |
| `--destructive` | `0 75% 42%` | `#ba1a1a` | error |
| `--destructive-foreground` | `0 0% 100%` | `#ffffff` | on-error |
| `--success` | `152 60% 40%` | unchanged (already exists at line 32 of `src/index.css`) | — |
| `--warning` | `35 95% 57%` | `#f9a329` | primary-container |
| `--radius` | `0.75rem` | unchanged | — |

**Sidebar vars** (used by the new `Sidebar.tsx`):

| CSS variable | New value |
|---|---|
| `--sidebar-background` | `216 30% 12%` (dark warm navy) |
| `--sidebar-foreground` | `216 20% 90%` |
| `--sidebar-primary` | `35 95% 57%` (amber accent) |
| `--sidebar-primary-foreground` | `37 100% 20%` |
| `--sidebar-accent` | `216 25% 18%` |
| `--sidebar-accent-foreground` | `216 20% 90%` |
| `--sidebar-border` | `216 20% 20%` |

**Gradient vars**:
```css
--gradient-accent: linear-gradient(135deg, #865300 0%, #f9a329 100%);
--shadow-card: 0 1px 3px 0 hsl(37 100% 26% / 0.06), 0 1px 2px -1px hsl(37 100% 26% / 0.06);
--shadow-elevated: 0 10px 25px -5px hsl(37 100% 26% / 0.1), 0 8px 10px -6px hsl(37 100% 26% / 0.08);
```

### CSS utilities (add to `@layer utilities` in `src/index.css`)
```css
.kinetic-gradient {
  background: linear-gradient(135deg, #865300 0%, #f9a329 100%);
}
.glass-nav {
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
```

### Typography
- `index.html`: add to Google Fonts import — `Plus+Jakarta+Sans:wght@400;500;600;700;800` and `Inter:wght@400;500;600;700`
- `tailwind.config.ts`: add `font-label: ['Inter', 'system-ui', 'sans-serif']` under `fontFamily`
- Existing `font-display: Plus Jakarta Sans` stays (headlines)
- Existing `font-body: DM Sans` stays — **not replaced globally**. Inter (`font-label`) is used for metadata labels, chips, and micro-copy on new components only.
- `body {}` in `index.css` remains `font-body` (DM Sans)

### "No 1px border" rule scope
This rule applies to **card and container elements only** (layout cards, stat cards, list panels). Form controls (`<input>`, `<select>`, shadcn `Input`, `Separator`, focus rings) retain their borders for accessibility.

---

## Sub-project 2: Shell Layout

### Overview
All authenticated admin screens are wrapped in `AdminShell`, which renders a fixed sidebar + glassmorphism header. The layout is **desktop-only** (min-width: 1024px). Mobile breakpoints are not addressed in this spec — driver and customer screens handle their own responsive layout in Sub-projects 5 and 6.

### `AdminShell.tsx`
```tsx
interface AdminShellProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'bookings' | 'drivers' | 'collections' | 'settings';
}
```
Renders: `<Sidebar activeTab />` + `<TopHeader />` + `<main className="ml-64 pt-20 min-h-screen bg-background">{children}</main>`

In `Index.tsx`, replace the current top-bar nav with `<AdminShell activeTab="dashboard">` wrapping the admin view. The shell `activeTab` prop controls only the TopHeader sub-nav highlight and Sidebar active item — it is always `"dashboard"` from `Index.tsx` since the entire admin area is one route.

The existing `Tab = 'today' | 'fleet' | 'collections'` state in `AdminDashboard` is **preserved verbatim** — the three tab buttons ("Today's Board", "Fleet Health", "Collections") remain rendered inside `AdminDashboard` unchanged. This means the existing Playwright P0 test selectors (`role=button { name: /today's board/i }`, `role=button { name: /fleet health/i }`) continue to work without modification. The shell's TopHeader sub-nav tabs are a separate, visual-only element that does not replace or conflict with the internal tab buttons.

### `Sidebar.tsx`
- `fixed left-0 top-0 h-full w-64 flex flex-col py-8 z-50` — background comes from `bg-sidebar` CSS var (`216 30% 12%`, dark warm navy), not Tailwind slate
- **Top brand block**: `w-10 h-10 kinetic-gradient rounded-xl` bolt icon + "FleetOs" in `font-display font-black text-2xl tracking-tighter` + "Fleet Management" in `text-[10px] uppercase tracking-[0.2em] text-slate-400`
- **Nav items**: Dashboard, Bookings, Drivers, Collections, Settings — each using Lucide icons
  - Active: `border-l-4 border-accent pl-4 bg-slate-200/50 font-extrabold text-slate-900`
  - Inactive: `pl-5 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900`
- **CTA**: "New Dispatch" button — `w-full kinetic-gradient text-white py-4 rounded-xl font-bold` — opens `NewBookingSheet` (existing component)
- **Bottom**: Support link + Sign Out link (calls existing Supabase `signOut`)

### `TopHeader.tsx`
- `fixed top-0 right-0 left-64 z-40 h-20 flex items-center justify-between px-8 glass-nav border-b border-slate-100`
- **Left**: search `<input>` — `bg-muted rounded-xl py-3 pl-12 border-none focus:ring-2 focus:ring-primary/20`
- **Center sub-nav**: three text links — "Overview" | "Bookings" | "Drivers" — active tab underlined with `border-b-2 border-accent text-accent`; these are visual-only state driven by `activeTab` prop from `AdminShell`
- **Right**: notifications `<button>` (Lucide Bell), dark mode toggle (existing hook), "New Booking" button (`kinetic-gradient text-white px-6 py-2.5 rounded-xl`) opens `NewBookingSheet`, admin avatar circle

---

## Sub-project 3: Admin Dashboard

### Layout structure
`AdminDashboard.tsx` renders:
```
<BentoStats />                          ← full width, col-span-12 conceptually
<div className="grid grid-cols-12 gap-8 mt-6">
  <DriverFleetList />  ← col-span-5
  <MapPanel />         ← col-span-7
</div>
```

### `BentoStats.tsx`
Three cards in a `grid grid-cols-12 gap-6` row, each `col-span-4`:

| Card | Data source | Tint |
|------|-------------|------|
| Active Bookings | `useBookings()` → filter `status = 'confirmed' \| 'in-progress'` → count | White + kinetic corner blob |
| Drivers Online | `useDrivers()` → filter `status = 'free' \| 'on-trip'` → count | Secondary-container tint |
| Pending Bookings | `useBookings()` → filter `status = 'pending'` → count | `bg-destructive/10` if count > 0, else neutral |

Each card: `bg-card p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-transform`. Stat number in `text-5xl font-extrabold font-display tracking-tighter`. Label in `text-sm font-bold uppercase tracking-widest text-muted-foreground`.

### `DriverFleetList.tsx`
- `col-span-5` panel with `<h3>` heading + "View All" link
- Lists drivers from `useDrivers()`, all statuses
- Each driver card: `bg-card p-4 rounded-2xl flex items-center gap-4 hover:shadow-lg transition-all`
  - Driver initials avatar (existing `getDriverInitials`)
  - Name bold + status badge (`In Transit` / `Free` / `Offline` — bg color from status)
  - "Assign" button → opens `DispatchEngine` dialog (existing Sheet/Dialog — no change to dispatch logic)

---

## Sub-project 4: Mappls Live Map

### SDK loading
The Mappls SDK key appears in the URL path, so it cannot use a plain `<script>` tag with a static URL at build time without exposing the key. Use **runtime JS injection** in `MapPanel.tsx`:

```ts
useEffect(() => {
  const key = import.meta.env.VITE_MAPPLS_API_KEY;
  const script = document.createElement('script');
  script.src = `https://apis.mappls.com/advancedmaps/v1/${key}/map_load?v=3.0`;
  script.async = true;
  script.onload = () => initMap(); // initialize Mappls map inside initMap()
  document.head.appendChild(script);
  return () => { document.head.removeChild(script); };
}, []);
```

`VITE_MAPPLS_API_KEY` stored in `.env`. The SDK exposes `window.mappls` after `onload`.

### `useDriverLocations.ts`
Custom hook that polls `Drivers` table every **15 seconds** using React Query `refetchInterval`. Returns `Array<{ id, name, location_lat, location_lng, status, current_trip }>`.

`current_trip` is resolved via **two Supabase queries + in-memory join** (not N per-driver queries):
1. Fetch all drivers: `SELECT id, name, location_lat, location_lng, status FROM "Drivers"`
2. Fetch all active bookings: `SELECT id, driver_id, pickup, drop FROM "bookings table" WHERE status = 'in-progress'`

Then in JS, build a `Map<driverId, booking>` from result 2 and attach `current_trip` to each driver from result 1. Two total queries per 15s poll regardless of fleet size.

### `MapPanel.tsx`
- `col-span-7 bg-card rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[500px] relative`
- Initializes Mappls map on mount via `useEffect` — checks `window.mappls` is ready before init
- Center: India `[20.5937, 78.9629]`, zoom 5
- Re-centers to the fleet's bounding box once driver data loads

**Driver markers** (from `useDriverLocations`):
- `status = 'on-trip'`: orange pulsing custom marker (`#f9a329` dot with `ring-8 ring-primary/20 animate-pulse`)
- `status = 'free'`: green static dot (`#22c55e`)
- `status = 'offline'`: grey dot, no animation
- Hover tooltip (Mappls `popup`): `<strong>{name}</strong><br/>{pickup} → {drop}` — trip fields from `current_trip`; if no active trip, shows "Available"

**Booking markers** (from `useBookings()` filtered to `status = 'pending'`):
- Bookings store `pickup` and `drop` as address strings — **no geocoding in this spec**
- Booking pins are **deferred** to a follow-up spec pending a geocoding strategy (Mappls Geocoding API or lat/lng columns on bookings table)
- Map panel renders driver markers only in this phase

### Driver location updates (Sub-project 5 dependency)
Driver app calls `navigator.geolocation.watchPosition` on trip start, writes `location_lat` / `location_lng` to `Drivers` table every 15 seconds via Supabase update. Columns `location_lat` and `location_lng` already exist in production schema (type `float`, nullable) — **no migration required**.

If geolocation permission is denied: show inline banner "Location sharing is off — admin cannot track your position" and suppress the geolocation writes silently.

---

## Sub-project 5: Driver App

### Scope — screens to restyle
The driver app has five screens (`home | active-trip | earnings | documents | expenses`). All five get the token update automatically from Sub-project 1. Additional changes:

- **Home screen**: Replace top header with `kinetic-gradient` branded header bar showing "FleetOs" + driver name
- **Action buttons** (Accept Trip, Start Trip, Complete Trip): min-height `64px`, `font-display text-xl font-bold`, `kinetic-gradient` background
- **Trip cards**: `rounded-2xl bg-card shadow-card`, no dividers between list items
- **Earnings screen**: tonal stat chips using `bg-muted` (no border)

### Geolocation
On `active-trip` screen mount, call `navigator.geolocation.watchPosition`. On each position update, debounce to max 1 write per 15 seconds to `Drivers` table (`location_lat`, `location_lng`). On screen unmount or trip complete, call `clearWatch`.

Error handling: if `PermissionDeniedError`, show a non-blocking inline banner. Do not block the driver's trip workflow.

---

## Sub-project 6: Customer + Login

### Booking form (`BookingForm.tsx`)
- Page background: `bg-background` (`#f7f9fc`)
- Form card: `bg-card rounded-[2rem] shadow-elevated p-8`
- Inputs: `bg-muted border-none rounded-xl focus:ring-2 focus:ring-ring/30`
- "Book Now" CTA: `kinetic-gradient text-white font-bold rounded-xl py-4`
- Field labels: `font-label text-sm text-muted-foreground` (Inter)

### Login screen (`LoginPage.tsx`)
- Existing bifurcated flow is **preserved** (Admin tile → email/password form; Driver tile → redirects to `DriverLoginPage`)
- Visual changes only:
  - Full-page `bg-background`
  - Centered card `bg-card rounded-[2rem] shadow-elevated p-10`
  - FleetOs logo mark at top (bolt icon, kinetic-gradient, same as sidebar)
  - Role tiles: `bg-card rounded-xl border border-border` → selected state: `border-2 border-accent bg-accent/10`
  - Submit button: `kinetic-gradient text-white font-bold rounded-xl py-3`

### `DriverLoginPage.tsx`
Same card treatment as `LoginPage`. No logic changes.

---

## Design rules (apply to all new components)

1. **No 1px borders on containers/cards** — use tonal background shifts or `shadow` only
2. **No pure black text** — always use `text-foreground` or `text-muted-foreground`
3. **Rounding**: `rounded-[2rem]` for stat/feature cards, `rounded-2xl` for list item cards, `rounded-xl` for inputs/buttons/badges, `rounded-full` for avatars/status dots
4. **Hover**: `hover:scale-[1.01] transition-transform` on stat cards; `hover:shadow-lg transition-all` on list cards
5. **Name**: always "FleetOs" — not FleetOSS, not Fleet OS, not Fleetos

---

## What is NOT changing

- Supabase data hooks (`useBookings`, `useDrivers`, `useCollections`, etc.)
- DispatchEngine business logic (only its visual wrapper updates)
- Auth flow logic
- Playwright P0 tests
- Supabase table names (`"bookings table"`, `"Drivers"`)
- Dark mode CSS vars (update in a follow-up pass)
