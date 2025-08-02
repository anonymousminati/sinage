const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const testUser = { email: 'test@example.com', password: 'password@123' };

async function testProfile() {
  try {
    console.log('Testing profile endpoint...');
    
    // Login first
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, testUser);
    const token = loginRes.data.data.tokens.accessToken;
    console.log('Login successful, token received');
    
    // Test profile endpoint
    console.log('2. Getting profile...');
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Profile success:', JSON.stringify(profileRes.data, null, 2));
  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
  }
}

testProfile();