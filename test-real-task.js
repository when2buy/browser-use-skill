#!/usr/bin/env node

/**
 * Real browser task test
 */

const { BrowserUse } = require('browser-use-sdk');

async function test() {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ BROWSER_USE_API_KEY not set');
    process.exit(1);
  }
  
  console.log('🔑 Using API key:', apiKey.substring(0, 15) + '...');
  
  const client = new BrowserUse({ apiKey });
  
  console.log('\n🧪 Test 1: Execute simple browser task');
  console.log('📋 Task: Go to google.com and get the page title\n');
  
  try {
    const result = await client.tasks.run({
      task: 'Navigate to google.com and tell me what the page title is'
    });
    
    console.log('✅ Task completed!');
    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.log('\n❌ Task failed:', err.message);
    
    if (err.response) {
      console.log('Response status:', err.response.status);
      console.log('Response data:', JSON.stringify(err.response.data, null, 2));
    }
    
    if (err.error) {
      console.log('Error details:', JSON.stringify(err.error, null, 2));
    }
  }
}

test();
