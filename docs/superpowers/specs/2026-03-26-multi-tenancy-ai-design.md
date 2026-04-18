# FleetOs — Multi-Tenancy + AI Enablement System Design
**Date:** 2026-03-26
**Status:** Approved — Ready for Implementation
**Replaces:** Single-tenant schema (`Drivers`, `bookings table`)

---

## Table of Contents

1. [Product Context](#1-product-context)
2. [Design Principles](#2-design-principles)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [Database Schema](#4-database-schema)
5. [Row-Level Security Policies](#5-row-level-security-policies)
6. [URL Structure and Routing](#6-url-structure-and-routing)
7. [Auth Roles and Identity](#7-auth-roles-and-identity)
8. [Org Lifecycle — Creation and Onboarding](#8-org-lifecycle--creation-and-onboarding)
9. [Driver Onboarding Flow](#9-driver-onboarding-flow)
10. [Customer Booking Flow](#10-customer-booking-flow)
11. [Super-Admin Panel](#11-super-admin-panel)
12. [AI Touchpoints](#12-ai-touchpoints)
13. [Data Export System](#13-data-export-system)
14. [Google Drive Integration](#14-google-drive-integration)
15. [RAG Chat Interface (v3 — Long Game)](#15-rag-chat-interface-v3--long-game)
16. [Schema Migration Strategy](#16-schema-migration-strategy)
17. [Build Order](#17-build-order)
18. [Open Questions and Constraints](#18-open-questions-and-constraints)

---

## 1. Product Context

FleetOs is a B2B fleet operations SaaS for Indian fleet operators. It is a backend operations tool — not a customer-facing product. The fleet operator uses FleetOs to manage their fleet; their customers interact only with the operator's branded interface.

FleetOs is one product within a broader brand umbrella. The strategic goal is to accumulate structured operational data per operator, then layer an LLM intelligence system on top of that data. Every feature designed today is also a data capture point for tomorrow's AI layer.

**What FleetOs is:**
- A white-labeled operations platform that operators run under their own brand
- A structured data accumulator (every action is timestamped and logged)
- The foundation for AI-powered operational intelligence

**What FleetOs is not:**
- A customer-facing ride-hailing app
- A marketplace between operators
- A payment processor

---

## 2. Design Principles

| Principle | Implication |
|-----------|-------------|
| Every feature captures AI-useful data | No dark writes. Every state change is timestamped, stored, queryable |
| Operators are invisible to FleetOs | FleetOs branding is hidden by default from end-users of each org |
| Zero-friction org setup | A new org is live on its own subdomain the moment a super-admin creates it |
| Hard isolation, not soft isolation | `org_id` on every row + Supabase RLS — never rely on application-layer filtering alone |
| Build the right primitives first | Multi-tenancy foundation before any AI features ship |

---

## 3. Multi-Tenancy Architecture

### Approach: Row-Level Isolation in a Single Supabase Project

All operators (orgs) share one Supabase project. Every data table has an `org_id` column. Supabase Row Level Security (RLS) policies enforce that each session can only read/write rows belonging to the org associated with the authenticated user.

This approach was chosen over separate Supabase projects per org because:
- Zero infra overhead when creating a new org
- Single codebase, single deployment
- Simpler migrations (apply once, affects all orgs)
- Supabase RLS is battle-tested for this pattern at scale

### Tenancy Boundary

```
auth.users  →  org_admin_users (user_id → org_id)
                    ↓
            organizations (one row per org)
                    ↓
      ┌─────────────┼──────────────┐
   drivers       bookings      org_pricing   (all have org_id FK)
   cash_handovers  fixed_routes
```

The `org_id` is resolved at auth time and injected into every RLS policy. Application code never needs to manually scope queries — the database enforces it.

### Org Identity Columns

The `organizations` table is the single source of truth for all branding, configuration, and routing for each tenant:

| Column | Purpose |
|--------|---------|
| `slug` | Subdomain: `slug.fleetos.app` — auto-assigned, immutable after creation |
| `custom_domain` | Optional operator-mapped domain (e.g., `book.anilcabs.com`) |
| `brand_name` | Shown in UI header, booking form title, email subjects |
| `brand_logo_url` | Operator logo — replaces FleetOs logo in all user-facing views |
| `brand_color` | Hex value — used as primary color token in the tenant's UI |
| `join_code` | 4-char alphanumeric driver invite code — shown in Fleet Health tab |
| `whatsapp_api_key` | Operator's own WhatsApp Business API key for OTP delivery |
| `google_drive_connected` | Boolean — triggers Drive sync features |
| `google_drive_token` | OAuth token blob for Drive access |
| `report_frequency_days` | 7, 14, or 21 — controls periodic export schedule |

---

## 4. Database Schema

> **Migration note:** The existing schema (`Drivers`, `bookings table`) is wiped. Anil Cabs becomes the first org. All table names use snake_case with no spaces.

### `organizations`

```sql
CREATE TABLE organizations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text UNIQUE NOT NULL,
  custom_domain           text,
  brand_name              text NOT NULL,
  brand_logo_url          text,
  brand_color             text,
  join_code               char(4) NOT NULL,
  admin_user_id           uuid REFERENCES auth.users,
  whatsapp_api_key        text,
  google_drive_connected  boolean DEFAULT false,
  google_drive_token      jsonb,
  report_frequency_days   int DEFAULT 7,
  created_at              timestamptz DEFAULT now()
);
```

### `drivers`

```sql
CREATE TABLE drivers (
  id                bigserial PRIMARY KEY,
  org_id            uuid REFERENCES organizations NOT NULL,
  name              text,
  phone             text,
  vehicle_model     text,
  plate_number      text,
  status            text DEFAULT 'pending_approval',
  is_temporary      boolean DEFAULT false,
  odometer_required boolean DEFAULT false,
  location_lat      numeric,
  location_lng      numeric,
  created_at        timestamptz DEFAULT now()
);
```

### `bookings`

```sql
CREATE TABLE bookings (
  id                      bigserial PRIMARY KEY,
  org_id                  uuid REFERENCES organizations NOT NULL,
  customer_name           text,
  customer_phone          text,
  pickup                  text,
  drop                    text,
  trip_type               text,
  status                  text DEFAULT 'pending',
  fare                    numeric,
  driver_id               bigint REFERENCES drivers,
  scheduled_at            timestamptz,
  payment_method          text,
  amount_collected        numeric,
  payment_confirmed_at    timestamptz,
  stops                   text,
  estimated_hours         numeric,
  number_of_days          int,
  return_date             date,
  driver_stay_required    boolean DEFAULT false,
  odometer_start_url      text,
  odometer_start_reading  int,
  odometer_start_at       timestamptz,
  odometer_end_url        text,
  odometer_end_reading    int,
  odometer_end_at         timestamptz,
  dispatched_at           timestamptz,
  trip_started_at         timestamptz,
  trip_completed_at       timestamptz,
  created_at              timestamptz DEFAULT now()
);
```

### `cash_handovers`

```sql
CREATE TABLE cash_handovers (
  id              bigserial PRIMARY KEY,
  org_id          uuid REFERENCES organizations NOT NULL,
  driver_id       bigint REFERENCES drivers NOT NULL,
  amount          numeric NOT NULL,
  handed_over_at  timestamptz DEFAULT now(),
  admin_approved  boolean DEFAULT false,
  admin_notes     text
);
```

### `org_pricing`

```sql
CREATE TABLE org_pricing (
  id                    bigserial PRIMARY KEY,
  org_id                uuid UNIQUE REFERENCES organizations NOT NULL,
  city_per_km           numeric,
  outstation_per_km     numeric,
  airport_flat_fare     numeric,
  sightseeing_per_hour  numeric,
  sedan_multiplier      numeric DEFAULT 1.0,
  suv_multiplier        numeric DEFAULT 1.3,
  night_surcharge_pct   numeric DEFAULT 0,
  driver_stay_per_night numeric,
  waiting_per_hour      numeric,
  updated_at            timestamptz DEFAULT now()
);
```

### `fixed_routes`

```sql
CREATE TABLE fixed_routes (
  id           bigserial PRIMARY KEY,
  org_id       uuid REFERENCES organizations NOT NULL,
  origin       text,
  destination  text,
  fixed_fare   numeric,
  per_km_rate  numeric
);
```

### `super_admin_users`

```sql
CREATE TABLE super_admin_users (
  user_id     uuid PRIMARY KEY REFERENCES auth.users,
  created_at  timestamptz DEFAULT now()
);
```

---

## 5. Row-Level Security Policies

RLS is enabled on all tables. Policies are the enforcement layer — application code must never be the only guard.

### Policy Matrix

| Table | Org Admin | Driver | Customer | Super-admin |
|-------|-----------|--------|----------|-------------|
| `organizations` | SELECT own row | — | — | ALL |
| `drivers` | ALL where `org_id` matches | SELECT own row | — | ALL |
| `bookings` | ALL where `org_id` matches | SELECT + UPDATE assigned | INSERT only | ALL |
| `cash_handovers` | ALL where `org_id` matches | INSERT own | — | ALL |
| `org_pricing` | ALL where `org_id` matches | — | — | ALL |
| `fixed_routes` | ALL where `org_id` matches | SELECT | — | ALL |

---

## 6. URL Structure and Routing

### Route Map

| URL | Purpose | Auth |
|-----|---------|------|
| `[slug].fleetos.app/` | Customer booking form | Anonymous |
| `[slug].fleetos.app/join` | Driver join (`?code=XXXX` auto-fills) | Phone + join code |
| `[slug].fleetos.app/admin` | Org admin dashboard | Supabase email/password |
| `[slug].fleetos.app/driver` | Driver app | Phone login (post-approval) |
| `[slug].fleetos.app/super` | FleetOs super-admin panel | Supabase email/password |

### Hostname Resolution

On app load, org is resolved from hostname:
1. If hostname ends with `.fleetos.app` → slug = subdomain → lookup `organizations.slug`
2. Else → lookup `organizations.custom_domain`
3. Org context (org_id, branding) stored in React context for the session

### Custom Domain

Operator sets a CNAME from `book.anilcabs.com` to `anilcabs.fleetos.app`. Super-admin stores `custom_domain` on the org row. All routes behave identically.

---

## 7. Auth Roles and Identity

| Role | Credential | Entry Point | Identity Source |
|------|-----------|-------------|----------------|
| Super-admin | Email + password | `/super` | `super_admin_users` table |
| Org admin | Email + password | `/admin` | `organizations.admin_user_id` |
| Driver | Phone + join code | `/join` | `drivers.phone` |
| Customer | Anonymous | `/` | None |

**Org admin** is created via Supabase Auth invite email triggered by super-admin. First login sets permanent password.

**Driver** authenticates with phone + the org's join code. WhatsApp OTP if configured, otherwise admin-approval gate.

**Customer** is anonymous. Name + phone captured on booking form only.

---

## 8. Org Lifecycle — Creation and Onboarding

### Super-admin creates org
1. Fills: org name, admin email, slug (auto-generated from name, editable)
2. System generates 4-char join code
3. `organizations` row inserted → org immediately live at `[slug].fleetos.app`
4. Supabase Auth invite email sent to admin

### Admin first login
- Redirected to dashboard
- Setup banner (dismissible, not a hard gate):
  - ☐ Set pricing
  - ☐ Add first driver
  - ☐ Add fixed route
- Each item deep-links to the relevant section

### Org settings (admin-editable)
Brand name, logo, primary color, custom domain, WhatsApp API key, report frequency, Google Drive connection.

---

## 9. Driver Onboarding Flow

```
Driver opens [slug].fleetos.app/join?code=XXXX
  → Code auto-filled → enters phone
  → System validates code matches org.join_code
  → [WhatsApp configured] Send OTP → verify → pending_approval row created
  → [No WhatsApp] pending_approval row created directly
  → "Request sent — admin will approve you shortly"

Admin approves in Fleet Health tab:
  → Select: Regular / Temporary
  → If Temporary: toggle "Require odometer photos"
  → Set vehicle model + plate number
  → Approve → status = 'free'

Driver returns to /join → phone lookup → enters app
```

---

## 10. Customer Booking Flow

Simple public form at `[slug].fleetos.app`. Shows operator branding only.

Fields: name, phone, trip type, pickup, drop, scheduled date/time, stops (optional), estimated hours, days, return date, driver stay toggle.

On submit: `bookings` row inserted with `status = 'pending'`, `org_id` from tenant context. Success message shows operator brand name. All follow-up by operator via their own channels.

---

## 11. Super-Admin Panel

Org list with aggregate stats: total bookings, total revenue, active drivers, last activity.

Actions per org: create, view aggregate stats, reset admin password, regenerate join code, set custom domain.

Super-admin does NOT have row-level access to any org's bookings, drivers, or payment data.

---

## 12. AI Touchpoints

Design principle: every feature captures data that makes the LLM answer better. Every answer is traceable to a specific data row or export file.

### 12.1 Odometer Photo Scanning (v1)

Driver uploads photo → Supabase Storage trigger → Edge Function calls Claude Vision API → extracts km reading → writes `odometer_start_reading` / `odometer_end_reading` to booking.

Failure: if Claude returns ambiguous result, field left null, admin sees manual entry prompt.

LLM value: actual trip distance, mileage audits, expense validation.

### 12.2 Auto-Dispatch Scoring (v1)

On DispatchEngine open: score all free drivers by conflict window (±2hr/4hr) and simulated distance. Sort by score. Show top recommendation. Writes `dispatched_at` on assignment.

LLM value: dispatch latency patterns, driver assignment distribution.

### 12.3 Pricing Suggestions (v1)

When admin creates booking: suggest fare from `org_pricing` + trip type + estimated distance. Admin accepts or overrides. Both values logged.

LLM value: fare consistency, override patterns, systematic under/overcharging.

### 12.4 State Change Audit Trail (v1 — always on)

Every booking state writes a timestamp: `created_at`, `dispatched_at`, `trip_started_at`, `trip_completed_at`, `payment_confirmed_at`. Passive, no UI required.

LLM value: full operational timeline, SLA tracking, bottleneck detection.

### 12.5 Periodic Export with AI Summary (v2)

Supabase cron Edge Function runs daily, checks each org's `report_frequency_days`. Generates CSV package + AI-written narrative summary via Claude. Delivers to Google Drive (if connected) or emails to admin.

### 12.6 Ad-hoc Export (v2)

Admin triggers date-range export from dashboard. Same package as 12.5. Delivered as ZIP download.

### 12.7 RAG Chat Interface (v3)

Admin types question → Edge Function embeds query → vector search against indexed Drive exports → Claude answers with data citation. Requires Google Drive connected + pgvector.

---

## 13. Data Export Package

```
/{brand-name}-export-{YYYY-MM-DD}/
  bookings.csv       — all bookings in period with all fields
  drivers.csv        — driver list with trip counts, collection totals
  collections.csv    — daily collection summary
  handovers.csv      — cash handover log with approval status
  summary.md         — AI-generated narrative (Claude)
  summary.pdf        — PDF version for sharing
```

AI summary covers: total trips, revenue, top driver, peak booking hour, collection rate, anomalies.

---

## 14. Google Drive Integration

OAuth 2.0 flow: admin connects Drive → tokens stored in `organizations.google_drive_token`. Edge Function uploads to:

```
FleetOs Exports/{brand_name}/{YYYY-MM-DD}-export/
```

Token auto-refreshed before each upload. If refresh fails: falls back to email, admin notified to reconnect.

---

## 15. RAG Chat Interface (v3)

After each Drive upload: Edge Function indexes CSVs into pgvector table (`export_embeddings`). Admin chat queries are embedded, matched against chunks, sent to Claude with source context. Every answer includes a citation: "Based on your export from March 21…"

---

## 16. Schema Migration Strategy

1. Back up current `Drivers` and `bookings table` data as JSON/CSV
2. Create new tables per spec
3. Insert first org (Anil Cabs)
4. Migrate existing rows with `org_id` set to Anil Cabs org id
5. Enable RLS on all new tables
6. Update all application code: `from('Drivers')` → `from('drivers')`, `from('bookings table')` → `from('bookings')`
7. Verify with end-to-end test before dropping old tables

Old tables are not dropped until row counts are verified and a full backup is confirmed.

---

## 17. Build Order

| # | Sub-project | Deliverables | AI unlocked |
|---|-------------|-------------|-------------|
| 1 | Multi-tenancy foundation | Schema, RLS, org creation, subdomain routing | — |
| 2 | Org admin onboarding | Invite flow, setup banner, pricing config, branding | Pricing suggestions |
| 3 | Driver onboarding | Join code, phone login, approval + odometer toggle | — |
| 4 | AI odometer scanning | Storage + Edge Function + Claude Vision | Odometer reading |
| 5 | Dispatch engine upgrade | Conflict scoring, audit timestamps | Auto-dispatch |
| 6 | Data export v1 | CSV download, email, AI summary | Periodic export |
| 7 | Google Drive | OAuth, periodic sync, folder structure | Drive delivery |
| 8 | RAG chat | Drive indexing, pgvector, Claude chat | Full LLM chat |

---

## 18. Open Questions

| Question | Status |
|----------|--------|
| WhatsApp OTP vendor | Operator provides their own WA Business API key |
| Driver GPS update frequency | TBD — needs background job in driver app |
| PDF generation library | TBD — Puppeteer in Edge Function or third-party |
| pgvector availability | Confirm enabled before v3 work begins |
| Custom domain SSL | TBD — Vercel/Cloudflare proxy or operator-managed |
| Join code rotation | Currently static, manually rotated by admin |

---

*End of spec. Authoritative design reference for FleetOs multi-tenancy and AI enablement — 2026-03-26.*
