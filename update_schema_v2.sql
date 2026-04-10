-- Add Email and ID Card Path to Customers and Sales
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_card_path TEXT;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS id_card_path TEXT;

-- Add Layout and Floor Plan Paths to Buildings (JSON units)
-- Note: units is JSONB, so we just store paths inside the JSON objects in app logic.

-- Create App Logs Table
CREATE TABLE IF NOT EXISTS app_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name TEXT,
    action TEXT, -- ADD, EDIT, DELETE, LOGIN, etc.
    tab TEXT,    -- CUSTOMERS, OFFERS, etc.
    details TEXT, -- JSON string or description
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for logs
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON app_logs FOR ALL USING (true) WITH CHECK (true);
