-- ============================================================================
-- Migration: Create executor_ticket_sessions table
-- Purpose  : Track Telegram bot interactions for executors per ticket
-- ============================================================================

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create executor_ticket_sessions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'executor_ticket_sessions'
  ) THEN
    CREATE TABLE public.executor_ticket_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
      executor_profile_id uuid REFERENCES public.executor_profiles(id) ON DELETE SET NULL,
      executor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      telegram_chat_id text NOT NULL,
      telegram_message_id bigint,
      prompt_message_id bigint,
      session_type text NOT NULL CHECK (session_type IN ('update', 'status_change')),
      state text NOT NULL DEFAULT 'awaiting_input' CHECK (state IN ('awaiting_input', 'completed', 'cancelled', 'expired')),
      expires_at timestamptz,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_executor_ticket_sessions_ticket
  ON public.executor_ticket_sessions(ticket_id);

CREATE INDEX IF NOT EXISTS idx_executor_ticket_sessions_chat
  ON public.executor_ticket_sessions(telegram_chat_id);

-- Only one active session per executor + ticket at a time
CREATE UNIQUE INDEX IF NOT EXISTS uidx_executor_ticket_sessions_active
  ON public.executor_ticket_sessions(telegram_chat_id, ticket_id)
  WHERE state = 'awaiting_input';

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_executor_ticket_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_executor_ticket_sessions_updated_at
  ON public.executor_ticket_sessions;

CREATE TRIGGER trg_executor_ticket_sessions_updated_at
  BEFORE UPDATE ON public.executor_ticket_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_executor_ticket_sessions_updated_at();

