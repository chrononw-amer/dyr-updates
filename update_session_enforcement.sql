-- CHRONO Development - Single Session Enforcement
-- This script adds a field to track the latest active session for each user.

-- Add current_session_id column to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS current_session_id TEXT;

-- Success message
SELECT 'CHRONO: Single session enforcement schema update completed!' as status;
