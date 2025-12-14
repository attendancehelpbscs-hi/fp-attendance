#!/usr/bin/env node

/**
 * HTTPS Testing Script for Bio Attendance System
 * Tests all HTTPS functionality and provides detailed feedback
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Bio Attendance System - HTTPS Testing');
console.log('=========================================');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results
const testResults = {
  certificates: false,
  clientHttps: false,
  serverHttps: false,
  localAccess: false,
  networkAccess: false,
};

function testCertificateFiles() {
  log('yellow', '🔐 Testing certificate files...');
  
  const certPath = path.join(__dirname, 'certs/server.crt');
  const keyPath = path.join(__dirname, 'certs/server.key');
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    log('green', '✅ Certificate files exist');
    testResults.certificates = true;
    return true;
  } else {
    log('red', '❌ Certificate files missing');
    log('blue', '💡 Run "node generate-certs.js" to create certificates');
    return false;
  }
}

function testHttpsConnection(host, port, description) {
  return new Promise((resolve) => {
    log('yellow', `🔗 Testing ${description}...`);
    
    const options = {
      host: host,
      port: port,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false, // Allow self-signed certificates
      timeout: 5000,
    };
    
    const req = https.request(options, (res) => {
      log('green', `✅ ${description} - Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      log('red', `❌ ${description} failed: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      log('red', `❌ ${description} timed out`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

function testHttpConnection(host, port, description) {
  return new Promise((resolve) => {
    log('yellow', `🔗 Testing ${description}...`);
    
    const req = http.request({
      host: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: 5000,
    }, (res) => {
      log('green', `✅ ${description} - Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      log('red', `❌ ${description} failed: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      log('red', `❌ ${description} timed out`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function runTests() {
  log('cyan', '🚀 Starting HTTPS tests...\n');
  
  // Test 1: Certificate files
  const certsExist = testCertificateFiles();
  console.log();
  
  if (!certsExist) {
    log('red', '⚠️  Cannot proceed with HTTPS tests without certificates');
    return;
  }
  
  // Test 2: Local HTTPS connections
  log('yellow', '🌐 Testing local connections...');
  
  // Test client HTTPS
  const clientHttps = await testHttpsConnection('localhost', 5173, 'Client HTTPS (localhost:5173)');
  testResults.clientHttps = clientHttps;
  
  // Test server HTTPS
  const serverHttps = await testHttpsConnection('localhost', 5005, 'Server HTTPS (localhost:5005)');
  testResults.serverHttps = serverHttps;
  console.log();
  
  // Test 3: Local HTTP (fallback)
  log('yellow', '🔄 Testing HTTP fallback...');
  const clientHttp = await testHttpConnection('localhost', 5173, 'Client HTTP (localhost:5173)');
  const serverHttp = await testHttpConnection('localhost', 5005, 'Server HTTP (localhost:5005)');
  console.log();
  
  // Test 4: Network IP access
  log('yellow', '🌍 Testing network access...');
  const localIP = '192.168.1.4';
  
  const networkHttps = await testHttpsConnection(localIP, 5173, `Network HTTPS (${localIP}:5173)`);
  testResults.networkAccess = networkHttps;
  console.log();
  
  // Generate report
  generateReport();
}

function generateReport() {
  log('cyan', '📊 Test Results Summary');
  console.log('========================');
  
  log(testResults.certificates ? 'green' : 'red', `Certificates: ${testResults.certificates ? '✅ PASS' : '❌ FAIL'}`);
  log(testResults.clientHttps ? 'green' : 'yellow', `Client HTTPS: ${testResults.clientHttps ? '✅ PASS' : '⚠️  CHECK'}`);
  log(testResults.serverHttps ? 'green' : 'yellow', `Server HTTPS: ${testResults.serverHttps ? '✅ PASS' : '⚠️  CHECK'}`);
  log(testResults.networkAccess ? 'green' : 'yellow', `Network Access: ${testResults.networkAccess ? '✅ PASS' : '⚠️  CHECK'}`);
  
  console.log();
  
  if (testResults.certificates) {
    log('green', '🎉 HTTPS setup is ready!');
    log('blue', '💡 Next steps:');
    console.log('1. Start server: cd server && npm run server:dev');
    console.log('2. Start client: cd client && npm run dev -- --config vite.config.https.ts');
    console.log('3. Access: https://192.168.1.4:5173/');
  } else {
    log('yellow', '⚠️  HTTPS setup incomplete');
    log('blue', '💡 To complete setup:');
    console.log('1. Run: node generate-certs.js');
    console.log('2. Then run this test again');
  }
  
  console.log();
  log('cyan', '🔗 Quick Access URLs:');
  console.log(`• Local HTTP:  http://localhost:5173`);
  console.log(`• Local HTTPS: https://localhost:5173`);
  console.log(`• Network HTTP:  http://192.168.1.4:5173`);
  console.log(`• Network HTTPS: https://192.168.1.4:5173`);
  console.log(`• API HTTP:  http://localhost:5005`);
  console.log(`• API HTTPS: https://localhost:5005`);
}

// Run tests
if (require.main === module) {
  runTests().catch(err => {
    log('red', `❌ Test failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { testCertificateFiles, testHttpsConnection, testHttpConnection };