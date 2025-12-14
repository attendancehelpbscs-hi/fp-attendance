#!/usr/bin/env node

/**
 * Free Deployment Script for Bio Attendance System
 * Deploys to various free hosting platforms with HTTPS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Bio Attendance System - Free Deployment Script');
console.log('================================================');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function runCommand(command, description) {
  try {
    log('blue', `Running: ${description}`);
    execSync(command, { stdio: 'inherit' });
    log('green', `✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    log('red', `❌ ${description} failed: ${error.message}`);
    return false;
  }
}

// Check prerequisites
function checkPrerequisites() {
  log('yellow', '🔍 Checking prerequisites...');
  
  const requiredFiles = [
    'server/package.json',
    'client/package.json',
    'client/vite.config.ts',
    'server/src/index.ts'
  ];
  
  const missingFiles = requiredFiles.filter(file => !checkFileExists(file));
  
  if (missingFiles.length > 0) {
    log('red', `❌ Missing required files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  log('green', '✅ All prerequisites met');
  return true;
}

// Deploy to Vercel (Frontend)
function deployVercel() {
  log('yellow', '📦 Deploying to Vercel (Frontend only)...');
  
  // Build client
  if (!runCommand('cd client && npm run build', 'Building client application')) {
    return false;
  }
  
  // Deploy to Vercel
  const vercelDeploy = runCommand('npx vercel --prod', 'Deploying to Vercel');
  
  if (vercelDeploy) {
    log('green', '🎉 Frontend deployed to Vercel with HTTPS!');
    log('blue', '🌐 Your app is now accessible via HTTPS URL from Vercel');
  }
  
  return vercelDeploy;
}

// Deploy to Railway (Full-stack)
function deployRailway() {
  log('yellow', '🚂 Deploying to Railway (Full-stack)...');
  
  // Install Railway CLI
  runCommand('npm install -g @railway/cli', 'Installing Railway CLI');
  
  // Login to Railway
  const loginSuccess = runCommand('railway login', 'Logging into Railway');
  
  if (!loginSuccess) {
    log('red', '❌ Railway login failed');
    return false;
  }
  
  // Deploy backend
  const backendDeploy = runCommand('cd server && railway up', 'Deploying backend to Railway');
  
  if (backendDeploy) {
    log('green', '🎉 Backend deployed to Railway with HTTPS!');
    
    // Try to deploy frontend too
    runCommand('cd client && railway up', 'Deploying frontend to Railway');
    
    log('blue', '🌐 Your full-stack app is now accessible via HTTPS URL from Railway');
  }
  
  return backendDeploy;
}

// Deploy to Render (Backend)
function deployRender() {
  log('yellow', '🎨 Deploying to Render (Backend)...');
  
  log('blue', '📋 Manual steps required for Render:');
  console.log('1. Go to https://render.com');
  console.log('2. Connect your GitHub repository');
  console.log('3. Create a new Web Service');
  console.log('4. Set build command: cd server && npm install && npm run build');
  console.log('5. Set start command: cd server && npm start');
  console.log('6. HTTPS will be automatically enabled');
  
  return true;
}

// Deploy locally with HTTPS
function deployLocalHTTPS() {
  log('yellow', '🏠 Setting up local HTTPS...');
  
  // Generate certificates
  const certGen = runCommand('node generate-certs.js', 'Generating SSL certificates');
  
  if (!certGen) {
    log('red', '❌ Certificate generation failed');
    return false;
  }
  
  // Build client for production
  const buildSuccess = runCommand('cd client && npm run build', 'Building client for production');
  
  if (buildSuccess) {
    log('green', '🎉 Local HTTPS setup complete!');
    log('blue', '🌐 Your app is now accessible via https://localhost:5173');
  }
  
  return buildSuccess;
}

// Main deployment function
function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'local';
  
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  switch (platform.toLowerCase()) {
    case 'vercel':
    case 'v':
      deployVercel();
      break;
      
    case 'railway':
    case 'r':
      deployRailway();
      break;
      
    case 'render':
    case 'render':
      deployRender();
      break;
      
    case 'local':
    case 'l':
    default:
      deployLocalHTTPS();
      break;
  }
  
  log('green', '🎯 Deployment options completed!');
  log('blue', '💡 Tips:');
  console.log('• Use "node deploy.js vercel" for Vercel deployment');
  console.log('• Use "node deploy.js railway" for Railway deployment');
  console.log('• Use "node deploy.js render" for Render instructions');
  console.log('• Use "node deploy.js local" for local HTTPS setup');
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { deployVercel, deployRailway, deployRender, deployLocalHTTPS };