# FleetOs — Claude Context File
> Paste this file at the start of any new Claude conversation to restore full project context.
> Last updated: 2026-03-17 | Branch: main

---

## 1. PROJECT OVERVIEW

**FleetOs** is a React SPA for fleet/ride management built on Supabase.
Three user roles, each with a dedicated UI:

| Role | Entry Point | Auth |
|---|---|---|
| Customer | `CustomerHome` | None |
| Driver | `DriverLoginPage` → `DriverApp` | Phone OTP (mock) |
| Admin/Staff | `LoginPage` | Email + password (Supabase Auth) |

**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + React Query

---

## 2. DIRECTORY STRUCTURE

```
src/
├── pages/
│   └── Index.tsx                  # Main router (customer/admin/driver/pricing views)
│
├── components/
│   ├── auth/
│   │   ├── LoginPage.tsx          # Admin email/password login + role selector tiles
│   │   └── DriverLoginPage.tsx    # Driver phone OTP flow
│   │
│   ├── admin/
│   │   ├── AdminDashboard.tsx     # Fleet dashboard (today board + fleet health tabs)
│   │   ├── DispatchEngine.tsx     # Smart driver assignment dialog
│   │   ├── PaymentSummary.tsx     # Today's collections progress card
│   │   ├── PricingEngine.tsx      # Fare config (base, per-km, night surcharge, surge)
│   │   └── NewBookingSheet.tsx    # Manual booking creation UI
│   │
│   ├── customer/
│   │   ├── CustomerHome.tsx       # Hero, available cars, popular routes, recent rides
│   │   ├── BookingFlow.tsx        # 3-step: trip type → form → summary
│   │   ├── TripTypeSelector.tsx
│   │   ├── BookingForm.tsx
│   │   ├── BookingSummary.tsx
│   │   ├── BookNowFlow.tsx
│   │   ├── LocationInput.tsx
│   │   ├── CityTracking.tsx
│   │   ├── IntercityTracking.tsx
│   │   └── ScheduleRideFlow.tsx
│   │
│   ├── driver/
│   │   └── DriverApp.tsx          # Full driver dashboard (~1200 lines, 5 screens)
│   │
│   └── ui/                        # 55+ shadcn/ui components (do NOT modify)
│
├── hooks/
│   ├── useAuth.tsx                # AuthProvider + useAuth (Supabase session)
│   ├── useSupabaseData.ts         # All data queries (drivers, bookings, routes, handovers)
│   ├── useUserRole.ts             # isAdmin / isDriver from user_roles table
│   ├── useDriversPublic.ts        # Free driver count for customer view
│   └── use-mobile.tsx, use-toast.ts
│
├── integrations/supabase/
│   ├── client.ts                  # createClient (URL + anon key)
│   └── types.ts                   # Generated DB types
│
└── data/mockData.ts
```

---

## 3. ROUTING — `src/pages/Index.tsx`

```typescript
type AppView = 'customer' | 'admin' | 'driver' | 'pricing'
```

- View persisted in `localStorage('fleetos_view')`
- **Protected views** (require auth): `admin`, `pricing`
- `driver` view is NOT auth-protected — handled by `DriverLoginPage` internally
- Auto-routes: isAdmin → 'admin', isDriver → 'driver' on login
- Bottom nav shows only views applicable to the current user

Key render:
```tsx
{view === 'customer' && <CustomerHome />}
{view === 'admin'    && <AdminDashboard />}
{view === 'driver'   && <DriverLoginPage />}   // DriverApp rendered inside
{view === 'pricing'  && <PricingEngine />}

// LoginPage shown when needsAuth && !user
<LoginPage onDriverSelect={() => handleSetView('driver')} />
```

---

## 4. AUTH — `src/hooks/useAuth.tsx`

```typescript
interface AuthContext {
  user: User | null
  session: Session | null
  loading: boolean
  signIn(email, password): Promise<{error}>
  signUp(email, password): Promise<{error}>
  signOut(): Promise<void>
}
```

- Supabase email/password auth
- Session persisted in localStorage, auto-refresh enabled
- Do NOT modify this file

---

## 5. DRIVER LOGIN FLOW — `src/components/auth/DriverLoginPage.tsx`

State machine — type `Screen = 'phone' | 'otp' | 'holding' | 'app'`

```
phone screen
  → user enters 10-digit mobile
  → queries Drivers table: .ilike('phone', '%${phone.slice(-5)}')
  → moves to otp screen

otp screen (mock — any 6-digit code accepted)
  → if foundDriver.status === 'free' | 'on-trip'  → screen = 'app'
  → if foundDriver.status === 'pending_approval'   → screen = 'holding'
  → if !foundDriver + otp complete                 → show name registration
      → insert {name, phone: '+91'+phone, status:'pending_approval'}
      → screen = 'holding'

holding screen
  → "Application Under Review" message

app screen
  → <DriverApp driverProfile={foundDriver} />
```

- Table name in queries: `'Drivers'` (capital D, no extra quotes needed with JS client)
- TODO: replace mock OTP with real Twilio SMS

---

## 6. DRIVER APP — `src/components/driver/DriverApp.tsx`

