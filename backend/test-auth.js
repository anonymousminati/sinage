/**
 * Authentication System Test Script
 * Simple test script to verify the authentication endpoints are working correctly
 * 
 * Usage: node test-auth.js
 * Make sure the server is running on http://localhost:5000
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password@123'
};

let authTokens = null;

// Configure axios to handle cookies
axios.defaults.withCredentials = true;

/**
 * Test helper functions
 */
const logTest = (testName, status, message, data = null) => {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${statusIcon} ${testName}: ${message}`);
  if (data && process.env.VERBOSE) {
    console.log('   Data:', JSON.stringify(data, null, 4));
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test Functions
 */

async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    
    if (response.status === 200 && response.data.success) {
      logTest('Health Check', 'PASS', 'Server is healthy', response.data);
      return true;
    } else {
      logTest('Health Check', 'FAIL', 'Server health check failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Health Check', 'FAIL', `Server is not responding: ${error.message}`);
    return false;
  }
}

async function testUserRegistration() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    if (response.status === 201 && response.data.success) {
      logTest('User Registration', 'PASS', 'User registered successfully', {
        userId: response.data.data.user.id,
        email: response.data.data.user.email,
        isVerified: response.data.data.user.isVerified
      });
      return true;
    } else {
      logTest('User Registration', 'FAIL', 'Registration failed', response.data);
      return false;
    }
  } catch (error) {
    if (error.response?.data?.code === 'USER_EXISTS') {
      logTest('User Registration', 'PASS', 'User already exists (expected for repeated tests)');
      return true;
    }
    
    logTest('User Registration', 'FAIL', `Registration error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testUserLogin() {
  try {
    const loginData = {
      email: testUser.email,
      password: testUser.password,
      rememberMe: false
    };
    
    const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
    
    if (response.status === 200 && response.data.success) {
      authTokens = response.data.data.tokens;
      logTest('User Login', 'PASS', 'Login successful', {
        userId: response.data.data.user.id,
        email: response.data.data.user.email,
        tokenType: authTokens.tokenType,
        hasAccessToken: !!authTokens.accessToken,
        hasRefreshToken: !!authTokens.refreshToken
      });
      return true;
    } else {
      logTest('User Login', 'FAIL', 'Login failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('User Login', 'FAIL', `Login error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testTokenValidation() {
  try {
    if (!authTokens?.accessToken) {
      logTest('Token Validation', 'FAIL', 'No access token available');
      return false;
    }

    const response = await axios.get(`${BASE_URL}/auth/validate-token`, {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Token Validation', 'PASS', 'Token is valid', {
        userId: response.data.data.user.id,
        email: response.data.data.user.email,
        role: response.data.data.user.role,
        tokenExpiry: new Date(response.data.data.tokenExpiry * 1000).toISOString()
      });
      return true;
    } else {
      logTest('Token Validation', 'FAIL', 'Token validation failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Token Validation', 'FAIL', `Token validation error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetProfile() {
  try {
    if (!authTokens?.accessToken) {
      logTest('Get Profile', 'FAIL', 'No access token available');
      return false;
    }

    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Get Profile', 'PASS', 'Profile retrieved successfully', {
        userId: response.data.data.user.id,
        name: response.data.data.user.name,
        email: response.data.data.user.email,
        role: response.data.data.user.role,
        isVerified: response.data.data.user.isVerified,
        createdAt: response.data.data.user.createdAt
      });
      return true;
    } else {
      logTest('Get Profile', 'FAIL', 'Profile retrieval failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Get Profile', 'FAIL', `Profile error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testUpdateProfile() {
  try {
    if (!authTokens?.accessToken) {
      logTest('Update Profile', 'FAIL', 'No access token available');
      return false;
    }

    const updateData = {
      name: 'Updated Test User',
      preferences: {
        notifications: {
          email: false,
          screenStatus: true,
          playlistUpdates: true
        },
        dashboard: {
          theme: 'dark',
          defaultView: 'screens'
        }
      }
    };

    const response = await axios.put(`${BASE_URL}/auth/profile`, updateData, {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Update Profile', 'PASS', 'Profile updated successfully', {
        name: response.data.data.user.name,
        preferences: response.data.data.user.preferences
      });
      return true;
    } else {
      logTest('Update Profile', 'FAIL', 'Profile update failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Update Profile', 'FAIL', `Profile update error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRefreshToken() {
  try {
    if (!authTokens?.refreshToken) {
      logTest('Refresh Token', 'FAIL', 'No refresh token available');
      return false;
    }

    const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
      refreshToken: authTokens.refreshToken
    });
    
    if (response.status === 200 && response.data.success) {
      const newTokens = response.data.data.tokens;
      authTokens = newTokens; // Update tokens for subsequent tests
      
      logTest('Refresh Token', 'PASS', 'Token refreshed successfully', {
        tokenType: newTokens.tokenType,
        hasNewAccessToken: !!newTokens.accessToken,
        hasNewRefreshToken: !!newTokens.refreshToken,
        accessTokenExpiry: newTokens.accessTokenExpiresAt,
        refreshTokenExpiry: newTokens.refreshTokenExpiresAt
      });
      return true;
    } else {
      logTest('Refresh Token', 'FAIL', 'Token refresh failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Refresh Token', 'FAIL', `Token refresh error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  try {
    logTest('Rate Limiting', 'INFO', 'Testing rate limiting (this may take a moment)...');
    
    const requests = [];
    const maxRequests = 6; // Auth limit is 5 per 15 minutes
    
    // Send multiple rapid requests
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        axios.post(`${BASE_URL}/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }).catch(error => error.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(res => 
      res && res.status === 429 && res.data?.code === 'RATE_LIMIT_EXCEEDED'
    );
    
    if (rateLimitedResponses.length > 0) {
      logTest('Rate Limiting', 'PASS', `Rate limiting is working (${rateLimitedResponses.length} requests blocked)`);
      return true;
    } else {
      logTest('Rate Limiting', 'FAIL', 'Rate limiting may not be working as expected');
      return false;
    }
  } catch (error) {
    logTest('Rate Limiting', 'FAIL', `Rate limiting test error: ${error.message}`);
    return false;
  }
}

async function testInvalidToken() {
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        Authorization: 'Bearer invalid-token-here'
      }
    });
    
    logTest('Invalid Token', 'FAIL', 'Invalid token was accepted (should have been rejected)');
    return false;
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.code === 'INVALID_TOKEN') {
      logTest('Invalid Token', 'PASS', 'Invalid token correctly rejected');
      return true;
    } else {
      logTest('Invalid Token', 'FAIL', `Unexpected error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

async function testLogout() {
  try {
    if (!authTokens?.accessToken) {
      logTest('Logout', 'FAIL', 'No access token available');
      return false;
    }

    const response = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Logout', 'PASS', 'Logout successful');
      authTokens = null; // Clear tokens
      return true;
    } else {
      logTest('Logout', 'FAIL', 'Logout failed', response.data);
      return false;
    }
  } catch (error) {
    logTest('Logout', 'FAIL', `Logout error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting Authentication System Tests\n');
  console.log(`📍 Testing server at: ${BASE_URL}`);
  console.log(`👤 Test user: ${testUser.email}\n`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Token Validation', fn: testTokenValidation },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Update Profile', fn: testUpdateProfile },
    { name: 'Refresh Token', fn: testRefreshToken },
    { name: 'Invalid Token Handling', fn: testInvalidToken },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Logout', fn: testLogout }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passedTests++;
      
      // Add small delay between tests
      await sleep(500);
    } catch (error) {
      logTest(test.name, 'FAIL', `Unexpected error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs and configuration.');
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--verbose')) {
  process.env.VERBOSE = 'true';
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testHealthCheck,
  testUserRegistration,
  testUserLogin,
  testTokenValidation,
  testGetProfile,
  testUpdateProfile,
  testRefreshToken,
  testInvalidToken,
  testLogout,
  testRateLimiting
};