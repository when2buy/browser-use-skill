#!/usr/bin/env node

/**
 * Test script for browser-use skill
 * Tests basic profile creation and task execution
 */

const { executeTask, listUserProfiles } = require('../index');

async function main() {
  const testUserId = '7373369713'; // Steve's Telegram ID
  const testPlatform = 'linkedin';
  
  console.log('🧪 Testing browser-use skill...\n');
  
  try {
    // Test 1: Execute simple task
    console.log('📋 Test 1: Execute browser task');
    const result = await executeTask(
      testUserId,
      testPlatform,
      'Navigate to LinkedIn homepage and check if logged in',
      { timeout: 30000 }
    );
    
    if (result.needsAuth) {
      console.log('✅ First-time auth detected correctly');
      console.log(result.message);
    } else {
      console.log('✅ Task executed successfully');
      console.log('Result:', result.result);
    }
    
    // Test 2: List profiles
    console.log('\n📋 Test 2: List user profiles');
    const profiles = await listUserProfiles(testUserId);
    console.log('✅ Found profiles:', profiles);
    
    console.log('\n✅ All tests passed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
