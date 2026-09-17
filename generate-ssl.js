const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating SSL certificates...');

try {
    // Create SSL directory
    const sslDir = path.join(__dirname, 'ssl');
    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir);
    }

    // Check if OpenSSL is available
    try {
        execSync('openssl version', { stdio: 'ignore' });
    } catch (error) {
        console.error('OpenSSL is not installed or not in PATH.');
        console.log('Please install OpenSSL:');
        console.log('- Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
        console.log('- macOS: brew install openssl');
        console.log('- Linux: sudo apt-get install openssl (Ubuntu/Debian) or sudo yum install openssl (CentOS/RHEL)');
        process.exit(1);
    }

    // Generate private key
    execSync('openssl genrsa -out ssl/server.key 2048', { stdio: 'inherit' });

    // Generate certificate signing request
    execSync('openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"', { stdio: 'inherit' });

    // Generate self-signed certificate
    execSync('openssl x509 -req -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -days 365', { stdio: 'inherit' });

    // Clean up CSR file
    fs.unlinkSync(path.join(sslDir, 'server.csr'));

    console.log('\n✅ SSL certificates generated successfully!');
    console.log('Files created:');
    console.log('  ssl/server.key - Private key');
    console.log('  ssl/server.crt - Certificate');
    console.log('');
    console.log('🚀 To use HTTPS, run: node server.js');
    console.log('📱 Then visit: https://localhost:5443');
    console.log('');
    console.log('⚠️  Note: You\'ll need to accept the self-signed certificate warning in your browser.');

} catch (error) {
    console.error('Error generating SSL certificates:', error.message);
    process.exit(1);
}