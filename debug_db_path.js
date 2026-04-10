
const path = require('path');
const fs = require('fs');

const userDataPath = process.env.APPDATA ? path.join(process.env.APPDATA, 'Chrono-Dev') : '';
console.log('UserData Path (env):', userDataPath);

const defaultDevPath = 'C:\\Users\\C0QA\\OneDrive\\Desktop\\database';
console.log('Default Dev Path:', defaultDevPath);
console.log('Exists:', fs.existsSync(defaultDevPath));

if (fs.existsSync(userDataPath)) {
    const configPath = path.join(userDataPath, 'db-config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('Config Path:', config.path);
        console.log('Config Path Exists:', fs.existsSync(config.path));
    } else {
        console.log('No db-config.json found in userData');
    }
}
