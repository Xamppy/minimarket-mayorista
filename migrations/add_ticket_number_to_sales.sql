-- Add ticket_number column to sales table
-- This will automatically backfill existing rows with sequential numbers starting from 1

-- Create a sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS sales_ticket_number_seq START WITH 1;

-- Add the column with default value from sequence
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ticket_number BIGINT NOT NULL DEFAULT nextval('sales_ticket_number_seq');

-- Update existing rows to have sequential ticket numbers (if any exist)
DO $$
DECLARE
  row_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR row_record IN SELECT id FROM sales ORDER BY created_at ASC LOOP
    UPDATE sales SET ticket_number = counter WHERE id = row_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Set the sequence to continue from the last assigned number
  PERFORM setval('sales_ticket_number_seq', counter);
END $$;

-- Create an index on ticket_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_ticket_number ON sales(ticket_number);
