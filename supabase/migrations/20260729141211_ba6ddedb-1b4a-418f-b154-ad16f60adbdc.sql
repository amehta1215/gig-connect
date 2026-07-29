ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_by_sender boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_receiver boolean NOT NULL DEFAULT false;