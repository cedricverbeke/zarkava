/*
# Add ecart_note to planning and douches

1. Changes
- `planning.ecart_note` (text, nullable): free-text note recording a change vs. the planned session (filled from the Récapitulatif).
- `douches.ecart_note` (text, nullable): same purpose for showers.
2. Security
- No policy changes; existing owner-scoped CRUD still applies.
3. Notes
- Idempotent: DO block adds each column only if absent. Non-destructive (additive only).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planning' AND column_name = 'ecart_note') THEN
    ALTER TABLE planning ADD COLUMN ecart_note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'douches' AND column_name = 'ecart_note') THEN
    ALTER TABLE douches ADD COLUMN ecart_note text;
  END IF;
END $$;
