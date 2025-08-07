/**
 * Simple direct test of the DELETE endpoint
 */
require('dotenv').config();
const { connectDatabase } = require('./config/database');
const Playlist = require('./models/playlistModel');

async function testDelete() {
  try {
    console.log('🔧 Testing direct delete...');
    await connectDatabase();
    
    // Find a playlist with items
    const playlist = await Playlist.findOne({ 
      isActive: true,
      'items.0': { $exists: true }
    });
    
    if (!playlist) {
      console.log('❌ No playlist with items found');
      return;
    }
    
    console.log('✅ Found playlist:', {
      id: playlist._id.toString(),
      name: playlist.name,
      itemCount: playlist.items.length
    });
    
    const itemToDelete = playlist.items[0];
    console.log('🎯 Deleting item:', {
      itemId: itemToDelete._id.toString(),
      order: itemToDelete.order
    });
    
    // Test the model method directly
    const removedItem = playlist.removeMediaItem(itemToDelete._id.toString());
    console.log('✅ Model method returned:', {
      removedItemId: removedItem._id.toString(),
      remainingItems: playlist.items.length
    });
    
    // Save the playlist
    await playlist.save();
    console.log('✅ Playlist saved');
    
    // Verify the item was removed
    const updatedPlaylist = await Playlist.findById(playlist._id);
    const itemExists = updatedPlaylist.items.some(item => 
      item._id.toString() === itemToDelete._id.toString()
    );
    
    console.log('📊 Final result:', {
      itemStillExists: itemExists,
      finalItemCount: updatedPlaylist.items.length,
      originalItemCount: playlist.items.length + 1
    });
    
    if (!itemExists) {
      console.log('✅ DELETE TEST PASSED - Item was successfully removed');
    } else {
      console.log('❌ DELETE TEST FAILED - Item still exists');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDelete();