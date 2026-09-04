ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS notes_tags_idx ON public.notes USING GIN (tags);

CREATE TABLE IF NOT EXISTS public.note_shares (
  share_id TEXT PRIMARY KEY,
  note_id UUID NOT NULL UNIQUE REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.note_shares TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.note_shares TO authenticated;
GRANT ALL ON public.note_shares TO service_role;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view a shared note"
ON public.note_shares FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Owners create shared notes"
ON public.note_shares FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update shared notes"
ON public.note_shares FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete shared notes"
ON public.note_shares FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.refresh_note_share()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.note_shares
  SET title = NEW.title, content = NEW.content, tags = NEW.tags, updated_at = NEW.updated_at
  WHERE note_id = NEW.id;
  RETURN NEW;
END; $$;

CREATE TRIGGER refresh_shared_note
AFTER UPDATE OF title, content, tags ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.refresh_note_share();

REVOKE EXECUTE ON FUNCTION public.refresh_note_share() FROM PUBLIC, anon, authenticated;
