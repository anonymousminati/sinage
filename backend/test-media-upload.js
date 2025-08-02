/**
 * Test script for media upload functionality
 * Tests the new Cloudinary upload_stream implementation
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
let authTokens = null;
const testUser = {
  name: 'Media Test User',
  email: 'mediatest@example.com',
  password: 'password123'
};

// Configure axios to handle cookies
axios.defaults.withCredentials = true;

/**
 * Utility function to log test results
 */
const logTest = (test, result, data = null) => {
  const timestamp = new Date().toISOString();
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`[${timestamp}] ${status} - ${test}`);
  if (data) {
    console.log('  Response:', JSON.stringify(data, null, 2));
  }
  console.log('');
};

/**
 * Create a test image buffer
 */
const createTestImageBuffer = () => {
  // Create a simple 1x1 pixel PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth = 8, color type = 2, compression = 0, filter = 0, interlace = 0
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  return pngData;
};

/**
 * Test user registration
 */
const testRegister = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    logTest('User Registration', response.status === 201, response.data);
    return response.status === 201;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      logTest('User Registration', true, { message: 'User already exists' });
      return true;
    }
    logTest('User Registration', false, error.response?.data || error.message);
    return false;
  }
};

/**
 * Test user login
 */
const testLogin = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.status === 200 && response.data.data?.tokens) {
      authTokens = response.data.data.tokens;
      // Set authorization header for subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${authTokens.accessToken}`;
      logTest('User Login', true, { tokens: 'Received successfully' });
      return true;
    }
    
    logTest('User Login', false, response.data);
    return false;
  } catch (error) {
    logTest('User Login', false, error.response?.data || error.message);
    return false;
  }
};

/**
 * Test single file upload
 */
const testSingleUpload = async () => {
  try {
    const imageBuffer = createTestImageBuffer();
    const form = new FormData();
    
    form.append('file', imageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    form.append('duration', '10');
    form.append('tags', 'test,image,upload');
    form.append('description', 'Test image upload');

    const response = await axios.post(`${BASE_URL}/media/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${authTokens.accessToken}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    logTest('Single File Upload', response.status === 201, response.data);
    return response.status === 201 ? response.data.data : null;
    
  } catch (error) {
    logTest('Single File Upload', false, error.response?.data || error.message);
    return null;
  }
};

/**
 * Test multiple file upload
 */
const testMultipleUpload = async () => {
  try {
    const form = new FormData();
    
    // Add multiple test images
    for (let i = 0; i < 3; i++) {
      const imageBuffer = createTestImageBuffer();
      form.append('files', imageBuffer, {
        filename: `test-image-${i + 1}.png`,
        contentType: 'image/png'
      });
    }
    
    form.append('tags', 'test,multiple,upload');
    form.append('description', 'Test multiple file upload');

    const response = await axios.post(`${BASE_URL}/media/upload/multiple`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${authTokens.accessToken}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    logTest('Multiple File Upload', response.status === 201, response.data);
    return response.status === 201 ? response.data.data : null;
    
  } catch (error) {
    logTest('Multiple File Upload', false, error.response?.data || error.message);
    return null;
  }
};

/**
 * Test file details retrieval
 */
const testGetFileDetails = async (publicId) => {
  try {
    const response = await axios.get(`${BASE_URL}/media/${publicId}`, {
      headers: {
        'Authorization': `Bearer ${authTokens.accessToken}`
      }
    });

    logTest('Get File Details', response.status === 200, response.data);
    return response.status === 200;
    
  } catch (error) {
    logTest('Get File Details', false, error.response?.data || error.message);
    return false;
  }
};

/**
 * Test file deletion
 */
const testDeleteFile = async (publicId) => {
  try {
    const response = await axios.delete(`${BASE_URL}/media/${publicId}`, {
      headers: {
        'Authorization': `Bearer ${authTokens.accessToken}`
      }
    });

    logTest('Delete File', response.status === 200, response.data);
    return response.status === 200;
    
  } catch (error) {
    logTest('Delete File', false, error.response?.data || error.message);
    return false;
  }
};

/**
 * Test media service health check
 */
const testMediaHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/media/health/check`, {
      headers: {
        'Authorization': `Bearer ${authTokens.accessToken}`
      }
    });

    logTest('Media Health Check', response.status === 200, response.data);
    return response.status === 200;
    
  } catch (error) {
    logTest('Media Health Check', false, error.response?.data || error.message);
    return false;
  }
};

/**
 * Test unauthorized access
 */
const testUnauthorizedAccess = async () => {
  try {
    // Remove authorization header temporarily
    const originalAuth = axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    
    const response = await axios.get(`${BASE_URL}/media/health/check`);
    
    // Restore authorization header
    axios.defaults.headers.common['Authorization'] = originalAuth;
    
    logTest('Unauthorized Access Protection', response.status === 401, 'Should be blocked');
    return response.status === 401;
    
  } catch (error) {
    // Restore authorization header
    if (authTokens) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authTokens.accessToken}`;
    }
    
    const isUnauthorized = error.response?.status === 401;
    logTest('Unauthorized Access Protection', isUnauthorized, error.response?.data || error.message);
    return isUnauthorized;
  }
};

/**
 * Run all media upload tests
 */
const runMediaTests = async () => {
  console.log('🚀 Starting Media Upload Tests');
  console.log('================================\n');

  let passedTests = 0;
  let totalTests = 0;
  let uploadedFile = null;

  // Test 1: User Registration
  totalTests++;
  if (await testRegister()) passedTests++;

  // Test 2: User Login
  totalTests++;
  if (await testLogin()) passedTests++;

  // Test 3: Media Health Check
  totalTests++;
  if (await testMediaHealth()) passedTests++;

  // Test 4: Single File Upload
  totalTests++;
  uploadedFile = await testSingleUpload();
  if (uploadedFile) passedTests++;

  // Test 5: Multiple File Upload
  totalTests++;
  const multipleFiles = await testMultipleUpload();
  if (multipleFiles) passedTests++;

  // Test 6: Get File Details (if we have an uploaded file)
  if (uploadedFile && uploadedFile.publicId) {
    totalTests++;
    if (await testGetFileDetails(uploadedFile.publicId)) passedTests++;
  }

  // Test 7: Unauthorized Access Protection
  totalTests++;
  if (await testUnauthorizedAccess()) passedTests++;

  // Test 8: Delete File (if we have an uploaded file)
  if (uploadedFile && uploadedFile.publicId) {
    totalTests++;
    if (await testDeleteFile(uploadedFile.publicId)) passedTests++;
  }

  // Summary
  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Media upload system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
  }

  process.exit(passedTests === totalTests ? 0 : 1);
};

// Handle script execution
if (require.main === module) {
  runMediaTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMediaTests,
  testSingleUpload,
  testMultipleUpload,
  testGetFileDetails,
  testDeleteFile
};