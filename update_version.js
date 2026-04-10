
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zuhgdihtiecugpgzgphm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aGdkaWh0aWVjdWdwZ3pncGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTQzNTAsImV4cCI6MjA4NTg3MDM1MH0.9eGSpMqMnGSfbpDr34CRNC5RV1-Ufzc3G2VuZSXwuTA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVersion() {
    const { data, error } = await supabase
        .from('app_config')
        .upsert({
            id: 'main',
            latest_version: '1.7.1'
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error updating version:', error);
    } else {
        console.log('Successfully upserted version 1.7.1 in app_config');
    }
}

updateVersion();
