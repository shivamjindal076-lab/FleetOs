# FleetOs — Operator Onboarding Guide
*For first-time fleet operators. Simple, step-by-step.*

---

## Before You Start

Here's what you'll need:
- Your company name and admin email address
- A smartphone (for testing the driver app)
- Your WhatsApp Business API key *(optional — you can skip this for now)*

The FleetOs team will set up your account and send you an invite email. Everything starts from there.

---

## Section 1: Getting Started (10 minutes)

### Step 1: Check your email
You'll receive an invite email from FleetOs. It will look like:

> *"You've been invited to manage [Your Company Name] on FleetOs. Click the link below to set your password and get started."*

Click the link. It will open your dashboard in the browser.

---

### Step 2: Set your password
You'll be asked to create a password. Choose something you'll remember — you'll use this every time you log in.

**Your dashboard link will be:**
`yourcompanyname.fleetos.app/admin`

Bookmark this. This is your control centre.

---

### Step 3: See your dashboard for the first time
Once you log in, you'll see the main admin dashboard. At the top, there may be a setup banner:

```
┌──────────────────────────────────────────┐
│  Welcome! Here's what to do first:       │
│                                          │
│  ☐  Set your pricing                    │
│  ☐  Add your first driver               │
│  ☐  Add a fixed route                   │
│                                          │
│  [Set up now]              [Skip]        │
└──────────────────────────────────────────┘
```

You can follow the setup steps or skip and come back later. Nothing is locked — you can add drivers and bookings even before setting prices.

---

## Section 2: Setting Up Your Fleet (Day 1)

### Step 4: Set your pricing (optional but recommended)

Go to **Settings → Pricing**.

Fill in your rates:

| Rate | Example (Jaipur) |
|------|-----------------|
| City per km | ₹12/km |
| Airport flat fare | ₹500 |
| Outstation per km | ₹14/km |
| Sightseeing per hour | ₹150/hr |
| Driver stay per night | ₹500 |
| Night surcharge | 10% |

You can also set vehicle multipliers:
- Sedan: 1.0× (no extra)
- SUV: 1.3× (30% premium)

**Tip:** These are used to *suggest* a fare when you create a booking. You can always change the fare manually before saving.

---

### Step 5: Find your driver join code

Go to **Fleet Health** tab in your dashboard.

You'll see your **Driver Join Code** — a 4-character code like `A3KX`.

Below the code, there's a **Copy Link** button. This generates a link like:
`yourcompanyname.fleetos.app/join?code=A3KX`

---

### Step 6: Share the join link with your drivers

Send this link to your drivers on WhatsApp. They just need to:
1. Open the link
2. Their join code is already filled in
3. Enter their phone number
4. Submit

That's it. They don't need to create an account or remember a password.

**Tip:** Pin this link in your driver WhatsApp group so any new driver can join easily.

---

### Step 7: Approve a driver request

When a driver submits the join form, you'll see them in **Fleet Health → Pending Approvals**.

Click **Approve** on their card. You'll see options:

- **Driver type:** Regular or Temporary
- **Vehicle model:** Enter the car model (e.g., Maruti Swift)
- **Plate number:** Enter the registration number

**If you select Temporary**, an extra toggle appears:
- **Require odometer photos:** Turn this ON if you want the driver to photograph the odometer at the start and end of every trip.

Click **Approve**. The driver is now active and can log in.

---

### Step 8: Add a fixed route (optional)

Go to **Settings → Fixed Routes**.

Add routes your fleet does regularly. For example:
- Jaipur → Ajmer: ₹800 flat fare
- Jaipur Airport → City: ₹600 flat fare

When you create a booking for these routes, the fare will be pre-filled automatically.

---

## Section 3: Managing Bookings (Daily Use)

### How a booking comes in

Your customer booking link is:
`yourcompanyname.fleetos.app`

Share this with customers. When they fill the form, the booking appears in your **Today's Board** tab under **Instant Queue** (for immediate trips) or **Scheduled Today**.

---

### Step 9: Create a booking manually

Most bookings in Indian fleets come via phone or WhatsApp. You can enter them manually.

Click the **+** button (bottom right of dashboard) to open the New Booking sheet.

Fill in:
- Customer name and phone
- Trip type (City / Airport / Outstation / Sightseeing)
- Pickup and drop locations
- Date and time
- Fare (or let the pricing engine suggest one)

Click **Save Booking**. It appears in your queue immediately.

---

### Step 10: Assign a driver (Dispatch)

Find the booking in your queue. Click **Assign Driver**.

The Dispatch Engine opens and shows you:
- **Available drivers** — ranked by proximity and scheduling fit
- **Recommended driver** — the best match highlighted in green
- **Busy drivers** — drivers with a conflicting booking nearby in time

Click **Assign** next to the driver you want. The booking is confirmed and the driver is notified.

---

### Step 11: Log a payment after the trip

