-- CHRONO Development - Missing Tables & Buckets Fix
-- Run this script in your Supabase SQL Editor to resolve the "public.app_users" missing table error.

-- 0. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    company TEXT,
    rank TEXT DEFAULT 'user',
    password TEXT NOT NULL,
    permissions JSONB DEFAULT '{"allTabs": true, "allowedTabs": [], "actions": {"view": true, "edit": true, "add": true, "delete": true}}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Admin User (If not exists)
INSERT INTO app_users (name, password, rank, company)
VALUES ('Admin', '123', 'admin', 'CHRONO')
ON CONFLICT (name) DO NOTHING;

-- 2. Create app_messages table (Real-time Chat)
CREATE TABLE IF NOT EXISTS app_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create app_sessions table (Monitor & Remote Control)
CREATE TABLE IF NOT EXISTS app_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pc_name TEXT,
    user_name TEXT,
    ip_address TEXT,
    mac_address TEXT UNIQUE,
    platform TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    app_version TEXT,
    session_status TEXT DEFAULT 'offline',
    status TEXT DEFAULT 'active',
    valid_until TIMESTAMPTZ,
    command TEXT,
    update_url TEXT,
    backup_url TEXT,
    display_name TEXT,
    notes TEXT,
    update_requested BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
    id TEXT PRIMARY KEY,
    latest_version TEXT DEFAULT '1.0.0',
    apk_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (id, latest_version)
VALUES ('main', '1.4.4')
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 6. Create Policies (Consistent with existing patterns in the project)
DROP POLICY IF EXISTS "Allow all select" ON app_users;
DROP POLICY IF EXISTS "Allow all insert" ON app_users;
DROP POLICY IF EXISTS "Allow all update" ON app_users;
DROP POLICY IF EXISTS "Allow all delete" ON app_users;

CREATE POLICY "Allow all select" ON app_users FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON app_users FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON app_users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow all select" ON app_messages;
DROP POLICY IF EXISTS "Allow all insert" ON app_messages;
DROP POLICY IF EXISTS "Allow all update" ON app_messages;
DROP POLICY IF EXISTS "Allow all delete" ON app_messages;

CREATE POLICY "Allow all select" ON app_messages FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON app_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON app_messages FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON app_messages FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow all select" ON app_sessions;
DROP POLICY IF EXISTS "Allow all insert" ON app_sessions;
DROP POLICY IF EXISTS "Allow all update" ON app_sessions;
DROP POLICY IF EXISTS "Allow all delete" ON app_sessions;

CREATE POLICY "Allow all select" ON app_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON app_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON app_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON app_sessions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow all select" ON app_config;
CREATE POLICY "Allow all select" ON app_config FOR SELECT USING (true);
CREATE POLICY "Allow all update" ON app_config FOR UPDATE USING (true);

-- 7. Create Storage Buckets (For Updates and Backups)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('updates', 'updates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR ALL 
USING (bucket_id IN ('updates', 'backups')) 
WITH CHECK (bucket_id IN ('updates', 'backups'));

-- Success Notification
SELECT 'CHRONO: Missing Database Tables and Storage Buckets Created Successfully! DEFAULT LOGIN: Admin / 123' as status;

