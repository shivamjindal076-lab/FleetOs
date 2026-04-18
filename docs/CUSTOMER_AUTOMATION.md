# Customer Automation

FleetOs now hands customer notifications to a Supabase Edge Function instead of stopping at a frontend-only message log.

## Current flow

1. The app still writes an audit row to `messages_log`.
2. The app then invokes the Supabase function `customer-comms-dispatch`.
3. That function forwards the payload to configured SMS and WhatsApp webhooks when they are present.

## Trigger points

- Driver assigned: `queueAssignmentMessage`
- Trip completed feedback: `queueFeedbackMessage`
- Invoice message: `queueInvoiceMessage`

## Required Supabase function secrets

Set these in the Supabase project before expecting live delivery:

- `SMS_WEBHOOK_URL`
- `SMS_WEBHOOK_TOKEN` (optional)
- `WHATSAPP_WEBHOOK_URL`
- `WHATSAPP_WEBHOOK_TOKEN` (optional)

## Expected webhook payload

Each configured channel receives JSON like this:

```json
{
  "source": "FleetOs",
  "channel": "sms",
  "customerPhone": "+919876543210",
  "intent": "driver_assigned",
  "message": "Your trip with FleetOS is confirmed...",
  "sentAt": "2026-04-17T12:00:00.000Z"
}
```

## Notes

- If no webhook is configured, the function returns a skipped status for that channel.
- The app does not hard-fail booking or trip operations when message dispatch is unavailable.
- Payment delivery still exists in the same automation path, but payment workflow hardening is intentionally deferred for the next pass.
