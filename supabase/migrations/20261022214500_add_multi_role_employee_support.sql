ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS roles jsonb,
  ADD COLUMN IF NOT EXISTS tarif_grid_ids jsonb;
