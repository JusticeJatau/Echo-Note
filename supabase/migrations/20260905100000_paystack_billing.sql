ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annually')),
ADD COLUMN IF NOT EXISTS provider_email_token TEXT,
ADD COLUMN IF NOT EXISTS provider_customer_code TEXT,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'annually')),
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  provider_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
CREATE POLICY "Users view own payments" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX payment_transactions_user_created_idx ON public.payment_transactions (user_id, created_at DESC);
CREATE TRIGGER payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.billing_events (
  event_key TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.billing_events TO service_role;

CREATE OR REPLACE FUNCTION public.effective_plan(p_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN s.plan = 'pro' AND (s.status = 'active' OR s.current_period_end > now()) THEN 'pro'
    ELSE 'basic'
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.subscriptions s ON s.user_id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_plan(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_plan(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_device(p_device_key TEXT, p_device_name TEXT, p_platform TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_plan TEXT;
  device_limit INTEGER;
  registered_count INTEGER;
  registered_device public.user_devices;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF length(trim(p_device_key)) < 8 THEN RAISE EXCEPTION 'INVALID_DEVICE_KEY'; END IF;
  INSERT INTO public.subscriptions (user_id) VALUES (current_user_id) ON CONFLICT (user_id) DO NOTHING;
  current_plan := public.effective_plan(current_user_id);
  device_limit := CASE WHEN current_plan = 'pro' THEN 5 ELSE 2 END;
  SELECT * INTO registered_device FROM public.user_devices WHERE user_id = current_user_id AND device_key = p_device_key;
  IF FOUND THEN
    UPDATE public.user_devices SET device_name = left(p_device_name, 120), platform = left(p_platform, 120), last_seen_at = now()
    WHERE id = registered_device.id RETURNING * INTO registered_device;
    RETURN to_jsonb(registered_device) || jsonb_build_object('limit', device_limit, 'plan', current_plan);
  END IF;
  SELECT count(*) INTO registered_count FROM public.user_devices WHERE user_id = current_user_id;
  IF registered_count >= device_limit THEN RAISE EXCEPTION 'DEVICE_LIMIT_REACHED:%', device_limit; END IF;
  INSERT INTO public.user_devices (user_id, device_key, device_name, platform)
  VALUES (current_user_id, p_device_key, left(p_device_name, 120), left(p_platform, 120))
  RETURNING * INTO registered_device;
  RETURN to_jsonb(registered_device) || jsonb_build_object('limit', device_limit, 'plan', current_plan);
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_basic_note_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan TEXT; active_notes INTEGER;
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NOT OLD.is_deleted THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.notes WHERE id = NEW.id AND user_id = NEW.user_id) THEN RETURN NEW; END IF;
  current_plan := public.effective_plan(NEW.user_id);
  IF current_plan = 'pro' THEN RETURN NEW; END IF;
  SELECT count(*) INTO active_notes FROM public.notes WHERE user_id = NEW.user_id AND NOT is_deleted;
  IF active_notes >= 100 THEN RAISE EXCEPTION 'CLOUD_NOTE_LIMIT_REACHED:100'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_basic_share_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan TEXT; active_shares INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.note_shares WHERE user_id = NEW.user_id AND (share_id = NEW.share_id OR note_id = NEW.note_id)) THEN RETURN NEW; END IF;
  current_plan := public.effective_plan(NEW.user_id);
  IF current_plan = 'pro' THEN RETURN NEW; END IF;
  SELECT count(*) INTO active_shares FROM public.note_shares WHERE user_id = NEW.user_id;
  IF active_shares >= 3 THEN RAISE EXCEPTION 'SHARE_LINK_LIMIT_REACHED:3'; END IF;
  RETURN NEW;
END; $$;
