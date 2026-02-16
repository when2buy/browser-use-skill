#!/usr/bin/env node

/**
 * Test using tasks.create instead of tasks.run
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
  
  console.log('\n🧪 Test: Create browser task');
  console.log('📋 Task: Go to google.com\n');
  
  try {
    // Create task
    const task = await client.tasks.create({
      task: 'Navigate to google.com and tell me the page title'
    });
    
    console.log('✅ Task created!');
    console.log('Task ID:', task.id);
    console.log('Status:', task.status);
    
    // Wait a bit for task to complete
    console.log('\n⏳ Waiting for task to complete...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Retrieve task result
    const result = await client.tasks.retrieve(task.id);
    
    console.log('\n📊 Final status:', result.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.log('\n❌ Error:', err.message);
    
    if (err.response) {
      console.log('Response status:', err.response.status);
      console.log('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();
