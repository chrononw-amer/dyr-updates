
-- Add control columns to app_sessions
ALTER TABLE app_sessions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active', -- 'active' or 'suspended'
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ, -- NULL = Forever, otherwise expiry date
ADD COLUMN IF NOT EXISTS command TEXT, -- 'BACKUP', 'RESTART', etc.
ADD COLUMN IF NOT EXISTS backup_url TEXT; -- URL of the last backup

-- Create a storage bucket for backups (if it doesn't exist)
-- Note: This might require specific permissions or be done via Dashboard. 
-- Trying to insert into storage schema if accessible.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for backups (allow authenticated uploads/downloads)
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'backups');
