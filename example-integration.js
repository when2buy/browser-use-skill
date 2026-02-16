/**
 * Example: How to integrate browser-use skill into OpenClaw agent
 * 
 * This shows how your agent can handle browser automation requests
 * from users in Telegram.
 */

const browserUse = require('./index');

/**
 * Example agent handler for browser automation commands
 */
async function handleBrowserRequest(context) {
  const { userId, message, sendMessage, sendPhoto } = context;
  
  // Parse user intent
  const intent = parseIntent(message);
  
  switch (intent.action) {
    case 'login':
      return await handleLogin(userId, intent.platform, sendMessage, sendPhoto);
      
    case 'task':
      return await handleTask(userId, intent.platform, intent.task, sendMessage);
      
    case 'list_profiles':
      return await handleListProfiles(userId, sendMessage);
      
    case 'delete_profile':
      return await handleDeleteProfile(userId, intent.platform, sendMessage);
      
    default:
      return await sendMessage('🤔 I can help with browser automation. Try:\n\n' +
        '• "login to LinkedIn"\n' +
        '• "check my LinkedIn notifications"\n' +
        '• "list my browser profiles"\n' +
        '• "delete my Twitter profile"');
  }
}

/**
 * Handle login flow
 */
async function handleLogin(userId, platform, sendMessage, sendPhoto) {
  // Step 1: Check if profile exists
  const result = await browserUse.executeTask(userId, platform, 'Navigate to homepage');
  
  if (result.needsAuth) {
    // First time login
    await sendMessage(result.message);
    
    // Wait for credentials (implement your own credential collection)
    const credentials = await waitForCredentials(userId);
    
    // Handle interactive login with 2FA callback
    const loginResult = await browserUse.handleInteractiveLogin(
      result.profileId,
      credentials,
      `https://${platform}.com/login`, // Login URL
      async (screenshot, step) => {
        // Send notification to user (screenshot may not be available)
        await sendMessage(`🔐 ${step}\n\nPlease reply with the verification code:`);
        
        // Wait for user to reply with code
        return await waitForVerificationCode(userId);
      }
    );
    
    return await sendMessage(loginResult.message);
    
  } else {
    return await sendMessage(`✅ Already logged into ${platform}!`);
  }
}

/**
 * Handle browser task execution
 */
async function handleTask(userId, platform, task, sendMessage) {
  await sendMessage(`🤖 Executing: ${task}...`);
  
  try {
    const result = await browserUse.executeTask(userId, platform, task);
    
    if (result.needsAuth) {
      return await sendMessage(
        `🔐 You need to login to ${platform} first.\n\n` +
        `Use: "login to ${platform}"`
      );
    }
    
    // Send result
    let response = `✅ Task completed!\n\n${result.result}`;
    
    // Include screenshots if available
    if (result.screenshots && result.screenshots.length > 0) {
      response += `\n\n📸 ${result.screenshots.length} screenshot(s) captured`;
    }
    
    response += `\n\n⏱️ Execution time: ${(result.executionTime / 1000).toFixed(1)}s`;
    
    return await sendMessage(response);
    
  } catch (err) {
    return await sendMessage(`❌ Task failed: ${err.message}`);
  }
}

/**
 * Handle list profiles
 */
async function handleListProfiles(userId, sendMessage) {
  const profiles = await browserUse.listUserProfiles(userId);
  
  if (profiles.length === 0) {
    return await sendMessage('📭 You don\'t have any browser profiles yet.\n\n' +
      'Create one by logging into a site: "login to LinkedIn"');
  }
  
  let message = '📋 Your Browser Profiles:\n\n';
  
  for (const profile of profiles) {
    if (profile.error) {
      message += `❌ ${profile.platform}: ${profile.error}\n`;
    } else {
      const lastUsed = new Date(profile.lastUsedAt).toLocaleDateString();
      const domains = profile.cookieDomains.join(', ') || 'none';
      message += `✅ ${profile.platform}\n`;
      message += `   Last used: ${lastUsed}\n`;
      message += `   Cookies: ${domains}\n\n`;
    }
  }
  
  return await sendMessage(message);
}

/**
 * Handle delete profile
 */
async function handleDeleteProfile(userId, platform, sendMessage) {
  try {
    const result = await browserUse.deleteProfile(userId, platform);
    return await sendMessage(result.message);
  } catch (err) {
    return await sendMessage(`❌ ${err.message}`);
  }
}

/**
 * Simple intent parser (replace with better NLP)
 */
function parseIntent(message) {
  const lower = message.toLowerCase();
  
  // Login patterns
  if (lower.match(/login|log in|sign in/)) {
    const platform = extractPlatform(message);
    return { action: 'login', platform };
  }
  
  // List profiles
  if (lower.match(/list.*profile|show.*profile|my profile/)) {
    return { action: 'list_profiles' };
  }
  
  // Delete profile
  if (lower.match(/delete.*profile|remove.*profile/)) {
    const platform = extractPlatform(message);
    return { action: 'delete_profile', platform };
  }
  
  // Default: treat as task
  const platform = extractPlatform(message) || 'linkedin';
  return { action: 'task', platform, task: message };
}

/**
 * Extract platform from message
 */
function extractPlatform(message) {
  const platforms = ['linkedin', 'twitter', 'facebook', 'amazon', 'github'];
  const lower = message.toLowerCase();
  
  for (const platform of platforms) {
    if (lower.includes(platform)) {
      return platform;
    }
  }
  
  return 'linkedin'; // default
}

/**
 * Wait for user credentials (implement based on your session management)
 */
async function waitForCredentials(userId) {
  // TODO: Implement conversation state management
  // Return { email, password } from user input
  throw new Error('Not implemented: waitForCredentials');
}

/**
 * Wait for verification code (implement based on your session management)
 */
async function waitForVerificationCode(userId) {
  // TODO: Implement conversation state management
  // Return verification code string
  throw new Error('Not implemented: waitForVerificationCode');
}

// Export handler
module.exports = {
  handleBrowserRequest
};
