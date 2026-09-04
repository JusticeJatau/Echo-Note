-- EchoNotes billing foundation. Payments are intentionally added in a later migration.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscriptions (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL,
  device_name TEXT NOT NULL,
  platform TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_key)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
CREATE POLICY "Users view own devices" ON public.user_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users remove own devices" ON public.user_devices FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
  SELECT plan INTO current_plan FROM public.subscriptions WHERE user_id = current_user_id;
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

REVOKE EXECUTE ON FUNCTION public.register_device(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_basic_note_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan TEXT; active_notes INTEGER;
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NOT OLD.is_deleted THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.notes WHERE id = NEW.id AND user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT COALESCE((SELECT plan FROM public.subscriptions WHERE user_id = NEW.user_id), 'basic') INTO current_plan;
  IF current_plan = 'pro' THEN RETURN NEW; END IF;
  SELECT count(*) INTO active_notes FROM public.notes WHERE user_id = NEW.user_id AND NOT is_deleted;
  IF active_notes >= 100 THEN RAISE EXCEPTION 'CLOUD_NOTE_LIMIT_REACHED:100'; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_basic_note_limit ON public.notes;
CREATE TRIGGER enforce_basic_note_limit BEFORE INSERT OR UPDATE OF is_deleted ON public.notes FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_note_limit();

CREATE OR REPLACE FUNCTION public.enforce_basic_share_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan TEXT; active_shares INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.note_shares WHERE user_id = NEW.user_id AND (share_id = NEW.share_id OR note_id = NEW.note_id)) THEN RETURN NEW; END IF;
  SELECT COALESCE((SELECT plan FROM public.subscriptions WHERE user_id = NEW.user_id), 'basic') INTO current_plan;
  IF current_plan = 'pro' THEN RETURN NEW; END IF;
  SELECT count(*) INTO active_shares FROM public.note_shares WHERE user_id = NEW.user_id;
  IF active_shares >= 3 THEN RAISE EXCEPTION 'SHARE_LINK_LIMIT_REACHED:3'; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_basic_share_limit ON public.note_shares;
CREATE TRIGGER enforce_basic_share_limit BEFORE INSERT ON public.note_shares FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_share_limit();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
