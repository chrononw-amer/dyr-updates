-- Add missing sales_id column to terminated_contracts to match the active contracts schema
ALTER TABLE terminated_contracts ADD COLUMN IF NOT EXISTS sales_id TEXT;

-- Update RLS policies to ensure it's included (though "Allow all" should already cover it)
ALTER TABLE terminated_contracts ENABLE ROW LEVEL SECURITY;

-- Notify success
SELECT 'Schema Updated: sales_id added to terminated_contracts' as status;
