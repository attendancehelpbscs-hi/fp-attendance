// Generate self-signed SSL certificates for local development using Node.js crypto
// This script works on Windows and creates certificates that work for both localhost and your local IP

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Create certs directory
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('🔐 Generating self-signed SSL certificates using Node.js crypto...');

// Get local IP address
function getLocalIP() {
  try {
    // Try multiple methods to get local IP
    const interfaces = require('os').networkInterfaces();
    for (const [name, nets] of Object.entries(interfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    throw new Error('No external IP found');
  } catch (error) {
    console.log('⚠️  Could not detect local IP, using 192.168.1.4');
    return '192.168.1.4';
  }
}

const localIP = getLocalIP();
console.log(`📍 Detected local IP: ${localIP}`);

// Generate key pair using Node.js crypto
function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}

// Generate certificate using Node.js
function generateCertificate(privateKey, publicKey, localIP) {
  const certificate = crypto.createCertificate();
  
  certificate.setPublicKey(publicKey);
  
  certificate.setSubject({
    country: 'PH',
    state: 'Manila',
    locality: 'Manila',
    organization: 'Bio Attendance System',
    organizationalUnit: 'Development',
    commonName: 'localhost'
  });
  
  certificate.setIssuer({
    country: 'PH',
    state: 'Manila',
    locality: 'Manila',
    organization: 'Bio Attendance System',
    organizationalUnit: 'Development',
    commonName: 'localhost'
  });
  
  // Add subject alternative names
  const extensions = [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' },    // IP
        { type: 7, ip: localIP }          // IP
      ]
    }
  ];
  
  certificate.setExtensions(extensions);
  
  // Set validity (365 days)
  const validFrom = new Date();
  const validTo = new Date(validFrom);
  validTo.setDate(validTo.getDate() + 365);
  
  certificate.setValidity(validFrom, validTo);
  
  return certificate.sign(privateKey, crypto.createHash('sha256'));
}

// Main function
async function main() {
  try {
    console.log('🔑 Generating RSA key pair...');
    const { publicKey, privateKey } = await generateKeyPair();
    
    console.log('📜 Generating self-signed certificate...');
    const certificate = generateCertificate(privateKey, publicKey, localIP);
    
    // Write files
    const keyPath = path.join(certsDir, 'server.key');
    const certPath = path.join(certsDir, 'server.crt');
    
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, certificate);
    
    console.log('✅ SSL certificates generated successfully!');
    console.log(`📂 Certificates location: ${certsDir}`);
    console.log(`🔒 Private key: server.key`);
    console.log(`📜 Certificate: server.crt`);
    console.log('');
    console.log('🚀 You can now use HTTPS in your development environment!');
    console.log('');
    console.log('⚠️  Note: Your browser will show a security warning because these are self-signed certificates.');
    console.log('   This is normal for development. Click "Advanced" then "Proceed to site" to continue.');
    
  } catch (error) {
    console.error('❌ Error generating certificates:', error.message);
    console.log('💡 Try installing OpenSSL or use the deploy.js script for alternative methods');
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { generateKeyPair, generateCertificate };