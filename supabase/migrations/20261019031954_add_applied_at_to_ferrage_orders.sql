/*
# Add applied_at column to ferrage_orders

Adds an `applied_at` date column to track when the trainer applied the farrier's
validated work back to the horses table (updating lastFerrure/lastFerrureBy).
Nullable — only set after the trainer clicks "Appliquer" on a completed order.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferrage_orders' AND column_name = 'applied_at') THEN
    ALTER TABLE ferrage_orders ADD COLUMN applied_at date;
  END IF;
END $$;