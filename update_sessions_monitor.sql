-- ============================================
-- OWNER'S MONITOR UPGRADE — Session & User Schema
-- Run this on your Supabase SQL Editor
-- ============================================

-- 1. Add new columns to app_sessions table
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS logged_in_user TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS user_company TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS user_permissions JSONB;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT FALSE;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS external_ip TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS current_tab TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS login_time TIMESTAMPTZ;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'pc';
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS access_expires TIMESTAMPTZ;

-- 2. Add access control columns to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_expires TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_duration TEXT DEFAULT 'permanent';

-- 3. Allow public delete on app_sessions (for cleanup)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_sessions' AND policyname = 'Allow all delete'
    ) THEN
        CREATE POLICY "Allow all delete" ON app_sessions FOR DELETE USING (true);
    END IF;
END $$;

-- 4. Allow public update on app_users (for access_expires)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Allow all update'
    ) THEN
        CREATE POLICY "Allow all update" ON app_users FOR UPDATE USING (true);
    END IF;
END $$;

-- Done! All new columns are nullable so existing sessions will continue to work.
