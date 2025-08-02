const mongoose = require('mongoose');
const User = require('./models/User');

require('dotenv').config();

async function testUserModel() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    console.log('Finding test user...');
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user._id);
    console.log('Converting to JSON...');
    
    try {
      const userJSON = user.toJSON();
      console.log('toJSON successful');
      console.log('User data keys:', Object.keys(userJSON));
    } catch (err) {
      console.error('toJSON failed:', err);
    }

    try {
      const userObject = user.toObject();
      console.log('toObject successful');
      console.log('User object keys:', Object.keys(userObject));
    } catch (err) {
      console.error('toObject failed:', err);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testUserModel();