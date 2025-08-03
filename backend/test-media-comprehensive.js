/**
 * Comprehensive test script for the new Media Management API
 * Tests all endpoints with the Media model integration
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';
let testMediaId = '';

// Test user credentials
const testUser = {
  email: 'mediatest@example.com',
  password: 'TestPass123!',
  name: 'Media Test User'
};

/**
 * Test Authentication
 */
async function testAuth() {
  console.log('🔐 Testing Authentication...');

  try {
    // Register or login
    let response;
    try {
      response = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('📝 User exists, logging in...');
        response = await axios.post(`${API_BASE}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
      } else {
        throw error;
      }
    }

    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    console.log(`📋 Token: ${authToken.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test Media Upload with Metadata
 */
async function testMediaUpload() {
  console.log('📤 Testing Media Upload...');

  try {
    // Create a test image file (small PNG)
    const testImageData = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0,
      0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 248, 15, 0, 0, 1, 0, 1,
      0, 21, 221, 205, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]); const form = new FormData(); form.append('file', testImageData, { filename: 'test-image.png', contentType: 'image/png' }); form.append('duration', '15'); form.append('tags', 'test,advertisement,sample'); form.append('description', 'Test image for comprehensive media API testing'); const response = await axios.post(`${API_BASE}/media/upload`, form, { headers: { ...form.getHeaders(), 'Authorization': `Bearer ${authToken}` } }); testMediaId = response.data.data._id; console.log('✅ Media uploaded successfully'); console.log(`📋 Media ID: ${testMediaId}`); console.log(`📋 Cloudinary ID: ${response.data.data.cloudinaryId}`); console.log(`📋 File Size: ${response.data.data.fileSize} bytes`); console.log(`📋 Duration: ${response.data.data.duration} seconds`); console.log(`📋 Tags: ${response.data.data.tags.join(', ')}`); return true;
  } catch (error) { console.error('❌ Media upload failed:', error.response?.data?.message || error.message); if (error.response?.data?.errors) { console.error('📋 Validation errors:', error.response.data.errors); } return false; }
} /*** Test Get Media with Filters*/
async function testGetMedia() {
  console.log('\📋 Testing Get Media with Filters...');
  try {   // Test basic retrieval  
    let response = await axios.get(`${API_BASE}/media`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    console.log('✅ Basic media retrieval successful');
    console.log(`📋 Total files: ${response.data.data.pagination.totalCount}`);
    console.log(`📋 Files on page: ${response.data.data.media.length}`);
    // Test with filters 
    response = await axios.get(`${API_BASE}/media?type=image&search=test&sort=size&limit=5`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    console.log('✅ Filtered media retrieval successful'); console.log(`📋 Filtered results: ${response.data.data.media.length}`); console.log(`📋 Applied filters: ${JSON.stringify(response.data.data.filters)}`); return true;
  } catch (error) { console.error('❌ Get media failed:', error.response?.data?.message || error.message); return false; }
}
/*** Test Update Media Metadata*/
async function testUpdateMedia() {
  console.log('\✏️ Testing Update Media Metadata...');
  if (!testMediaId) {
    console.log('⚠️ Skipping update test - no media ID available');
    return false;
  }
  try {
    const updateData = {
      duration: 20, tags: 'updated,modified,test', description: 'Updated description for comprehensive testing'

    };
    const response = await axios.put(`${API_BASE}/media/${testMediaId}`, updateData,

      { headers: { 'Authorization': `Bearer ${authToken}` } });
    console.log('✅ Media metadata updated successfully');
    console.log(`📋 New duration: ${response.data.data.duration} seconds`);
    console.log(`📋 New tags: ${response.data.data.tags.join(', ')}`
    );
    console.log(`📋 New description: ${response.data.data.description}`); return true;
  }
  catch (error) {
    console.error('❌ Update media failed:', error.response?.data?.message || error.message);
    return false;
  }
}
/*** Test Generate Download URL*/
async function testDownloadUrl() {
  console.log('\⬇️ Testing Generate Download URL...');
  if (!testMediaId) {
    console.log('⚠️ Skipping download test - no media ID available');
    return false;
  }
  try {
    const response = await axios.get(`${API_BASE}/media/${testMediaId}/download`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    console.log('✅ Download URL generated successfully');
    console.log(`📋 Download URL: ${response.data.data.downloadUrl.substring(0, 60)}...`);
    console.log(`📋 Expires at: ${response.data.data.expiresAt}`);
    console.log(`📋 Filename: ${response.data.data.filename}`);
    return true;
  }
  catch (error) {
    console.error('❌ Generate download URL failed:', error.response?.data?.message || error.message); return false;
  }
}
/*** Test Get Media Statistics*/
async function testMediaStats() {
  console.log('\📊 Testing Get Media Statistics...');
  try {
    const response = await axios.get(`${API_BASE}/media/stats`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    console.log('✅ Media statistics retrieved successfully');
    console.log(`📋 Total files: ${response.data.data.database.totalFiles}`);
    console.log(`📋 Total size: ${response.data.data.database.totalSize} bytes`);
    console.log(`📋 Images: ${response.data.data.database.imageCount}`);
    console.log(`📋 Videos: ${response.data.data.database.videoCount}`);
    console.log(`📋 Total usage: ${response.data.data.database.totalUsage}`);
    console.log(`📋 Recent files: ${response.data.data.recent.length}`);
    console.log(`📋 Popular files: ${response.data.data.popular.length}`);
    return true;
  } catch (error) {
    console.error('❌ Get media statistics failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/*** Test Delete Media*/
async function testDeleteMedia() {
  console.log('\🗑️ Testing Delete Media...');
  if (!testMediaId) {
    console.log('⚠️ Skipping delete test - no media ID available');
    return false;
  }
  try {
    const response = await axios.delete(`${API_BASE}/media/${testMediaId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    console.log('✅ Media deleted successfully');
    console.log(`📋 Deleted media ID: ${response.data.data.id}`);
    console.log(`📋 Cloudinary ID: ${response.data.data.cloudinaryId}`);
    return true;
  } catch (error) {
    console.error('❌ Delete media failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/*** Run all tests*/
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Media API Tests');
  console.log(' ============================================ ');
  const tests = [
    { name: 'Authentication', fn: testAuth },
    { name: 'Media Upload', fn: testMediaUpload },
    { name: 'Get Media', fn: testGetMedia },
    { name: 'Update Media', fn: testUpdateMedia },
    { name: 'Download URL', fn: testDownloadUrl },
    { name: 'Media Statistics', fn: testMediaStats },
    { name: 'Delete Media', fn: testDeleteMedia }
  ];
  const results = [];
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ ${test.name} test crashed:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }

  // Summary
  console.log('============================================ ');
  console.log('📊 TEST SUMMARY');
  console.log(' ============================================ ');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  console.log(`🎯 Tests Passed: ${passed}/${total}`);
  if (passed === total) {
    console.log('🎉 All tests passed! The comprehensive media API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the error messages above.');
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled promise rejection: ', err.message);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testAuth, testMediaUpload, testGetMedia, testUpdateMedia, testDownloadUrl, testMediaStats, testDeleteMedia };