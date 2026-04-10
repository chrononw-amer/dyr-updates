-- CHRONO Development - Schema Update v3
-- This script adds missing columns to Supabase tables to match the application's DataService mappers.
-- Run this in your Supabase SQL Editor.

-- 1. Updates for CUSTOMERS table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_card_path TEXT;

-- 2. Updates for SALES table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS id_card_path TEXT;

-- 3. Updates for OFFERS table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS valid_until TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS final_price NUMERIC;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS total_price NUMERIC;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS sales_id TEXT;

-- 4. Updates for INSTALLMENTS table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS cheque_status TEXT DEFAULT 'Not Received';
ALTER TABLE installments ADD COLUMN IF NOT EXISTS deposited_bank TEXT DEFAULT '';
ALTER TABLE installments ADD COLUMN IF NOT EXISTS sales_id TEXT DEFAULT '';
ALTER TABLE installments ADD COLUMN IF NOT EXISTS last_reminder_sent TEXT DEFAULT '';

-- 5. Ensure terminated_contracts and terminated_installments match if needed
ALTER TABLE terminated_contracts ADD COLUMN IF NOT EXISTS sales_id TEXT;
ALTER TABLE terminated_installments ADD COLUMN IF NOT EXISTS cheque_status TEXT DEFAULT 'Not Received';
ALTER TABLE terminated_installments ADD COLUMN IF NOT EXISTS deposited_bank TEXT DEFAULT '';
ALTER TABLE terminated_installments ADD COLUMN IF NOT EXISTS sales_id TEXT DEFAULT '';
ALTER TABLE terminated_installments ADD COLUMN IF NOT EXISTS last_reminder_sent TEXT DEFAULT '';

-- Success message
SELECT 'CHRONO: Schema update v3 completed successfully!' as status;
