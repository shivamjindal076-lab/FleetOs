
-- Fix security definer view - make it security invoker
ALTER VIEW public.drivers_public SET (security_invoker = on);
