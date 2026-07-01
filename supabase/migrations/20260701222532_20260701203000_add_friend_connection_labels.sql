ALTER TABLE public.friend_connections
  ADD COLUMN IF NOT EXISTS requester_label text,
  ADD COLUMN IF NOT EXISTS receiver_label text;