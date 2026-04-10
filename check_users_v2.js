
const fs = require('fs');
const supabaseUrl = 'https://zuhgdihtiecugpgzgphm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aGdkaWh0aWVjdWdwZ3pncGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTQzNTAsImV4cCI6MjA4NTg3MDM1MH0.9eGSpMqMnGSfbpDr34CRNC5RV1-Ufzc3G2VuZSXwuTA';

async function checkUsers() {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/app_users?select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const data = await response.json();
        fs.writeFileSync('users_list_v2.json', JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
