# FleetOs — Product Requirements Document (PRD)
**Date:** 2026-03-26
**Version:** 1.0
**Status:** Approved
**Paired with:** BRD (2026-03-26-fleetos-brd.md), Spec (specs/2026-03-26-multi-tenancy-ai-design.md)

---

## 1. Product Overview

FleetOs is a white-label B2B fleet operations platform for Indian fleet operators. It provides a structured backend for managing drivers, dispatching trips, tracking payments, and exporting operational data.

**Three user roles:**
- **Super-admin** (FleetOs team) — creates and manages operator orgs
- **Org admin** (fleet operator) — manages their fleet from the admin dashboard
- **Driver** — receives trips, logs odometer readings, hands over cash

**Customer** is anonymous — no account, no login. Name and phone are captured on the booking form only.

---

## 2. Feature Requirements

### Priority Definitions
- **P0** — Must ship for multi-tenancy to be functional. Blocker for everything else.
- **P1** — Ship in the next iteration. High operator value, technically dependent on P0.
- **P2** — Long game. AI and data intelligence features. Depend on P1 being stable.

---

### P0 — Multi-Tenancy Foundation

#### F-001: Org Creation (Super-admin)
The super-admin can create a new fleet operator org from the super-admin panel.

**Inputs:** Org name, admin email, slug (auto-generated from org name, editable)
**Outputs:**
- `organizations` row inserted with auto-generated 4-char join code
- Supabase Auth invite email sent to admin email
- Org immediately live at `[slug].fleetos.app`

**Acceptance Criteria:**
- AC-1: After org creation, navigating to `[slug].fleetos.app` renders the customer booking form with a placeholder brand name
- AC-2: Admin receives an invite email within 60 seconds of org creation
- AC-3: Two different orgs cannot have the same slug

---

#### F-002: Subdomain Routing
The app resolves the correct org from the URL on every page load.

**Logic:**
1. Extract subdomain from `window.location.hostname`
2. Query `organizations` where `slug = subdomain`
3. If not found: show 404
4. Store org context (org_id, brand settings) in React context

**Acceptance Criteria:**
- AC-1: `anilcabs.fleetos.app` loads Anil Cabs data; `otherorgs.fleetos.app` loads that org's data — never cross-contaminated
- AC-2: Invalid slug shows a clean 404 page, not an error

---

#### F-003: Row-Level Data Isolation
Every operational table has an `org_id` column. Supabase RLS policies ensure each authenticated session can only access rows belonging to their org.

**Acceptance Criteria:**
- AC-1: An org admin authenticated to org A cannot read any rows from org B via the API, even with a direct Supabase query
- AC-2: A driver authenticated to org A cannot see bookings from org B
- AC-3: Customer INSERT on booking form is scoped to the org resolved from the URL — not user-specifiable

---

#### F-004: Org Admin Dashboard (Existing features, org-scoped)
All existing admin dashboard features (booking cards, dispatch engine, fleet health, collections) continue to work, now scoped to the authenticated admin's org.

**Acceptance Criteria:**
- AC-1: Bookings list shows only bookings where `org_id` matches the admin's org
- AC-2: Driver list shows only drivers where `org_id` matches the admin's org
- AC-3: Collections summary reflects only the admin's org's payments

---

#### F-005: Driver Join Flow
Drivers join an org by navigating to a join link and entering their phone number.

**Flow:**
1. Driver opens `[slug].fleetos.app/join?code=XXXX`
2. Join code is auto-populated from the URL parameter
3. Driver enters their phone number
4. System validates join code matches `organizations.join_code`
5. `drivers` row created with `status = 'pending_approval'`
6. Admin sees driver in Fleet Health → Pending Approvals
7. Admin approves → `status = 'free'`

**Acceptance Criteria:**
- AC-1: If `?code=` param is in the URL, the code field is pre-filled and editable
- AC-2: An invalid join code shows an error: "Invalid join code. Ask your fleet manager."
- AC-3: A driver with the same phone number who already has a `free` or `on-trip` record for this org is not duplicated — they are redirected to the driver app

---

#### F-006: Customer Booking Form (Anonymous)
A simple public form at the org root for customers to submit a trip request.

**Fields:** Name (required), Phone (required, 10-digit Indian), Trip type, Pickup, Drop, Date/time, Stops, Estimated hours, Number of days, Return date, Driver stay toggle.

