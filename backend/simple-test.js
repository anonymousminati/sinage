/**
 * Simple test to check authentication and playlist reorder endpoint
 */
require('dotenv').config();

const axios = require('axios');
const { connectDatabase } = require('./config/database');
const mongoose = require('mongoose');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function simpleTest() {
  try {
    console.log('🔧 Starting Simple Test...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Create a unique test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    console.log(`\n📝 Step 1: Creating test user (${testEmail})...`);
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      });
      console.log('✅ User registered successfully');
    } catch (regError) {
      console.log('❌ Registration failed:', regError.response?.data);
      return;
    }

    console.log('\n🔑 Step 2: Logging in...');
    try {
      console.log(`📤 Login request: ${testEmail} / ${testPassword}`);
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: testEmail,
        password: testPassword
      });

      console.log('📥 Login response status:', loginResponse.status);
      console.log('📥 Login response data:', JSON.stringify(loginResponse.data, null, 2));

      if (!loginResponse.data.data || !loginResponse.data.data.tokens || !loginResponse.data.data.tokens.accessToken) {
        throw new Error('No access token in response');
      }

      const token = loginResponse.data.data.tokens.accessToken;
      console.log('✅ Login successful');
      console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');

      // Test the token by making a simple authenticated request first
      console.log('\n🔍 Step 2.1: Testing token with profile endpoint...');
      try {
        const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Token works - profile retrieved');
        console.log('👤 User:', profileResponse.data.data.email);
      } catch (profileError) {
        console.log('❌ Token test failed:', profileError.response?.data);
        return;
      }

      // Test the validation schema directly first
      console.log('\n🧪 Step 3: Testing validation schema...');
      
      const Joi = require('joi');
      
      const reorderItemsUpdateSchema = Joi.object({
        items: Joi.array().items(Joi.object({
          id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
          order: Joi.number().min(0).required()
        })).min(1).required()
      });

      // Create sample ObjectId-like strings
      const sampleObjectId1 = new mongoose.Types.ObjectId().toString();
      const sampleObjectId2 = new mongoose.Types.ObjectId().toString();
      
      const testData = {
        items: [
          { id: sampleObjectId1, order: 0 },
          { id: sampleObjectId2, order: 1 }
        ]
      };

      console.log('📤 Test data:', JSON.stringify(testData, null, 2));

      const { error, value } = reorderItemsUpdateSchema.validate(testData);

      if (error) {
        console.log('❌ Joi validation failed:');
        error.details.forEach(detail => {
          console.log(`  - ${detail.path.join('.')}: ${detail.message}`);
          console.log(`    Value: ${JSON.stringify(detail.context?.value)}`);
        });
        return;
      } else {
        console.log('✅ Joi validation passed');
        console.log('📄 Validated data:', JSON.stringify(value, null, 2));
      }

      // Now test endpoint with a non-existent playlist (should fail with 404, not validation error)
      console.log('\n🎯 Step 4: Testing endpoint with dummy playlist ID...');
      
      const dummyPlaylistId = new mongoose.Types.ObjectId().toString();
      
      try {
        const response = await axios.put(
          `${BASE_URL}/api/playlists/${dummyPlaylistId}/reorder`,
          testData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('❓ Unexpected success:', response.data);
      } catch (endpointError) {
        console.log('📥 Endpoint response status:', endpointError.response?.status);
        console.log('📥 Endpoint response data:', JSON.stringify(endpointError.response?.data, null, 2));
        
        if (endpointError.response?.status === 400) {
          console.log('❌ Got validation error (this should be the issue we\'re debugging)');
          
          // Let's try to understand what validation failed
          if (endpointError.response.data.errors) {
            console.log('📄 Detailed validation errors:');
            endpointError.response.data.errors.forEach((error, index) => {
              console.log(`  ${index + 1}. ${error}`);
            });
          }
        } else if (endpointError.response?.status === 401) {
          console.log('❌ Authentication failed - token issue');
        } else if (endpointError.response?.status === 404) {
          console.log('✅ Got 404 as expected (playlist not found)');
        } else {
          console.log('❓ Unexpected status code');
        }
      }

    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data);
      return;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📥 Error response:', error.response.data);
    }
  } finally {
    // Clean up: close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the test
simpleTest()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });