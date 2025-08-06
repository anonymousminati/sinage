/**
 * Comprehensive test to create a playlist with items and test the reorder endpoint
 */
require('dotenv').config();

const axios = require('axios');
const { connectDatabase } = require('./config/database');
const mongoose = require('mongoose');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function comprehensiveTest() {
  try {
    console.log('🔧 Starting Comprehensive Playlist Reorder Test...');
    
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
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');

    // Step 3: Check for existing media or create minimal test media
    console.log('\n📋 Step 3: Getting or creating test media items...');
    
    let mediaItems = [];
    
    try {
      // First, try to get existing media from the database owned by the test user
      const Media = require('./models/mediaModel');
      let existingMedia = await Media.find({ owner: loginResponse.data.data.user._id, isActive: true }).limit(3);
      
      // If no media owned by test user, try to find any media and change ownership for testing
      if (existingMedia.length === 0) {
        console.log('⚠️ No media owned by test user, looking for any existing media...');
        const anyMedia = await Media.find({ isActive: true }).limit(3);
        if (anyMedia.length > 0) {
          console.log(`Found ${anyMedia.length} existing media items, changing ownership for testing...`);
          for (const media of anyMedia) {
            media.owner = loginResponse.data.data.user._id;
            await media.save();
          }
          existingMedia = anyMedia;
        }
      }
      
      if (existingMedia.length >= 2) {
        mediaItems = existingMedia;
        console.log(`✅ Found ${existingMedia.length} existing media items`);
        existingMedia.forEach((media, index) => {
          console.log(`  ${index + 1}. ${media.originalName} (ID: ${media._id})`);
        });
      } else {
        console.log('⚠️ Not enough existing media, creating test media items...');
        
        // Create minimal media items with all required fields
        for (let i = 0; i < 3; i++) {
          try {
            const mediaData = {
              originalName: `test-media-${i + 1}.jpg`,
              filename: `test_media_${i + 1}_${Date.now()}.jpg`,
              cloudinaryId: `test_media_${i + 1}_${Date.now()}`,
              url: `https://res.cloudinary.com/demo/image/upload/test_media_${i + 1}_${Date.now()}.jpg`,
              secureUrl: `https://res.cloudinary.com/demo/image/upload/test_media_${i + 1}_${Date.now()}.jpg`,
              publicId: `test_media_${i + 1}_${Date.now()}`,
              type: 'image',
              format: 'jpg',
              fileSize: 1024000,
              width: 1920,
              height: 1080,
              duration: 5,
              description: `Test media item ${i + 1}`,
              owner: loginResponse.data.data.user._id,
              isActive: true,
              uploadedAt: new Date(),
              lastModified: new Date()
            };

            const media = new Media(mediaData);
            await media.save();
            mediaItems.push(media);
            console.log(`✅ Created media item ${i + 1}: ${media.originalName}`);
          } catch (mediaError) {
            console.log(`❌ Failed to create media item ${i + 1}:`, mediaError.message);
          }
        }
      }
    } catch (mediaError) {
      console.log('❌ Error handling media:', mediaError.message);
    }

    if (mediaItems.length < 2) {
      console.log('❌ Not enough media items created for testing');
      return;
    }

    // Step 4: Create a test playlist
    console.log('\n📋 Step 4: Creating test playlist...');
    
    const createPlaylistResponse = await axios.post(`${BASE_URL}/api/playlists`, {
      name: 'Test Playlist for Reorder Debug',
      description: 'Test playlist created for debugging reorder functionality'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const playlist = createPlaylistResponse.data.data;
    console.log(`✅ Created playlist: ${playlist.name} (ID: ${playlist._id})`);

    // Step 5: Add media items to the playlist
    console.log('\n📋 Step 5: Adding media items to playlist...');
    
    const addedItems = [];
    for (let i = 0; i < mediaItems.length; i++) {
      try {
        const addResponse = await axios.post(`${BASE_URL}/api/playlists/${playlist._id}/items`, {
          mediaId: mediaItems[i]._id,
          order: i,
          duration: 5
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`✅ Added media item ${i + 1} to playlist`);
        
        // Get the item details from response
        if (addResponse.data.data.item) {
          addedItems.push(addResponse.data.data.item);
        }
      } catch (addError) {
        console.log(`❌ Failed to add media item ${i + 1}:`, addError.response?.data);
      }
    }

    if (addedItems.length < 2) {
      console.log('❌ Not enough items added to playlist for testing');
      return;
    }

    // Step 6: Get the updated playlist to see the actual item structure
    console.log('\n📋 Step 6: Getting updated playlist...');
    
    const updatedPlaylistResponse = await axios.get(`${BASE_URL}/api/playlists/${playlist._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const updatedPlaylist = updatedPlaylistResponse.data.data;
    console.log(`✅ Playlist has ${updatedPlaylist.items.length} items`);
    
    // Log the actual item structure
    console.log('📄 Playlist items structure:');
    updatedPlaylist.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`);
      console.log(`    - ID: ${item._id}`);
      console.log(`    - MediaID: ${item.mediaId}`);
      console.log(`    - Order: ${item.order}`);
      console.log(`    - Duration: ${item.duration}`);
    });

    // Step 7: Test the reorder endpoint with the actual items
    console.log('\n🔄 Step 7: Testing playlist reorder endpoint...');
    
    // Create reorder data using the actual item IDs from the playlist
    const reorderData = {
      items: [
        {
          id: updatedPlaylist.items[1]._id,  // Second item
          order: 0  // Move to first position
        },
        {
          id: updatedPlaylist.items[0]._id,  // First item
          order: 1  // Move to second position
        }
      ]
    };

    console.log('📤 Reorder request data:', JSON.stringify(reorderData, null, 2));
    console.log('📍 Request URL:', `${BASE_URL}/api/playlists/${playlist._id}/reorder`);

    try {
      const reorderResponse = await axios.put(
        `${BASE_URL}/api/playlists/${playlist._id}/reorder`,
        reorderData,
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
        console.log('📥 Error status:', reorderError.response.status);
        console.log('📥 Error data:', JSON.stringify(reorderError.response.data, null, 2));
        
        if (reorderError.response.status === 400 && reorderError.response.data.errors) {
          console.log('\n🔍 DETAILED VALIDATION ERRORS:');
          reorderError.response.data.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
          
          console.log('\n🧪 Let\'s test the Joi validation with this exact data:');
          const Joi = require('joi');
          
          const reorderItemsUpdateSchema = Joi.object({
            items: Joi.array().items(Joi.object({
              id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
              order: Joi.number().min(0).required()
            })).min(1).required()
          });
          
          const { error: joiError, value: joiValue } = reorderItemsUpdateSchema.validate(reorderData);
          
          if (joiError) {
            console.log('❌ Joi validation also failed:');
            joiError.details.forEach(detail => {
              console.log(`  - ${detail.path.join('.')}: ${detail.message}`);
              console.log(`    Value: ${JSON.stringify(detail.context?.value)}`);
            });
          } else {
            console.log('✅ Joi validation passed - the issue is elsewhere!');
          }
        }
      } else {
        console.log('❌ No response received:', reorderError.message);
      }
    }

    // Clean up: delete the test playlist
    console.log('\n🧹 Cleaning up...');
    try {
      await axios.delete(`${BASE_URL}/api/playlists/${playlist._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test playlist deleted');
    } catch (cleanupError) {
      console.log('⚠️ Failed to delete test playlist:', cleanupError.response?.data?.message);
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
comprehensiveTest()
  .then(() => {
    console.log('\n✅ Comprehensive test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Comprehensive test failed:', error);
    process.exit(1);
  });