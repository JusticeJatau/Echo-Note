CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'planned', 'resolved', 'declined')),
  user_agent TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

CREATE POLICY "Users submit own feedback"
ON public.feedback_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
ON public.feedback_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX feedback_submissions_user_created_idx
ON public.feedback_submissions (user_id, created_at DESC);

CREATE INDEX feedback_submissions_type_status_idx
ON public.feedback_submissions (type, status, created_at DESC);

CREATE TRIGGER feedback_submissions_updated_at
BEFORE UPDATE ON public.feedback_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
