-- Create cheque_templates table
CREATE TABLE IF NOT EXISTS cheque_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    bank_name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    cheque_width NUMERIC NOT NULL, -- in mm
    cheque_height NUMERIC NOT NULL, -- in mm
    fields JSONB NOT NULL, -- stores coordinates {date: {x,y}, payee: {x,y}, amount: {x,y}, words: {x,y}, customerName: {x,y}}
    scanned_image_url TEXT, -- Base64 or URL
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) -- Optional: for multi-user support
);

-- Enable RLS
ALTER TABLE cheque_templates ENABLE ROW LEVEL SECURITY;

-- Simple policy for now (public access/basic auth as per existing patterns)
CREATE POLICY "Public Read Access" ON cheque_templates FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON cheque_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON cheque_templates FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON cheque_templates FOR DELETE USING (true);