**On submit:** `bookings` row inserted with `org_id` from tenant context, `status = 'pending'`. Success message shows operator brand name.

**Acceptance Criteria:**
- AC-1: Booking is created with the correct `org_id` — not user-modifiable
- AC-2: Phone field validates 10-digit Indian numbers before submission
- AC-3: Form submits successfully without any login or account creation

---

### P1 — Operator Configuration & Driver Tools

#### F-007: White-Label Branding
Org admins can configure their brand name, logo, and primary color. These are applied across all user-facing pages for their org.

**Settings:** Brand name (text), Logo (image upload → Supabase Storage), Primary color (hex color picker)

**Acceptance Criteria:**
- AC-1: Customer booking form shows operator's brand name and logo, not FleetOs
- AC-2: Primary color is applied as the UI's primary color token (buttons, accents)
- AC-3: If logo is not set, brand name is shown as text in the header

---

#### F-008: Custom Domain Support
Org admins can map their own domain to their FleetOs org.

**Setup:** Operator sets CNAME `book.anilcabs.com → anilcabs.fleetos.app`. Super-admin stores `custom_domain` on the org row.

**Acceptance Criteria:**
- AC-1: `book.anilcabs.com` renders identically to `anilcabs.fleetos.app`
- AC-2: Org resolution works from the custom domain (not just subdomain)

---

#### F-009: Pricing Configuration
Org admins can configure fare rates for their org. Rates are used to suggest fares when creating bookings.

**Settings:** City per km, Outstation per km, Airport flat fare, Sightseeing per hour, Sedan multiplier, SUV multiplier, Night surcharge %, Driver stay per night, Waiting per hour.

**Acceptance Criteria:**
- AC-1: Pricing settings page is accessible from admin dashboard settings
- AC-2: If pricing is not configured, the new booking form shows no fare suggestion (not an error)
- AC-3: Fare suggestion = (base rate × vehicle multiplier) + applicable extras, shown to admin before booking is saved

---

#### F-010: Temporary Driver + Odometer Capture
When approving a driver, admin can mark them as Temporary and enable odometer photo capture.

**Admin approval options:**
- Driver type: Regular / Temporary
- If Temporary: "Require odometer photos" toggle

**Driver app behavior (when odometer_required = true):**
- Start of trip: driver must upload odometer photo before trip begins
- End of trip: driver must upload odometer photo before marking trip complete

**AI processing:**
- Photo uploaded to Supabase Storage
- Edge Function calls Claude Vision API → extracts km reading → writes to `bookings.odometer_start_reading` / `odometer_end_reading`
- If extraction fails: field left null, admin sees "Manual entry needed" flag

**Acceptance Criteria:**
- AC-1: "Require odometer photos" toggle only appears when Temporary is selected
- AC-2: Driver app blocks "Start Trip" button if odometer photo is required and not uploaded
- AC-3: Claude Vision reads a clear odometer photo to within ±5 km accuracy

---

#### F-011: Super-Admin Panel
A hidden panel at `/super` for FleetOs team to manage all orgs.

**Features:**
- Org list with aggregate stats (bookings, revenue, active drivers, last activity)
- Create org (name, slug, admin email)
- View org detail (aggregate stats only — no row-level data)
- Reset org admin password
- Regenerate join code

**Acceptance Criteria:**
- AC-1: Super-admin cannot view individual booking records, driver names, or payment amounts for any org
- AC-2: `/super` renders a 404 or blank page for any authenticated user not in `super_admin_users`
- AC-3: Org creation sends invite email within 60 seconds

---

#### F-012: Data Export — CSV Download
Admin can download their org's data for any date range as a ZIP of CSV files.

**Files in ZIP:** bookings.csv, drivers.csv, collections.csv, handovers.csv

**Acceptance Criteria:**
- AC-1: CSV files contain only the authenticated admin's org's data
- AC-2: Date range filter correctly scopes all exported records
- AC-3: Download completes in <10 seconds for up to 1,000 bookings

---

#### F-013: Data Export — Email Delivery
A periodic automated export is emailed to the org admin at their configured frequency (7/14/21 days).

**Acceptance Criteria:**
- AC-1: Email is sent to `organizations.admin_user_id`'s email at the correct interval
- AC-2: Email contains all CSV files as attachments + an AI-generated summary as the email body
- AC-3: If email delivery fails, the failure is logged and the export is retried once

---

