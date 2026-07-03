ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT '{}'::jsonb;