#!/usr/bin/env node

/**
 * Fingerprint Recognition Diagnostic Tool
 * This script helps diagnose issues with fingerprint recognition in the attendance kiosk
 */

const axios = require('axios');

const config = {
  backendUrl: 'http://localhost:5005/api',
  matchServerUrl: 'http://localhost:5050',
  testStudentId: null, // Set to a specific student ID to test
};

async function checkServerConnections() {
  console.log('🔍 Checking server connections...\n');
  
  // Check backend server
  try {
    const response = await axios.get(`${config.backendUrl}/health`, { timeout: 5000 });
    console.log('✅ Backend Server: Connected');
  } catch (error) {
    console.log('❌ Backend Server: Not responding');
    console.log(`   Error: ${error.message}`);
  }
  
  // Check Python match server
  try {
    const response = await axios.get(`${config.matchServerUrl}/health`, { timeout: 5000 });
    console.log('✅ Python Match Server: Connected');
  } catch (error) {
    console.log('❌ Python Match Server: Not responding');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n');
}

async function checkDatabaseConnection() {
  console.log('🗄️ Checking database connection...\n');
  
  try {
    // Try to fetch a small number of students to test DB connection
    const response = await axios.get(`${config.backendUrl}/students/staff/test`, { 
      params: { page: 1, per_page: 1 },
      timeout: 10000 
    });
    console.log('✅ Database: Connected and accessible');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️ Database: Connected but authentication required');
    } else {
      console.log('❌ Database: Connection issues');
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n');
}

async function checkFingerprintData() {
  console.log('👆 Checking fingerprint enrollment status...\n');
  
  try {
    // Get students with fingerprints
    const response = await axios.get(`${config.backendUrl}/students/fingerprints/test`, {
      params: { page: 1, per_page: 100 },
      timeout: 10000
    });
    
    const students = response.data.data?.students || [];
    console.log(`📊 Found ${students.length} students with enrolled fingerprints`);
    
    if (students.length > 0) {
      console.log('\n📋 Students with fingerprints:');
      students.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (ID: ${student.matric_no})`);
        console.log(`      Grade: ${student.grade}`);
        console.log(`      Fingerprints: ${student.fingerprints?.length || 0}`);
        if (student.fingerprints && student.fingerprints.length > 0) {
          student.fingerprints.forEach(fp => {
            console.log(`        - ${fp.finger_type} finger (ID: ${fp.id})`);
          });
        }
        console.log('');
      });
      
      if (students.length > 5) {
        console.log(`   ... and ${students.length - 5} more students`);
      }
    } else {
      console.log('⚠️ No students found with enrolled fingerprints');
    }
    
  } catch (error) {
    console.log('❌ Error checking fingerprint data');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n');
}

async function testFingerprintMatch() {
  console.log('🧪 Testing fingerprint matching capabilities...\n');
  
  try {
    // Try to access the match endpoint
    const response = await axios.post(`${config.matchServerUrl}/identify/fingerprint/test`, {}, { timeout: 5000 });
    console.log('✅ Fingerprint matching: Endpoint accessible');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Fingerprint matching: Endpoint accessible (expected bad request for test)');
    } else {
      console.log('❌ Fingerprint matching: Endpoint issues');
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n');
}

async function checkEnvironmentVariables() {
  console.log('⚙️ Checking environment configuration...\n');
  
  const requiredVars = [
    'VITE_BACKEND_BASE_URL',
    'VITE_MATCH_BACKEND_BASE_URL'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`❌ ${varName}: Not set`);
    }
  });
  
  console.log('\n');
}

async function provideRecommendations() {
  console.log('💡 Recommendations for fixing fingerprint recognition issues:\n');
  
  console.log('1. 🔧 Lower Confidence Threshold:');
  console.log('   - Current threshold might be too high (40%)');
  console.log('   - Consider lowering to 20-25% for better recognition');
  console.log('   - The updated code now uses adaptive thresholds\n');
  
  console.log('2. 🔄 Enable Auto-Retry:');
  console.log('   - The kiosk now has auto-retry for borderline matches');
  console.log('   - Students get multiple chances to scan successfully\n');
  
  console.log('3. 🧹 Clean Fingerprint Data:');
  console.log('   - Check for corrupted fingerprint enrollments');
  console.log('   - Consider re-enrolling problematic fingerprints\n');
  
  console.log('4. 🔌 Verify Server Connections:');
  console.log('   - Ensure both backend (port 5005) and Python server (port 5050) are running');
  console.log('   - Check firewall and network connectivity\n');
  
  console.log('5. 📊 Monitor Scan Quality:');
  console.log('   - The kiosk now shows confidence scores');
  console.log('   - Low confidence scans may need better finger placement\n');
  
  console.log('6. 🆕 Update Fingerprint Enrollment:');
  console.log('   - Ensure students use consistent finger placement');
  console.log('   - Consider enrolling multiple fingers per student\n');
}

async function runDiagnostics() {
  console.log('🩺 Fingerprint Recognition Diagnostic Tool');
  console.log('===========================================\n');
  
  await checkServerConnections();
  await checkDatabaseConnection();
  await checkFingerprintData();
  await testFingerprintMatch();
  await checkEnvironmentVariables();
  await provideRecommendations();
  
  console.log('🏁 Diagnostic complete!');
  console.log('\nIf issues persist, check:');
  console.log('- Python server logs for detailed error messages');
  console.log('- Browser console for client-side errors');
  console.log('- Network tab for failed API requests');
}

// Run diagnostics
runDiagnostics().catch(console.error);