import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type DispatchChannel = "sms" | "whatsapp";

interface DispatchPayload {
  customerPhone?: string | null;
  intent?: string | null;
  message?: string | null;
  channels?: DispatchChannel[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function postToChannel(channel: DispatchChannel, payload: DispatchPayload) {
  const endpoint = Deno.env.get(channel === "sms" ? "SMS_WEBHOOK_URL" : "WHATSAPP_WEBHOOK_URL");
  const token = Deno.env.get(channel === "sms" ? "SMS_WEBHOOK_TOKEN" : "WHATSAPP_WEBHOOK_TOKEN");

  if (!endpoint) {
    return {
      channel,
      status: "skipped",
      reason: "missing_endpoint",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      source: "FleetOs",
      channel,
      customerPhone: payload.customerPhone,
      intent: payload.intent,
      message: payload.message,
      sentAt: new Date().toISOString(),
    }),
  });

  return {
    channel,
    status: response.ok ? "sent" : "failed",
    statusCode: response.status,
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload: DispatchPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  if (!payload.customerPhone || !payload.message || !payload.intent) {
    return jsonResponse(400, { error: "customerPhone, intent, and message are required" });
  }

  const channels = payload.channels?.length ? payload.channels : ["sms", "whatsapp"];
  const results = await Promise.all(channels.map((channel) => postToChannel(channel, payload)));

  const hasSuccessfulDispatch = results.some((result) => result.status === "sent");

  return jsonResponse(200, {
    ok: hasSuccessfulDispatch,
    deliveries: results,
  });
});
