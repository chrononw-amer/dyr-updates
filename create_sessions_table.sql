
-- ============================================
-- APP SESSIONS TABLE (For Admin Monitor)
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS app_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pc_name TEXT,
    user_name TEXT,
    ip_address TEXT,
    mac_address TEXT UNIQUE,  -- Unique constraint for upserting
    platform TEXT,
    app_version TEXT,
    session_status TEXT DEFAULT 'online',
    display_name TEXT,
    notes TEXT,
    update_requested BOOLEAN DEFAULT FALSE,
    update_url TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public access (Read/Write)
CREATE POLICY "Allow all select" ON app_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON app_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON app_sessions FOR UPDATE USING (true);
