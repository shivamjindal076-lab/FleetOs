# FleetOs — Business Requirements Document (BRD)
**Date:** 2026-03-26
**Version:** 1.0
**Status:** Approved

---

## 1. Executive Summary

FleetOs is a B2B white-label fleet operations SaaS built for the Indian market. It gives fleet operators — cab companies, rental fleets, logistics providers — a structured backend to manage their drivers, dispatch trips, track payments, and eventually access AI-powered operational intelligence.

FleetOs is invisible to end customers. Each operator runs it under their own brand. The platform's long-term value proposition is not just operations management but data accumulation: every action logged today becomes a training signal for the AI layer tomorrow.

---

## 2. Business Problem

Fleet operators in India today run their operations on:
- WhatsApp groups for driver communication
- Excel sheets for trip logs and collections
- Mental ledgers for cash handovers
- No structured dispatch — whoever picks up the phone gets the job

This results in:
- Cash leakage (untracked collections, no handover audit)
- Dispatch conflicts (same driver double-booked)
- No operational visibility (no data on peak times, driver performance, collection rates)
- No scalability (owner is the system)

FleetOs solves this by replacing the WhatsApp + Excel stack with a structured, AI-ready operations backend.

---

## 3. Business Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Acquire fleet operators as B2B clients | Number of orgs onboarded | 5 orgs in 6 months |
| Prove operational value per org | Bookings processed per org per month | >50 bookings/month per active org |
| Build a data asset | Structured booking + payment records per org | 100% of bookings logged in platform |
| Monetize AI layer | Data export adoption + AI chat usage | >80% of orgs use periodic export |
| Scale without proportional cost | Infrastructure cost per org | <$2/org/month at 20 orgs |

---

## 4. Stakeholders

| Stakeholder | Role | Needs |
|-------------|------|-------|
| FleetOs super-admin | Platform operator (us) | Create and manage orgs, view aggregate health across all operators |
| Fleet operator (org admin) | B2B customer | Manage their fleet, drivers, bookings, and collections under their own brand |
| Driver | End operator of driver app | Accept trips, log odometer, hand over cash |
| Customer (passenger) | End user of booking form | Book a trip anonymously — no platform account |

---

## 5. Business Requirements

### BR-01: Multi-Tenancy with Hard Data Isolation
Each fleet operator's data must be completely isolated from other operators. An operator must never be able to see, modify, or access another operator's drivers, bookings, or financial data. This is a non-negotiable trust requirement for any B2B SaaS.

### BR-02: White-Label Branding
Operators must be able to present FleetOs as their own product. Each org can configure their brand name, logo, and primary color. FleetOs branding is hidden by default. This is necessary for operator adoption — cab company owners will not want their drivers and customers to know they're using a third-party platform.

### BR-03: Zero-Friction Org Setup
A new operator must be live on their own branded subdomain within minutes of FleetOs creating their org. No infrastructure setup, no DNS configuration, no technical knowledge required from the operator.

### BR-04: Structured Data Capture
Every operational action — booking created, driver assigned, trip started, payment logged, cash handed over — must be captured with timestamps and stored in a queryable format. This is the data asset that makes the AI layer possible.

### BR-05: Periodic Data Delivery to Operators
Operators must receive their own data on a regular cadence (every 7, 14, or 21 days) so they can build their own records, share with accountants, and trust that their data is accessible regardless of the platform's future.

### BR-06: AI-Powered Operational Intelligence (Long Game)
The platform must be designed so that accumulated operational data can be queried by an LLM. Operators should eventually be able to ask plain-language questions about their fleet and receive data-backed answers. Every feature built today must be designed with this future in mind.

### BR-07: Indian Market Fit
The platform must work within the constraints of the Indian fleet operator market:
- WhatsApp-first communication (driver OTP via WhatsApp Business API)
- Indian number formatting (₹, en-IN locale, 10-digit phone numbers)
- Low-end Android device support for driver app
- Cash-heavy payment environment (cash handover workflow is core, not secondary)

---

## 6. Success Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Orgs onboarded | Number of fleet operators live on the platform | 5 in 6 months |
| Monthly active orgs | Orgs with >10 bookings in the past 30 days | 80% of onboarded orgs |
| Booking log rate | % of trips logged in FleetOs vs estimated total trips | >90% |
| Collection rate tracked | % of completed bookings with payment logged | >85% |
| Export adoption | % of orgs that have downloaded or received at least one data export | >80% |
| Driver onboarding time | Time from join link shared to driver approved and active | <30 minutes |
| Dispatch conflict rate | % of assigned trips with a conflicting booking for the same driver | <2% |

---

## 7. Revenue Model

### Phase 1 — Foundation (current)
Free for pilot orgs (Anil Cabs and initial partners). Goal: prove value and collect feedback.

### Phase 2 — SaaS Subscription
Monthly subscription per org, tiered by fleet size:
- **Starter** (up to 10 drivers): ₹1,500/month
- **Growth** (up to 30 drivers): ₹3,500/month
- **Scale** (unlimited drivers): ₹7,000/month

### Phase 3 — AI Features as Premium Tier
- Google Drive sync + periodic AI summary: included in Growth and Scale
- RAG chat interface ("Ask your data"): premium add-on or Scale-only feature

### Phase 4 — Data Intelligence Services
As the platform accumulates multi-org data, aggregate (anonymized) insights become a potential product for logistics planning, demand forecasting, and route optimization.

---

## 8. Constraints

| Constraint | Impact |
|------------|--------|
| Supabase free tier (500 MB DB, 50k MAU) | Limits scale before paid upgrade; acceptable for 0–20 orgs |
| WhatsApp Business API access | Operators must have their own WA Business account for OTP delivery; otherwise fallback to admin-approval |
| Driver device quality | Driver app must function on low-end Android (2 GB RAM, 4G connectivity); no heavy libraries |
| Indian regulatory environment | No payment processing in-platform (avoids RBI payment aggregator licensing); fare and collection are logged, not processed |
| Single developer team | Architecture must minimize operational complexity; one Supabase project, one Vercel deployment |

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Operator data privacy concerns | Medium | High | Hard RLS isolation + operator controls their own data export to their own Drive |
| WhatsApp Business API unavailable for small operators | High | Medium | Admin-approval fallback for driver onboarding; no hard dependency |
| Driver phone OTP delivery failure | Medium | Medium | Fallback to admin-approval gate; no trip blocked by OTP failure |
| Operator churn before AI layer is built | Medium | High | Deliver operational value (dispatch, payments, exports) before AI — AI is the retention moat, not the entry point |
| Supabase RLS misconfiguration causing data leak | Low | Critical | End-to-end tests for cross-org isolation; RLS tested at migration time before any org goes live |

---

*End of BRD. Paired with PRD (2026-03-26-fleetos-prd.md) and Architecture Spec (specs/2026-03-26-multi-tenancy-ai-design.md).*
