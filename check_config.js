
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zuhgdihtiecugpgzgphm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aGdkaWh0aWVjdWdwZ3pncGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTQzNTAsImV4cCI6MjA4NTg3MDM1MH0.9eGSpMqMnGSfbpDr34CRNC5RV1-Ufzc3G2VuZSXwuTA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    const { data, error } = await supabase
        .from('app_config')
        .select('*');

    if (error) {
        console.error('Error fetching config:', error);
    } else {
        console.log('All app_config rows:', JSON.stringify(data, null, 2));
    }
}

checkConfig();
