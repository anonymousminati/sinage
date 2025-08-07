/**
 * Test script to verify DELETE /api/playlists/:id/items/:itemId endpoint
 */
require('dotenv').config();

const axios = require('axios');
const mongoose = require('mongoose');
const { connectDatabase } = require('./config/database');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function testDeleteEndpoint() {
  try {
    console.log('🔧 Testing DELETE endpoint...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Get any existing user (for testing purposes)
    const User = require('./models/User');
    const testUser = await User.findOne({ isActive: true });
    
    if (!testUser) {
      console.log('❌ No active user found for testing');
      return;
    }
    
    // Create a temporary login token for testing
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('✅ Test token created for user:', testUser.email);

    // Find a playlist with items
    const Playlist = require('./models/playlistModel');
    const playlist = await Playlist.findOne({ 
      owner: testUser._id, 
      isActive: true,
      'items.0': { $exists: true } // Has at least one item
    });
    
    if (!playlist) {
      console.log('❌ No playlist with items found for user');
      return;
    }
    
    console.log('✅ Found test playlist:', {
      id: playlist._id,
      name: playlist.name,
      itemCount: playlist.items.length
    });
    
    if (playlist.items.length === 0) {
      console.log('❌ Playlist has no items to delete');
      return;
    }
    
    const itemToDelete = playlist.items[0];
    console.log('🎯 Testing deletion of item:', {
      itemId: itemToDelete._id,
      mediaId: itemToDelete.mediaId,
      order: itemToDelete.order
    });
    
    // Test the DELETE endpoint
    const deleteUrl = `${BASE_URL}/api/playlists/${playlist._id}/items/${itemToDelete._id}`;
    console.log('📍 DELETE URL:', deleteUrl);
    
    try {
      const response = await axios.delete(deleteUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ DELETE request successful!');
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', JSON.stringify(response.data, null, 2));
      
      // Verify the item was actually removed from database
      const updatedPlaylist = await Playlist.findById(playlist._id);
      const itemStillExists = updatedPlaylist.items.some(item => 
        item._id.toString() === itemToDelete._id.toString()
      );
      
      if (itemStillExists) {
        console.log('❌ Item still exists in database after delete!');
      } else {
        console.log('✅ Item successfully removed from database');
        console.log('📊 Updated item count:', updatedPlaylist.items.length);
      }
      
    } catch (deleteError) {
      console.log('❌ DELETE request failed!');
      console.log('📥 Error status:', deleteError.response?.status);
      console.log('📥 Error data:', JSON.stringify(deleteError.response?.data, null, 2));
      console.log('📥 Error message:', deleteError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📥 Stack trace:', error.stack);
  } finally {
    // Clean up: close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the test
testDeleteEndpoint()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });