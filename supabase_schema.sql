-- CHRONO Development - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUILDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    units JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    phone2 TEXT,
    id_number TEXT,
    id_type TEXT,
    blood_type TEXT,
    direct_indirect TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SALES TABLE (Sales Agents)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OFFERS TABLE  
-- ============================================
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_id TEXT,
    unit_id TEXT,
    building_id TEXT,
    date TEXT,
    start_date TEXT,
    down_payment TEXT,
    years TEXT,
    frequency TEXT DEFAULT 'quarterly',
    start_after_months TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    unit_id TEXT,
    building_id TEXT,
    contract_id TEXT,
    date TEXT,
    total_price TEXT,
    down_payment TEXT,
    years TEXT,
    frequency TEXT DEFAULT 'quarterly',
    notes TEXT,
    joint_purchasers JSONB DEFAULT '[]'::jsonb,
    guarantor JSONB,
    sales_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSTALLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS installments (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    unit_id TEXT,
    customer_name TEXT,
    type TEXT,
    due_date TEXT,
    amount NUMERIC,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'CASH',
    cheque_number TEXT,
    bank TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    feedbacks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TERMINATED CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS terminated_contracts (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    unit_id TEXT,
    building_id TEXT,
    contract_id TEXT,
    date TEXT,
    total_price TEXT,
    down_payment TEXT,
    years TEXT,
    frequency TEXT,
    notes TEXT,
    joint_purchasers JSONB DEFAULT '[]'::jsonb,
    guarantor JSONB,
    termination_date TEXT,
    termination_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TERMINATED INSTALLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS terminated_installments (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    unit_id TEXT,
    customer_name TEXT,
    type TEXT,
    due_date TEXT,
    amount NUMERIC,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT,
    payment_method TEXT,
    cheque_number TEXT,
    bank TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    feedbacks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APP CONFIG TABLE (for version checking)
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
    id TEXT PRIMARY KEY DEFAULT 'main',
    latest_version TEXT DEFAULT '1.1.0',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO app_config (id, latest_version) VALUES ('main', '1.1.0')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Enable public access
-- ============================================
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminated_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (using anon key)
CREATE POLICY "Allow all" ON buildings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON terminated_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON terminated_installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- Success message
SELECT 'CHRONO Database Schema Created Successfully!' AS status;
