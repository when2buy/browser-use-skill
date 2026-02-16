#!/usr/bin/env node

/**
 * Test script to verify browser-use-sdk API usage
 */

const { BrowserUse } = require('browser-use-sdk');

// Use a dummy API key for testing structure (won't make real API calls)
const client = new BrowserUse({ 
  apiKey: process.env.BROWSER_USE_API_KEY || 'bu_test_key_for_structure_only' 
});

console.log('🧪 Testing browser-use-sdk API structure\n');

// Test 1: Check available resources
console.log('✅ Available resources:');
console.log('  - tasks:', typeof client.tasks);
console.log('  - browserProfiles:', typeof client.browserProfiles);
console.log('  - agentProfiles:', typeof client.agentProfiles);
console.log('  - sessions:', typeof client.sessions);
console.log('  - users:', typeof client.users);

// Test 2: Check browserProfiles methods
console.log('\n✅ browserProfiles methods:');
const profileMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.browserProfiles))
  .filter(m => !m.startsWith('_') && m !== 'constructor');
console.log('  ', profileMethods.join(', '));

// Test 3: Check tasks methods
console.log('\n✅ tasks methods:');
const taskMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.tasks))
  .filter(m => !m.startsWith('_') && m !== 'constructor');
console.log('  ', taskMethods.join(', '));

// Test 4: Check sessions methods
console.log('\n✅ sessions methods:');
const sessionMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.sessions))
  .filter(m => !m.startsWith('_') && m !== 'constructor');
console.log('  ', sessionMethods.join(', '));

// Test 5: Simulate profile creation (will fail without valid API key, but shows API structure)
console.log('\n🔧 Testing API call structure (will fail without valid API key):');
async function testProfileCreation() {
  try {
    const profile = await client.browserProfiles.create({
      // name: 'Test Profile' // Optional
    });
    console.log('  ✅ Profile created:', profile.id);
  } catch (err) {
    console.log('  ⚠️  Expected error (no valid API key):', err.message.split('\n')[0]);
  }
}

async function testTaskRun() {
  try {
    const result = await client.tasks.run({
      task: 'Navigate to google.com'
    });
    console.log('  ✅ Task completed:', result);
  } catch (err) {
    console.log('  ⚠️  Expected error (no valid API key):', err.message.split('\n')[0]);
  }
}

// Run tests
(async () => {
  await testProfileCreation();
  await testTaskRun();
  
  console.log('\n✅ SDK structure test completed!');
  console.log('\n💡 To test with real API:');
  console.log('   export BROWSER_USE_API_KEY="bu_..."');
  console.log('   node test-sdk-api.js');
})();
