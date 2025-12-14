// Generate self-signed SSL certificates for local development
// This script creates certificates that work for both localhost and your local IP

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create certs directory
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('🔐 Generating self-signed SSL certificates...');

// Get local IP address
function getLocalIP() {
  try {
    const output = execSync('hostname -I', { encoding: 'utf8' });
    return output.trim().split(' ')[0];
  } catch (error) {
    console.log('⚠️  Could not detect local IP, using 192.168.1.4');
    return '192.168.1.4';
  }
}

const localIP = getLocalIP();
console.log(`📍 Detected local IP: ${localIP}`);

// OpenSSL configuration for SAN (Subject Alternative Names)
const opensslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=PH
ST=Manila
L=Manila
O=Bio Attendance System
OU=Development
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = ${localIP}
IP.1 = 127.0.0.1
IP.2 = ${localIP}
`;

// Write OpenSSL config
const configPath = path.join(certsDir, 'openssl.conf');
fs.writeFileSync(configPath, opensslConfig);

// Generate private key
console.log('🔑 Generating private key...');
execSync(`openssl genrsa -out ${path.join(certsDir, 'server.key')} 2048`, {
  stdio: 'inherit'
});

// Generate certificate signing request
console.log('📝 Generating certificate signing request...');
execSync(`openssl req -new -key ${path.join(certsDir, 'server.key')} -out ${path.join(certsDir, 'server.csr')} -config ${configPath}`, {
  stdio: 'inherit'
});

// Generate self-signed certificate (valid for 365 days)
console.log('📜 Generating self-signed certificate...');
execSync(`openssl x509 -req -in ${path.join(certsDir, 'server.csr')} -signkey ${path.join(certsDir, 'server.key')} -out ${path.join(certsDir, 'server.crt')} -days 365 -extensions v3_req -extfile ${configPath}`, {
  stdio: 'inherit'
});

// Clean up CSR file
fs.unlinkSync(path.join(certsDir, 'server.csr'));
fs.unlinkSync(configPath);

console.log('✅ SSL certificates generated successfully!');
console.log(`📂 Certificates location: ${certsDir}`);
console.log(`🔒 Private key: server.key`);
console.log(`📜 Certificate: server.crt`);
console.log('');
console.log('🚀 You can now use HTTPS in your development environment!');
console.log('');
console.log('⚠️  Note: Your browser will show a security warning because these are self-signed certificates.');
console.log('   This is normal for development. Click "Advanced" then "Proceed to site" to continue.');
