import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if env vars are missing (for built packages)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zuhgdihtiecugpgzgphm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aGdkaWh0aWVjdWdwZ3pncGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTQzNTAsImV4cCI6MjA4NTg3MDM1MH0.9eGSpMqMnGSfbpDr34CRNC5RV1-Ufzc3G2VuZSXwuTA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
