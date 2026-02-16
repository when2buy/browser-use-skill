#!/usr/bin/env node

/**
 * Test profile management workflow
 */

const { BrowserUse } = require('browser-use-sdk');

async function test() {
  const client = new BrowserUse({ 
    apiKey: process.env.BROWSER_USE_API_KEY 
  });
  
  console.log('🧪 Testing Profile Management\n');
  
  try {
    // Test 1: Create a profile
    console.log('📋 Test 1: Create browser profile');
    const profile = await client.browserProfiles.create({
      name: 'Test_User_7373369713_LinkedIn'
    });
    
    console.log('✅ Profile created!');
    console.log('  - ID:', profile.id);
    console.log('  - Name:', profile.name);
    
    const profileId = profile.id;
    
    // Test 2: List profiles
    console.log('\n📋 Test 2: List all profiles');
    const profiles = await client.browserProfiles.list();
    
    console.log('✅ Found', profiles.length, 'profile(s)');
    profiles.forEach(p => {
      console.log(`  - ${p.id}: ${p.name || '(no name)'}`);
    });
    
    // Test 3: Retrieve profile
    console.log('\n📋 Test 3: Retrieve profile details');
    const retrieved = await client.browserProfiles.retrieve(profileId);
    
    console.log('✅ Profile retrieved:');
    console.log(JSON.stringify(retrieved, null, 2));
    
    // Test 4: Run task with profile
    console.log('\n📋 Test 4: Run task with profile');
    const task = await client.tasks.create({
      task: 'Go to linkedin.com and check if logged in',
      browserProfileId: profileId
    });
    
    console.log('✅ Task created with profile!');
    console.log('  - Task ID:', task.id);
    console.log('  - Using profile:', profileId);
    
    // Wait for task
    console.log('  - Waiting for completion...');
    await new Promise(r => setTimeout(r, 10000));
    
    const taskResult = await client.tasks.retrieve(task.id);
    console.log('  - Status:', taskResult.status);
    console.log('  - Output:', taskResult.output || 'Still running...');
    
    // Test 5: Delete profile
    console.log('\n📋 Test 5: Delete profile');
    await client.browserProfiles.delete(profileId);
    
    console.log('✅ Profile deleted!');
    
    console.log('\n🎉 All profile tests passed!');
    
  } catch (err) {
    console.log('\n❌ Error:', err.message);
    
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();