### P2 — AI & Data Intelligence

#### F-014: Google Drive Sync
Admin can connect their Google Drive. FleetOs uploads periodic export packages automatically.

**Acceptance Criteria:**
- AC-1: OAuth flow completes and Drive is marked connected in org settings
- AC-2: Export package is uploaded to `FleetOs Exports/{brand_name}/{date}-export/` in the operator's Drive
- AC-3: If Drive token expires, `google_drive_connected` is set to false and admin is notified

---

#### F-015: AI Export Summary
Every export package (periodic or ad-hoc) includes an AI-generated narrative summary.

**Content:** Total trips, revenue, top driver, peak booking hour, collection rate, anomalies flagged.

**Acceptance Criteria:**
- AC-1: Summary is generated by Claude API using structured stats from the export period
- AC-2: Summary references specific numbers: "17 trips completed, ₹42,300 billed, 89% collection rate"
- AC-3: If Claude API fails, export proceeds without summary (not a blocking failure)

---

#### F-016: RAG Chat Interface
Admin can ask plain-language questions about their fleet data. All answers are backed by citations from their export files.

**Acceptance Criteria:**
- AC-1: Chat is only available if Google Drive is connected and at least one export has been indexed
- AC-2: Every answer includes a source citation: "Based on your export from March 21..."
- AC-3: Questions about data not in any export return: "I don't have data for that period yet. Your next export is scheduled for [date]."

---

## 3. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Data isolation | Zero cross-org data access — enforced at DB level, not application level |
| Mobile performance | Driver app loads in <3s on 4G, functions on 2 GB RAM Android |
| Dashboard performance | Admin dashboard loads in <2s on broadband |
| Indian locale | ₹ symbol, en-IN number formatting, 10-digit phone validation, IST timestamps |
| Offline tolerance | Driver app shows last-known trip details if connectivity drops |
| Availability | Supabase SLA (99.9%) is the platform baseline |

---

## 4. Out of Scope

- Customer login or customer accounts
- In-platform payment processing (collect externally, log in FleetOs)
- Real-time driver GPS tracking (location stored, not live-streamed)
- Cross-org analytics or benchmarking
- Native mobile apps (driver app is a mobile-optimized web app)
- Multi-language support (English first; Hindi can be added later)

---

## 5. User Stories

### Super-Admin

- As a super-admin, I want to create a new org for a fleet operator in under 2 minutes so that they can start using the platform the same day I onboard them.
- As a super-admin, I want to see aggregate stats for each org (total bookings, revenue, active drivers) so that I can identify which orgs are most active and which need support.
- As a super-admin, I want to reset an org admin's password so that I can help operators who get locked out without needing database access.

### Org Admin

- As an org admin, I want to share a join link with my drivers so that they can onboard themselves without me entering their details manually.
- As an org admin, I want to assign a driver to a pending booking and see which drivers are available vs. conflicted so that I don't accidentally double-book a driver.
- As an org admin, I want to mark a payment as received after a trip so that my collections summary is always accurate.
- As an org admin, I want to download all my booking and collection data for the past month so that I can share it with my accountant.
- As an org admin, I want the platform to show my company name and logo instead of FleetOs so that my drivers and customers see my brand.

### Driver

- As a driver, I want to join my fleet using a simple link so that I don't have to fill out a lengthy form or create an account.
- As a driver, I want to see my assigned trips for the day so that I can plan my schedule.
- As a driver, I want to photograph the odometer at the start and end of a trip so that mileage is logged accurately and I'm not disputed on distance.
- As a driver, I want to record the cash I'm handing over to the admin so that there's a clear record and no disputes.

---

## 6. Acceptance Criteria Summary (P0)

| Feature | AC Count | Critical AC |
|---------|----------|-------------|
| F-001: Org creation | 3 | Invite email sent, slug unique |
| F-002: Subdomain routing | 2 | No cross-org data on wrong subdomain |
| F-003: Data isolation | 3 | Org A cannot read org B — at DB level |
| F-004: Dashboard scoping | 3 | All lists filtered by org_id |
| F-005: Driver join flow | 3 | Invalid code shows error, no duplicate records |
| F-006: Customer booking form | 3 | org_id not user-modifiable, no login required |

---

*End of PRD. Paired with BRD (2026-03-26-fleetos-brd.md) and Architecture Spec (specs/2026-03-26-multi-tenancy-ai-design.md).*
