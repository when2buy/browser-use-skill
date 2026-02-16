#!/usr/bin/env node

/**
 * Interactive Gmail login - ask user for help when needed
 */

const https = require('https');
const fs = require('fs');

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
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (err) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getScreenshot(sessionId) {
  // Get CDP URL first
  const sessionRes = await makeRequest('GET', `/sessions/${sessionId}`);
  
  if (!sessionRes.data.cdpUrl) {
    return null;
  }
  
  // Note: Getting screenshot from CDP requires WebSocket connection
  // For now, we'll rely on task steps description
  return null;
}

async function interactiveGmailLogin(email, password, onUserHelp) {
  console.log('🔐 Interactive Gmail Login\n');
  console.log('Email:', email);
  console.log('Password:', '*'.repeat(password.length));
  
  // Step 1: Create/reuse profile
  console.log('\n📋 Step 1: Setting up profile');
  const profileRes = await makeRequest('POST', '/profiles', {
    name: `Gmail_${email}`
  });
  
  const profileId = profileRes.data.id;
  console.log('✅ Profile ID:', profileId);
  
  // Step 2: Start login task
  console.log('\n📋 Step 2: Starting login task');
  const taskRes = await makeRequest('POST', '/tasks', {
    task: `Go to gmail.com and log in step by step:

1. Navigate to gmail.com
2. Enter email: ${email}
3. Click Next
4. Enter password: ${password}
5. Click Next/Sign in

IMPORTANT INSTRUCTIONS:
- If you see a verification code prompt, STOP and describe exactly what you see
- If you see a security check, STOP and describe it
- If you see "Try another way", STOP and describe options
- If you see "This browser or app may not be secure", STOP and describe it
- Take your time and describe each step clearly

After each action, describe what happened.`,
    profileId: profileId
  });
  
  const taskId = taskRes.data.id;
  const sessionId = taskRes.data.sessionId;
  
  console.log('✅ Task ID:', taskId);
  console.log('Session ID:', sessionId);
  
  // Get live URL
  const sessionRes = await makeRequest('GET', `/sessions/${sessionId}`);
  if (sessionRes.data.liveUrl) {
    console.log('\n🔗 Live URL:', sessionRes.data.liveUrl);
    console.log('   (Open to watch in real-time)\n');
  }
  
  // Step 3: Monitor with user assistance
  console.log('📋 Step 3: Monitoring login (will ask for help if needed)\n');
  
  let lastStepCount = 0;
  
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    
    const status = await makeRequest('GET', `/tasks/${taskId}`);
    
    console.log(`[${i+1}] Status: ${status.data.status}`);
    
    // Check if task finished
    if (status.data.status === 'finished') {
      console.log('\n✅ Login completed!');
      console.log('\n📊 Result:');
      console.log('═'.repeat(60));
      console.log(status.data.output || 'No output');
      console.log('═'.repeat(60));
      
      return {
        success: true,
        profileId: profileId,
        output: status.data.output
      };
    }
    
    if (status.data.status === 'failed') {
      console.log('\n❌ Task failed');
      console.log('Error:', status.data.error);
      return { success: false, error: status.data.error };
    }
    
    // Check steps for blockers
    if (status.data.steps && status.data.steps.length > lastStepCount) {
      const newSteps = status.data.steps.slice(lastStepCount);
      lastStepCount = status.data.steps.length;
      
      for (const step of newSteps) {
        const desc = (step.description || '').toLowerCase();
        
        console.log(`   Step: ${step.description || 'N/A'}`);
        
        // Detect verification/security prompts
        if (desc.includes('verification') || 
            desc.includes('code') ||
            desc.includes('2fa') ||
            desc.includes('security') ||
            desc.includes('try another way') ||
            desc.includes('not secure') ||
            desc.includes('blocked')) {
          
          console.log('\n🚨 USER HELP NEEDED!');
          console.log('═'.repeat(60));
          console.log('Situation:', step.description);
          console.log('═'.repeat(60));
          
          // Call user help callback
          if (onUserHelp) {
            const userInput = await onUserHelp({
              type: 'verification_needed',
              description: step.description,
              liveUrl: sessionRes.data.liveUrl,
              taskId: taskId,
              sessionId: sessionId
            });
            
            if (userInput) {
              console.log('User provided:', userInput);
              // In real implementation, would send this back to task
            }
          }
        }
      }
    }
  }
  
  console.log('\n⏱️  Task still running after 5 minutes');
  return { success: false, error: 'Timeout' };
}

// Test execution
async function main() {
  const email = 'aitist.dev@gmail.com';
  const password = 'TikTok@2023';
  
  const result = await interactiveGmailLogin(
    email,
    password,
    async (helpRequest) => {
      // Callback when user help is needed
      console.log('\n💬 SENDING TO USER:');
      console.log('Type:', helpRequest.type);
      console.log('Description:', helpRequest.description);
      console.log('Live URL:', helpRequest.liveUrl);
      console.log('\n⏸️  Waiting for user input...');
      
      // In real implementation:
      // 1. Send Telegram message with screenshot
      // 2. Wait for user reply
      // 3. Return user's input
      
      // For now, just log
      return null;
    }
  );
  
  console.log('\n📊 Final Result:', result);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! Profile is now logged in.');
    console.log('Profile ID:', result.profileId);
    console.log('\nNext: Run another task with this profile to verify auto-login!');
  }
}

main();
