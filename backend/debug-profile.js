const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const testUser = { email: 'test@example.com', password: 'password@123' };

async function testBothProfileEndpoints() {
  try {
    // Login first
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, testUser);
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test GET profile endpoint
    console.log('\n2. Testing GET /auth/profile...');
    try {
      const getRes = await axios.get(`${BASE_URL}/auth/profile`, { headers });
      console.log('✅ GET Profile successful:', {
        name: getRes.data.data.user.name,
        email: getRes.data.data.user.email
      });
    } catch (error) {
      console.log('❌ GET Profile failed:', error.response?.data?.message);
    }
    
    // Test PUT profile endpoint  
    console.log('\n3. Testing PUT /auth/profile...');
    try {
      const putRes = await axios.put(`${BASE_URL}/auth/profile`, 
        { name: 'Debug Test User' }, 
        { headers }
      );
      console.log('✅ PUT Profile successful:', {
        name: putRes.data.data.user.name,
        email: putRes.data.data.user.email
      });
    } catch (error) {
      console.log('❌ PUT Profile failed:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBothProfileEndpoints();