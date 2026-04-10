
-- FORCE UNSUSPEND ALL (Reset)
UPDATE app_sessions SET status = 'active', command = NULL;

-- 1. Ensure Columns Exist (Safe to run multiple times)
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS command TEXT;
ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS backup_url TEXT;

-- 2. Create Storage Bucket 'backups' (Rows in storage.buckets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies (Aggressive - Allow All for Debugging)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'backups') WITH CHECK (bucket_id = 'backups');

-- 4. Session Table Policies
DROP POLICY IF EXISTS "Allow all select" ON app_sessions;
DROP POLICY IF EXISTS "Allow all insert" ON app_sessions;
DROP POLICY IF EXISTS "Allow all update" ON app_sessions;

CREATE POLICY "Allow all select" ON app_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON app_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON app_sessions FOR UPDATE USING (true);
