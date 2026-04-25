/**
 * CustomerBookingForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer-facing cab booking form with Ola Maps location search.
 *
 * Features:
 *  • Pickup + Drop location search via LocationPicker (Ola Maps autocomplete)
 *  • Live route preview via BookingMap once both locations are selected
 *  • Trip type selector (City / Airport / Outstation / Sightseeing)
 *  • Date/time scheduler
 *  • Fare estimate (uses OrgPricing from Supabase)
 *  • Driver list from useDriversPublic (no auth required)
 *  • Submit creates a booking in Supabase bookings table
 *  • Fully responsive, beautiful design
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { LocationPicker, type SelectedLocation } from './LocationPicker';
import { BookingMap } from './BookingMap';
import { useOrg } from './useOrg';
import { useDriversPublic } from './useDriversPublic';
import { useOrgPricing, tripTypeLabels, tripTypeIcons } from './useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type TripType = 'city' | 'airport' | 'outstation' | 'sightseeing';

interface BookingFormState {
  customerName:  string;
  customerPhone: string;
  tripType:      TripType;
  scheduledAt:   string;
  estimatedHours?: number;
  numberOfDays?:   number;
  paymentMethod:   'cash' | 'online';
  notes:           string;
}

const db = supabase as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateFare(
  tripType: TripType,
  pickup: SelectedLocation | null,
  drop: SelectedLocation | null,
  pricing: any,
  hours?: number,
  days?: number
): number | null {
  if (!pricing) return null;

  if (tripType === 'airport' && pricing.airport_flat_fare) return pricing.airport_flat_fare;

  if (tripType === 'sightseeing' && pricing.sightseeing_per_hour && hours) {
    return Math.round(pricing.sightseeing_per_hour * hours);
  }

  if (pickup && drop) {
    const km = haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const rate = tripType === 'outstation' ? pricing.outstation_per_km : pricing.city_per_km;
    if (rate) return Math.round(km * rate * (tripType === 'outstation' ? (days ?? 1) : 1));
  }

  return null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: done ? '#22c55e' : active ? '#3b82f6' : '#e2e8f0',
      color: done || active ? '#fff' : '#94a3b8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
      transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerBookingForm() {
  const { org } = useOrg();
  const { data: driversPublic = [] } = useDriversPublic();
  const { data: pricing } = useOrgPricing();

  const [pickup, setPickup] = useState<SelectedLocation | null>(null);
  const [drop,   setDrop]   = useState<SelectedLocation | null>(null);

  const [form, setForm] = useState<BookingFormState>({
    customerName:  '',
    customerPhone: '',
    tripType:      'city',
    scheduledAt:   (() => {
      const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    })(),
    paymentMethod: 'cash',
    notes:         '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const fareEstimate = estimateFare(form.tripType, pickup, drop, pricing, form.estimatedHours, form.numberOfDays);

  // ── Step tracking
  const step1Done = !!pickup && !!drop;
  const step2Done = !!form.customerName && !!form.customerPhone && form.customerPhone.replace(/\D/g,'').length >= 10;
  const step3Done = step1Done && step2Done;

  const update = (patch: Partial<BookingFormState>) => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    if (!org || !pickup || !drop || !step2Done) return;
    setSubmitting(true);
    try {
      const { error } = await db.from('bookings').insert({
        org_id:        org.id,
        customer_name: form.customerName,
        customer_phone:form.customerPhone,
        pickup:        pickup.address,
        drop:          drop.address,
        trip_type:     form.tripType,
        scheduled_at:  new Date(form.scheduledAt).toISOString(),
        fare:          fareEstimate,
        payment_method:form.paymentMethod,
        status:        'pending',
        estimated_hours:form.estimatedHours,
        number_of_days: form.numberOfDays,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: '🎉 Booking Confirmed!', description: `Your cab is booked for ${new Date(form.scheduledAt).toLocaleString()}` });
    } catch (err: any) {
      toast({ title: 'Booking failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', background: '#fff', borderRadius: 20, padding: '48px 40px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Booking Confirmed!</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
            Your cab has been booked. Our team will assign a driver shortly.
          </p>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, textAlign: 'left', marginBottom: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>📍 {pickup?.address}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>🏁 {drop?.address}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>🕐 {new Date(form.scheduledAt).toLocaleString()}</div>
            {fareEstimate && <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginTop: 8 }}>Est. ₹{fareEstimate}</div>}
          </div>
          <button
            onClick={() => { setSubmitted(false); setPickup(null); setDrop(null); setForm(f => ({ ...f, customerName: '', customerPhone: '' })); }}
            style={{ padding: '10px 24px', borderRadius: 10, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* ── Brand header ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {org?.brand_logo_url && (
            <img src={org.brand_logo_url} alt={org.brand_name} style={{ height: 40, marginBottom: 8 }} />
          )}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
            {org?.brand_name ?? 'Book a Cab'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {driversPublic.length} drivers available · Fast & reliable
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>

          {/* STEP 1 — Locations */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
            <StepBadge n={1} active={!step1Done} done={step1Done} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Where are you going?</div>

              <LocationPicker
                label="Pickup"
                placeholder="Search pickup location…"
                markerColor="#22c55e"
                value={pickup}
                onChange={setPickup}
                showMap={false}
              />
              <div style={{ height: 10 }} />
              <LocationPicker
                label="Drop"
                placeholder="Search destination…"
                markerColor="#ef4444"
                value={drop}
                onChange={setDrop}
                showMap={false}
              />

              {/* Route map preview */}
              {pickup && drop && (
                <div style={{ marginTop: 12 }}>
                  <BookingMap
                    pickup={{ lat: pickup.lat, lng: pickup.lng }}
                    drop={{ lat: drop.lat, lng: drop.lng }}
                    height={220}
                  />
                </div>
              )}
            </div>
          </div>

          {step1Done && (
            <>
              <div style={{ height: 1, background: '#f1f5f9', margin: '0 -24px 20px' }} />

              {/* STEP 2 — Trip details */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
                <StepBadge n={2} active={step1Done && !step2Done} done={step2Done} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>Trip details</div>

                  {/* Trip type */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trip Type</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['city','airport','outstation','sightseeing'] as TripType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => update({ tripType: t })}
                          style={{
                            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            border: form.tripType === t ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
                            background: form.tripType === t ? '#eff6ff' : '#fff',
                            color: form.tripType === t ? '#3b82f6' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {tripTypeIcons[t]} {tripTypeLabels[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Outstation days */}
                  {form.tripType === 'outstation' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Number of Days</label>
                      <input type="number" min={1} value={form.numberOfDays ?? ''} onChange={e => update({ numberOfDays: +e.target.value })}
                        placeholder="e.g. 2" style={inputStyle} />
                    </div>
                  )}

                  {/* Sightseeing hours */}
                  {form.tripType === 'sightseeing' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Estimated Hours</label>
                      <input type="number" min={1} value={form.estimatedHours ?? ''} onChange={e => update({ estimatedHours: +e.target.value })}
                        placeholder="e.g. 4" style={inputStyle} />
                    </div>
                  )}

                  {/* Date/time */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Date & Time</label>
                    <input type="datetime-local" value={form.scheduledAt} onChange={e => update({ scheduledAt: e.target.value })} style={inputStyle} />
                  </div>

                  {/* Name + Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Your Name</label>
                      <input value={form.customerName} onChange={e => update({ customerName: e.target.value })}
                        placeholder="Full name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input value={form.customerPhone} onChange={e => update({ customerPhone: e.target.value })}
                        placeholder="10-digit number" type="tel" style={inputStyle} />
                    </div>
                  </div>

                  {/* Payment */}
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Payment Method</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['cash', 'online'] as const).map(pm => (
                        <button key={pm} onClick={() => update({ paymentMethod: pm })}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                            border: form.paymentMethod === pm ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
                            background: form.paymentMethod === pm ? '#eff6ff' : '#fff',
                            color: form.paymentMethod === pm ? '#3b82f6' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {pm === 'cash' ? '💵 Cash' : '📲 Online'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '0 -24px 20px' }} />

              {/* STEP 3 — Confirm */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <StepBadge n={3} active={step2Done} done={false} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Confirm booking</div>

                  {/* Fare estimate */}
                  {fareEstimate && (
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Estimated Fare</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>₹{fareEstimate}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !step2Done || !step1Done}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 12,
                      background: step1Done && step2Done ? (org?.brand_color ?? '#3b82f6') : '#e2e8f0',
                      color: step1Done && step2Done ? '#fff' : '#94a3b8',
                      border: 'none', cursor: step1Done && step2Done ? 'pointer' : 'not-allowed',
                      fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
                      boxShadow: step1Done && step2Done ? '0 4px 14px rgba(59,130,246,0.35)' : 'none',
                    }}
                  >
                    {submitting ? '⟳ Booking…' : '🚗 Book My Cab'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
          Powered by {org?.name ?? 'Fleetos'} · Ola Maps
        </p>
      </div>
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: 13, background: '#fff', outline: 'none',
  boxSizing: 'border-box', color: '#1e293b',
};

export default CustomerBookingForm;
