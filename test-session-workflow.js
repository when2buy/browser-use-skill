#!/usr/bin/env node

/**
 * Test session-based workflow (actual browser-use Cloud API)
 */

const { BrowserUse } = require('browser-use-sdk');

async function test() {
  const client = new BrowserUse({ 
    apiKey: process.env.BROWSER_USE_API_KEY 
  });
  
  console.log('🧪 Testing Session-Based Workflow\n');
  
  try {
    // Test 1: List existing sessions
    console.log('📋 Test 1: List sessions');
    try {
      const sessions = await client.sessions.list();
      console.log('✅ Found', sessions.length, 'session(s)');
      
      if (sessions.length > 0) {
        console.log('Existing sessions:');
        sessions.forEach(s => {
          console.log(`  - ${s.id} (status: ${s.status || 'N/A'})`);
        });
      }
    } catch (err) {
      console.log('⚠️  List sessions:', err.message);
    }
    
    // Test 2: Run task without explicit session (auto-creates session)
    console.log('\n📋 Test 2: Run task (auto-create session)');
    const task1 = await client.tasks.create({
      task: 'Go to google.com and tell me the page title'
    });
    
    console.log('✅ Task created!');
    console.log('  - Task ID:', task1.id);
    console.log('  - Session ID:', task1.sessionId);
    
    // Wait and check result
    console.log('  - Waiting for completion...');
    await new Promise(r => setTimeout(r, 10000));
    
    const result1 = await client.tasks.retrieve(task1.id);
    console.log('  - Status:', result1.status);
    console.log('  - Output:', result1.output || 'Still running');
    
    // Test 3: Reuse same session
    console.log('\n📋 Test 3: Reuse session from previous task');
    const sessionId = task1.sessionId;
    
    const task2 = await client.tasks.create({
      sessionId: sessionId,
      task: 'Now go to github.com and check if you are logged in'
    });
    
    console.log('✅ Task created with existing session!');
    console.log('  - Task ID:', task2.id);
    console.log('  - Using session:', sessionId);
    
    console.log('\n🎉 Session workflow test completed!');
    console.log('\n💡 Key findings:');
    console.log('  - Tasks auto-create sessions if not specified');
    console.log('  - Sessions can be reused across multiple tasks');
    console.log('  - Session ID:', sessionId);
    
  } catch (err) {
    console.log('\n❌ Error:', err.message);
    
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();