### Props
```typescript
interface DriverAppProps { driverProfile?: any }
```

### Screen navigation
```typescript
type DriverScreen = 'home' | 'active-trip' | 'earnings' | 'documents' | 'expenses'
```

### Key types
```typescript
interface ScheduledTrip {
  id: string
  customerName: string
  customerPhone: string
  pickup: string
  drop: string
  fare: number
  distance: string
  scheduledAt: string   // ISO
  tripType: 'city' | 'airport' | 'outstation' | 'sightseeing'
  status: 'pending_confirm' | 'confirmed' | 'active'
}

interface ExpenseEntry {
  id, type: 'fuel_petrol'|'fuel_cng'|'toll'|'parking'|'other',
  amount, note, tripId?, timestamp, isOffline
}

interface CashCollection {
  id, tripId, customerName, amount,
  method: 'cash'|'upi', note?, timestamp, isOffline
}
```

### State (inside DriverApp)
```typescript
const [screen, setScreen]               // DriverScreen
const [isOnline, setIsOnline]           // boolean (online/offline toggle)
const [tripPhase, setTripPhase]         // TripPhase: navigating|arrived|started|completed
const [alarmTrip, setAlarmTrip]         // ScheduledTrip | null  (TripAlarm overlay)
const [scheduledTrips, setScheduledTrips] // ScheduledTrip[]
const [expenses, setExpenses]           // ExpenseEntry[]
const [collections, setCollections]     // CashCollection[]
const [handoverLoading, setHandoverLoading]
const [bannerTrips, setBannerTrips]     // string[] (6-hour reminder IDs)
const [alarmTrips, setAlarmTrips]       // string[] (1-hour alarm overlay IDs)
```

### Profile resolution
```typescript
const { data: fetchedProfile } = useMyDriverProfile()  // fallback phone-based lookup
const myProfile = driverProfile ?? fetchedProfile       // prop takes priority
```

### Realtime subscription (inside useEffect)
```typescript
supabase.channel('driver-trips')
  .on('postgres_changes', {
    event: '*', schema: 'public',
    table: 'bookings table',
    filter: `driver_id=eq.${myProfile.id}`
  }, payload => {
    // On UPDATE + status==='confirmed' → add to scheduledTrips + fire TripAlarm
  })
```

### Trip reminder logic
- `checkReminders()` runs on mount and every 60s
- ≤ 6 hours: shows dismissible banner (blue, top of screen)
- ≤ 1 hour: shows full-screen alarm overlay (position:absolute)
- Dismissals stored in `localStorage('dismissed_6hr_' + tripId)` etc.

### Sub-components in this file
- `TripAlarm` — full-screen orange alarm with countdown + audio beep
- `MaskedCallButton` — simulated call with timer
- `ExpenseTracker` — full expense + cash collection UI
- `ScheduledTripCard` — individual trip card with confirm button

### Mock data
```typescript
const SCHEDULED_TRIPS: ScheduledTrip[] = [
  { id:'BK-2847', tripType:'airport', status:'pending_confirm', fare:4300, ... },
  { id:'BK-2851', tripType:'outstation', status:'confirmed', fare:3200, ... }
]
```

### Screens summary

| Screen | Description |
|---|---|
| **home** | Scheduled trips, trip alarm, banner/alarm reminders, earnings summary |
| **active-trip** | Navigation phases, customer info, masked call, phase buttons |
| **expenses** | Expense log + cash collections + handover button |
| **earnings** | Daily/weekly/monthly stats, rating, acceptance rate |
| **documents** | License, RC, Insurance, Fitness, PAN — with status badges |

---

## 7. ADMIN DASHBOARD — `src/components/admin/AdminDashboard.tsx`

### Tabs: `'today' | 'fleet'`

**Today's Board:**
- Live map placeholder (driver location dots)
- Driver status: free (green pulse) | on-trip | offline
- **Instant Queue**: pending bookings → Dispatch / Call buttons
- **Scheduled Today**: confirmed bookings for today
- **Upcoming (7 days)**: future bookings
- Payment badges: Paid | Partial | Pending | Unpaid

**Fleet Health:**
- Pending driver approvals (approve + select vehicle, or reject)
- Active drivers: name, vehicle, plate, today's cash, handover status, call button

### Key actions
```typescript
handleApprove(driverId)     // UPDATE Drivers SET status='free', vehicle_model=...
handleReject(driverId)      // DELETE FROM Drivers WHERE id=...
handleMarkPayment(bookingId) // UPDATE bookings SET amount_collected, payment_method, payment_confirmed_at
```

---

## 8. DISPATCH ENGINE — `src/components/admin/DispatchEngine.tsx`

- Filters free drivers
- Simulated distance (1.5 + i*2.3 km), ETA (distance * 3.2 min)
- Score = max(100 - distance*5, 20)
- Shows top 3 ranked candidates
- Assign → `UPDATE "bookings table" SET driver_id=..., status='confirmed'`

---

## 9. PRICING ENGINE — `src/components/admin/PricingEngine.tsx`