Find the booking card (in Today's Board or Collections tab). Click **Log Payment**.

A payment sheet opens:
- Enter the amount received
- Select method: **Cash**, **UPI**, or **Card**
- Click **Mark as Received**

The booking card updates to green (paid) immediately.

---

### Step 12: View today's collections summary

At the top of **Today's Board**, you'll see the **Payment Summary card**:

- Total fare billed today
- Amount collected (cash + digital)
- Number of pending payments
- Progress bar showing collection %

This updates in real time as you log payments.

---

## Section 4: Tracking Your Fleet (Daily Use)

### Driver status indicators

In **Fleet Health**, each driver shows a status dot:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Free | Available for a new trip |
| 🟡 Amber | On Trip | Currently on an assigned booking |
| 🔴 Red | Offline | Not available |
| ⚪ Grey | Pending | Waiting for your approval |

---

### Step 13: Approve a cash handover

When a driver hands over cash at the end of the day, they log it in the driver app.

You'll see a **Pending Handover** card in **Today's Board**.

Click **Approve** to confirm you've received the cash. The driver's handover record is marked as settled.

**Tip:** Do this at the end of every day. It keeps your cash records clean and prevents disputes.

---

### Step 14: View collections by day, week, or month

Go to the **Collections** tab.

Use the toggle to switch between:
- **Day** — all bookings for a single date
- **Week** — bar chart showing daily collections for the week
- **Month** — weekly breakdown for the full month

Use the left/right arrows to navigate to previous periods.

---

### Step 15: See driver performance

In **Fleet Health**, click on any driver's card to expand it.

You'll see:
- Total trips this period
- Cash collected
- Pending collections

Switch the period between Day, Week, and Month using the toggle above the driver list.

---

## Section 5: Getting Your Data (Weekly / Monthly)

### Step 16: Download your data

Go to **Settings → Export Data**.

Pick a date range and click **Download**. You'll get a ZIP file containing:
- `bookings.csv` — all trip records
- `drivers.csv` — driver list with trip counts
- `collections.csv` — daily collection summary
- `handovers.csv` — cash handover log
- `summary.md` — an AI-written summary of the period

**Tip:** Share the summary with your business partner or accountant — it's written in plain language, not spreadsheet numbers.

---

### Step 17: Connect Google Drive (for automatic exports)

Go to **Settings → Google Drive**.

Click **Connect Drive** and log in with your Google account. Grant access when prompted.

Once connected:
- FleetOs will automatically upload your data every **7, 14, or 21 days** (you choose)
- Files go to a `FleetOs Exports` folder in your Drive
- You'll always have a clean copy of your operational data in your own Google account

**Why this matters:** Your data is in your Drive, not just in our system. Even if you ever switch platforms, your history is yours.

---

### Coming Soon: Ask questions about your fleet

Once your Google Drive is connected and a few exports are stored, you'll see a new button in your dashboard: **Ask your data**.

You'll be able to type questions like:
- *"Which driver collected the most cash last month?"*
- *"What's my busiest booking hour on weekdays?"*
- *"How many outstation trips did we do in March?"*

The system will answer using your actual data and tell you exactly which export file the answer came from.

---

## Quick Reference Card

| Task | Where to find it |
|------|-----------------|
| Log in | `yourcompanyname.fleetos.app/admin` |
| Create a booking | **+** button, bottom right |
| Assign a driver | Booking card → **Assign Driver** |
| Log a payment | Booking card → **Log Payment** |
| View today's summary | **Today's Board** → top card |
| Find driver join link | **Fleet Health** tab → Join Code section |
| Approve a new driver | **Fleet Health** → Pending Approvals |
| Approve cash handover | **Today's Board** → Pending Handovers |
| View collections | **Collections** tab |
| Download data | **Settings** → Export Data |
| Connect Google Drive | **Settings** → Google Drive |

---

## Tips for Indian Fleet Operators

**Sharing the join link:**
Send the driver join link via your WhatsApp group. When a driver clicks it, their join code is already filled in — they just enter their phone number. Takes 30 seconds.

**Cash handover workflow:**
Train your drivers to log their handover in the app *before* physically handing over the cash. This creates the record first, then you approve it when you receive the money. Prevents any "I already gave you that" disputes.

**Outstation trips:**
When creating an outstation booking, fill in **Number of Days** and check **Driver Stay Required** if applicable. The pricing engine will include driver accommodation costs in the suggested fare.

**Temporary drivers:**
Turn on **Require odometer photos** for any temporary or hired driver. FleetOs will automatically read the odometer values from their photos using AI — so you always know the exact distance driven, with no manual entry required.

**WhatsApp Business API:**
If your company has a WhatsApp Business account, add your API key in **Settings → WhatsApp**. This enables automatic OTP verification when drivers join — faster onboarding, no manual approval needed for new drivers.

---

*For support, contact your FleetOs account manager. For technical issues, email the FleetOs team.*
