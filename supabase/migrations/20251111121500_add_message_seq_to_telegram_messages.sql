-- ============================================================================
-- Migration: add_message_seq_to_telegram_messages
-- Purpose  : Track per-chat message ordering and auto-reset after ticket link
-- ============================================================================

BEGIN;

-- Add column if it doesn't exist yet
ALTER TABLE public.telegram_messages
  ADD COLUMN IF NOT EXISTS message_seq integer;

-- Backfill existing records with a per-chat sequence based on creation order
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at, id) AS seq_num
  FROM public.telegram_messages
)
UPDATE public.telegram_messages AS t
SET message_seq = ordered.seq_num
FROM ordered
WHERE ordered.id = t.id;

-- Ensure defaults and not-null constraints
UPDATE public.telegram_messages
SET message_seq = 1
WHERE message_seq IS NULL;

ALTER TABLE public.telegram_messages
  ALTER COLUMN message_seq SET DEFAULT 1;

ALTER TABLE public.telegram_messages
  ALTER COLUMN message_seq SET NOT NULL;

-- Index to allow efficient lookup of the latest message per chat
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_seq
  ON public.telegram_messages (chat_id, message_seq DESC);

-- Trigger to auto-increment the sequence for each chat on insert
CREATE OR REPLACE FUNCTION public.set_telegram_message_seq()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq integer;
BEGIN
  IF NEW.message_seq IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(message_seq), 0) + 1
    INTO next_seq
  FROM public.telegram_messages
  WHERE chat_id = NEW.chat_id
    AND ticket_id IS NULL;

  NEW.message_seq := COALESCE(next_seq, 1);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_telegram_message_seq ON public.telegram_messages;

CREATE TRIGGER trg_set_telegram_message_seq
BEFORE INSERT ON public.telegram_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_telegram_message_seq();

COMMIT;

