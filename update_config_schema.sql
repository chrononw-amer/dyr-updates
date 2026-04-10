-- SQL to add 'apk_url' column to app_config table for Auto-Update feature

ALTER TABLE app_config ADD COLUMN IF NOT EXISTS apk_url TEXT;

-- Example: Set the latest version and discharge link
-- UPDATE app_config SET 
--     latest_version = '1.4.0',
--     apk_url = 'https://link-to-your-hosted-apk.com/ChronoDevelopment.apk'
-- WHERE id = 'main';
