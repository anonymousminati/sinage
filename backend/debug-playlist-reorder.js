/**
 * Debug script for playlist reorder endpoint validation
 */
require('dotenv').config();

const axios = require('axios');
const { connectDatabase } = require('./config/database');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function debugPlaylistReorder() {
  try {
    console.log('🔧 Starting Playlist Reorder Debug...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Step 1: Register and login to get a valid token
    console.log('\n📝 Step 1: Registering/logging in...');
    
    // Try to register first (will fail if user exists, which is fine)
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123'
      });
      console.log('✅ User registered');
    } catch (regError) {
      console.log('⚠️ Registration failed (user may already exist):', regError.response?.data?.message);
    }

    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Step 2: Get playlists to find one to test with
    console.log('\n📋 Step 2: Getting playlists...');
    const playlistsResponse = await axios.get(`${BASE_URL}/api/playlists`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const playlists = playlistsResponse.data.data.playlists;
    console.log(`✅ Found ${playlists.length} playlists`);

    if (playlists.length === 0) {
      console.log('❌ No playlists found. Please create a playlist first.');
      return;
    }

    // Find a playlist with items
    let playlistWithItems = playlists.find(p => p.items && p.items.length >= 2);
    
    if (!playlistWithItems) {
      console.log('⚠️ No playlists with items found. Creating a test playlist...');
      
      // Create a test playlist
      const createPlaylistResponse = await axios.post(`${BASE_URL}/api/playlists`, {
        name: 'Test Playlist for Reorder',
        description: 'Test playlist created for debugging reorder functionality'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const newPlaylist = createPlaylistResponse.data.data;
      console.log(`✅ Created test playlist: ${newPlaylist.name}`);
      
      // Get media to add to playlist
      console.log('📋 Getting media to add to playlist...');
      const mediaResponse = await axios.get(`${BASE_URL}/api/media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const media = mediaResponse.data.data.media;
      console.log(`📋 Found ${media.length} media items`);

      if (media.length < 2) {
        console.log('❌ Not enough media items to test reorder. Please upload at least 2 media items.');
        return;
      }

      // Add first two media items to the playlist
      for (let i = 0; i < Math.min(2, media.length); i++) {
        try {
          await axios.post(`${BASE_URL}/api/playlists/${newPlaylist._id}/items`, {
            mediaId: media[i]._id,
            order: i
          }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log(`✅ Added media item ${i + 1} to playlist`);
        } catch (addError) {
          console.log(`❌ Failed to add media item ${i + 1}:`, addError.response?.data?.message);
        }
      }

      // Fetch the updated playlist
      const updatedPlaylistResponse = await axios.get(`${BASE_URL}/api/playlists/${newPlaylist._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const updatedPlaylist = updatedPlaylistResponse.data.data;
      if (!updatedPlaylist.items || updatedPlaylist.items.length < 2) {
        console.log('❌ Failed to create playlist with enough items for testing.');
        return;
      }

      playlistWithItems = updatedPlaylist;
    }

    console.log(`📋 Using playlist: ${playlistWithItems.name} with ${playlistWithItems.items.length} items`);

    // Step 3: Test the reorder endpoint with validation debugging
    console.log('\n🔄 Step 3: Testing reorder endpoint...');
    
    // Create test data similar to what the frontend sends
    const testItems = playlistWithItems.items.slice(0, 2).map((item, index) => ({
      id: item._id,
      order: index + 1
    }));

    console.log('📤 Request payload:', JSON.stringify({
      items: testItems
    }, null, 2));

    console.log('📍 Request URL:', `${BASE_URL}/api/playlists/${playlistWithItems._id}/reorder`);
    console.log('🔑 Authorization header:', `Bearer ${token.substring(0, 20)}...`);

    try {
      const reorderResponse = await axios.put(
        `${BASE_URL}/api/playlists/${playlistWithItems._id}/reorder`,
        {
          items: testItems
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Reorder successful!');
      console.log('📥 Response:', JSON.stringify(reorderResponse.data, null, 2));

    } catch (reorderError) {
      console.log('❌ Reorder failed!');
      
      if (reorderError.response) {
        console.log('📥 Error response status:', reorderError.response.status);
        console.log('📥 Error response data:', JSON.stringify(reorderError.response.data, null, 2));
        console.log('📥 Error response headers:', JSON.stringify(reorderError.response.headers, null, 2));
      } else if (reorderError.request) {
        console.log('📥 No response received:', reorderError.request);
      } else {
        console.log('📥 Error message:', reorderError.message);
      }
    }

    // Step 4: Test the Joi validation schema directly
    console.log('\n🧪 Step 4: Testing Joi validation schema directly...');
    
    const Joi = require('joi');
    
    const reorderItemsUpdateSchema = Joi.object({
      items: Joi.array().items(Joi.object({
        id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
        order: Joi.number().min(0).required()
      })).min(1).required()
    });

    // Test with the same data
    const { error, value } = reorderItemsUpdateSchema.validate({
      items: testItems
    });

    if (error) {
      console.log('❌ Joi validation failed:');
      error.details.forEach(detail => {
        console.log(`  - ${detail.path.join('.')}: ${detail.message}`);
        console.log(`    Value: ${JSON.stringify(detail.context?.value)}`);
      });
    } else {
      console.log('✅ Joi validation passed');
      console.log('📄 Validated data:', JSON.stringify(value, null, 2));
    }

    // Step 5: Test with different data formats to isolate the issue
    console.log('\n🔍 Step 5: Testing edge cases...');
    
    // Test with invalid ObjectId
    const invalidIdTest = {
      items: [
        { id: "invalid_id", order: 1 }
      ]
    };
    
    const { error: invalidIdError } = reorderItemsUpdateSchema.validate(invalidIdTest);
    console.log('🧪 Invalid ID test:', invalidIdError ? '❌ Failed (expected)' : '✅ Passed (unexpected)');
    
    // Test with negative order
    const negativeOrderTest = {
      items: [
        { id: testItems[0].id, order: -1 }
      ]
    };
    
    const { error: negativeOrderError } = reorderItemsUpdateSchema.validate(negativeOrderTest);
    console.log('🧪 Negative order test:', negativeOrderError ? '❌ Failed (expected)' : '✅ Passed (unexpected)');

    // Test with missing fields
    const missingFieldsTest = {
      items: [
        { id: testItems[0].id }
      ]
    };
    
    const { error: missingFieldsError } = reorderItemsUpdateSchema.validate(missingFieldsTest);
    console.log('🧪 Missing fields test:', missingFieldsError ? '❌ Failed (expected)' : '✅ Passed (unexpected)');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('📥 Error response:', error.response.data);
    }
  }
}

// Run the debug
debugPlaylistReorder()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });