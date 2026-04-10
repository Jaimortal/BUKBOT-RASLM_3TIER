// Test script to verify the API endpoint
import fetch from 'node-fetch';

async function testAPI() {
  try {
    // First, login to get a valid token
    console.log('Testing login...');
    const loginResponse = await fetch('http://127.0.0.1:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginData.success && loginData.token) {
      // Now test the responses endpoint
      console.log('\nTesting /api/admin/responses...');
      const responsesResponse = await fetch('http://127.0.0.1:5000/api/admin/responses', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responsesData = await responsesResponse.json();
      console.log('Responses response:', responsesData);
      
      if (responsesData.success && responsesData.data) {
        console.log(`\nFound ${responsesData.data.length} responses`);
        console.log('First response:', responsesData.data[0]);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