```
City:       baseFare=50,  perKm=14, perMin=2,   minFare=100
Airport:    baseFare=100, perKm=16, perMin=2,   minFare=350
Sightseeing:baseFare=500, perKm=12, perMin=1.5, minFare=1500
Outstation: baseFare=200, perKm=11, perMin=0,   minFare=1500
```

- Night surcharge: 11 PM – 5 AM (+25–30%)
- Surge multiplier toggle (1.3–1.5×)

---

## 10. CUSTOMER SIDE

**CustomerHome:** Hero → quick stats (free drivers, rating) → popular routes → recent rides

**BookingFlow (3 steps):**
1. TripTypeSelector — city / airport / outstation / sightseeing
2. BookingForm — pickup, drop, stops, scheduled time, passenger count
3. BookingSummary — review + submit

Submits to `bookings table` with status='pending'

---

## 11. DATA HOOKS — `src/hooks/useSupabaseData.ts`

```typescript
useDrivers()              // All Drivers rows
useBookings()             // All bookings, ordered by scheduled_at DESC
useFixedRoutes()          // fixed_routes table
useMyDriverProfile()      // Current driver by phone: .ilike('phone', `%${last10}`)
useTodayHandover(driverId) // cash_handovers for today
useTodayCashHandovers()   // All handovers between start/end of today
```

**Key interfaces:**
```typescript
SupabaseDriver: id, name, phone, vehicle_model, plate_number,
  status ('free'|'on-trip'|'offline'|'pending_approval'),
  location_lat, location_lng, created_at

SupabaseBooking: id, customer_name, customer_phone, country_code,
  pickup, drop, trip_type, status, fare, driver_id, scheduled_at,
  stops, estimated_hours, number_of_days, driver_stay_required,
  return_date, payment_method, amount_collected, payment_confirmed_at, notes

FixedRoute: id, origin, destination, per_km_rate, fixed_fare
CashHandover: id, driver_id, amount, handed_over_at
```

---

## 12. DATABASE TABLES (Supabase)

| Table | Purpose |
|---|---|
| `Drivers` | Driver profiles (capital D) |
| `bookings table` | Trip bookings (note the space in name) |
| `fixed_routes` | Preset popular routes |
| `cash_handovers` | End-of-day cash settlement records |
| `user_roles` | Maps auth user_id → role ('admin'/'driver') |
| `drivers_public` | Read-only view for customer (free driver count) |
| `call_recordings` | Masked call logs |

**Important:** Table `bookings table` has a space — use quotes when needed in raw SQL.
In JS Supabase client: `.from('bookings table')` works fine without extra quoting.

---

## 13. SUPABASE CONFIG

```typescript
URL: https://vplydlocixunrnjlftbk.supabase.co
// anon key is in src/integrations/supabase/client.ts
```

Realtime is used for:
- `bookings table` — driver trip notifications in DriverApp
- Ensure `REPLICA IDENTITY FULL` and replication enabled on this table

---

## 14. CONSTRAINTS & CONVENTIONS

- **Do NOT modify** `/components/ui/` or `useAuth.tsx`
- Table `Drivers` — always capital D
- `bookings table` — has a space, use `.from('bookings table')`
- Driver phone lookup: `.ilike('phone', '%${last10}')` where last10 = last 10 digits stripped of non-digits
- OTP flow is currently mock — any 6-digit code accepted; TODO: Twilio SMS
- `driverProfile` prop on DriverApp takes priority over `useMyDriverProfile()` hook result
- Outermost div in DriverApp is `relative min-h-screen` (for position:absolute alarm overlays)
- Expense/collection data is offline-capable (saved in state, `isOffline` flag)
- Cash handover amounts stored as `Math.round(amount * 100) / 100`

---

## 15. RECENT WORK (last 10 commits on main)

| Commit | Change |
|---|---|
| `573d701` | fix: driver name from prop, remove mock trips, notes in collections |
| `f6841ea` | fix: driver phone lookup |
| `944d911` | fix: supabase data hook updates |
| Merge PR #2 | payment-alerts branch merged |
| `b81107d` | feat: driver OTP login flow (DriverLoginPage + LoginPage role tiles + Index routing) |
| `f4bec02` | feat: driver realtime trip notification (useEffect subscription) |
| `15774e2` | feat: driver realtime trip notification |
| `61acf7a` | feat: dispatch to Supabase, payment logging, role-based auth, cash handover, alarm sound |

**Current uncommitted:** `DriverLoginPage.tsx`, `DriverApp.tsx` (trip reminder logic added)

---

## 16. KNOWN TODOS / PENDING WORK

- [ ] Replace mock OTP with real Twilio SMS integration
- [ ] Enable Supabase realtime on `bookings table` (REPLICA IDENTITY FULL + replication toggle)
- [ ] Driver GPS location updates to Supabase
- [ ] Real-time map in AdminDashboard (currently simulated dots)
- [ ] Earnings data from real bookings (currently hardcoded mock)
- [ ] Sync offline expenses/collections to Supabase when back online
- [ ] Document upload (currently status-only, no file storage)
- [ ] Customer auth + ride history
- [ ] Push notifications (currently browser-only alarm)
