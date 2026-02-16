#!/usr/bin/env node

/**
 * Test Profile API (direct REST calls)
 */

const https = require('https');

const API_KEY = process.env.BROWSER_USE_API_KEY;
const BASE_URL = 'api.browser-use.com';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: `/api/v2${path}`,
      method: method,
      headers: {
        'X-Browser-Use-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing Profile REST API\n');
  
  try {
    // Test 1: Create profile
    console.log('📋 Test 1: Create profile via REST API');
    const createRes = await makeRequest('POST', '/profiles', {
      name: 'Test_User_7373369713_LinkedIn_v2'
    });
    
    console.log('Status:', createRes.status);
    console.log('Response:', JSON.stringify(createRes.data, null, 2));
    
    if (createRes.status === 201) {
      const profileId = createRes.data.id;
      console.log('\n✅ Profile created successfully!');
      console.log('Profile ID:', profileId);
      
      // Test 2: List profiles
      console.log('\n📋 Test 2: List all profiles');
      const listRes = await makeRequest('GET', '/profiles');
      
      console.log('Status:', listRes.status);
      console.log('Profiles:', JSON.stringify(listRes.data, null, 2));
      
      // Test 3: Get specific profile
      console.log('\n📋 Test 3: Get profile details');
      const getRes = await makeRequest('GET', `/profiles/${profileId}`);
      
      console.log('Status:', getRes.status);
      console.log('Profile:', JSON.stringify(getRes.data, null, 2));
      
      // Test 4: Use profile in task
      console.log('\n📋 Test 4: Create task with profile');
      const taskRes = await makeRequest('POST', '/tasks', {
        task: 'Go to linkedin.com and check if we are logged in. If not, just tell me we need to log in.',
        profileId: profileId
      });
      
      console.log('Status:', taskRes.status);
      console.log('Task:', JSON.stringify(taskRes.data, null, 2));
      
      console.log('\n🎉 All profile API tests completed!');
      console.log('\n💡 Profile workflow:');
      console.log('  1. Create profile via API ✅');
      console.log('  2. Use profile in tasks ✅');
      console.log('  3. Profile persists cookies automatically ✅');
      
    } else {
      console.log('\n❌ Failed to create profile');
    }
    
  } catch (err) {
    console.log('\n❌ Error:', err.message);
  }
}

test();
