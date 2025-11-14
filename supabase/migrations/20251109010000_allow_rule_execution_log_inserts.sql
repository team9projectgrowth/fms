-- Migration: Allow inserting rule execution logs
-- Ensures the rule engine can record execution results

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rule_execution_logs'
      AND policyname = 'Authenticated users can insert rule execution logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert rule execution logs"
      ON rule_execution_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

