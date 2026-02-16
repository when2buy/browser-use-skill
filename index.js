/**
 * browser-use Skill for OpenClaw
 * AI-powered browser automation with persistent profiles
 */

const { BrowserUseClient } = require('browser-use-sdk');
const fs = require('fs').promises;
const path = require('path');

// Data storage paths
const DATA_DIR = path.join(process.env.HOME, '.openclaw/workspace-cto/browser-use-data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Initialize browser-use client
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.BROWSER_USE_API_KEY || 
                   (global.OPENCLAW_CONFIG?.skills?.entries?.['browser-use']?.apiKey);
    
    if (!apiKey) {
      throw new Error('BROWSER_USE_API_KEY not configured. Add to openclaw.json or env.');
    }
    
    client = new BrowserUseClient({ apiKey });
  }
  return client;
}

/**
 * Load profile mappings from disk
 * Structure: { "telegram_id": { "platform": "profile_id" } }
 */
async function loadProfiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(PROFILES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}

/**
 * Save profile mappings to disk
 */
async function saveProfiles(profiles) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

/**
 * Get or create profile for user+platform
 * @param {string} userId - Telegram user ID
 * @param {string} platform - Platform name (linkedin, twitter, etc.)
 * @returns {Promise<{profileId: string, isNew: boolean}>}
 */
async function getOrCreateProfile(userId, platform) {
  const client = getClient();
  const profiles = await loadProfiles();
  
  // Check if profile exists
  if (profiles[userId]?.[platform]) {
    return {
      profileId: profiles[userId][platform],
      isNew: false
    };
  }
  
  // Create new profile
  const profile = await client.profiles.createProfile({
    name: `User_${userId}_${platform}`
  });
  
  // Save mapping
  if (!profiles[userId]) {
    profiles[userId] = {};
  }
  profiles[userId][platform] = profile.id;
  await saveProfiles(profiles);
  
  return {
    profileId: profile.id,
    isNew: true
  };
}

/**
 * Execute browser task with auto-login
 * @param {string} userId - Telegram user ID
 * @param {string} platform - Platform name
 * @param {string} task - Natural language task description
 * @param {object} options - Additional options
 */
async function executeTask(userId, platform, task, options = {}) {
  const client = getClient();
  
  // Get or create profile
  const { profileId, isNew } = await getOrCreateProfile(userId, platform);
  
  // Create session with profile
  const session = await client.sessions.createSession({
    profileId,
    proxyLocation: options.proxyLocation || 'SG',
    screenWidth: options.screenWidth || 1920,
    screenHeight: options.screenHeight || 1080
  });
  
  try {
    // If new profile, need initial login
    if (isNew) {
      return {
        needsAuth: true,
        sessionId: session.id,
        profileId,
        message: `🔐 First time logging into ${platform}. Please provide:\n\n` +
                 `1. Email/Username\n2. Password\n\n` +
                 `(Your credentials are securely stored in browser-use cloud, not on our servers)`
      };
    }
    
    // Execute task
    const taskObj = await client.tasks.createTask({
      sessionId: session.id,
      llm: options.model || 'browser-use-llm',
      task,
      timeout: options.timeout || 60000
    });
    
    // Wait for completion
    const result = await taskObj.complete();
    
    // Stop session
    await client.sessions.stopSession(session.id);
    
    return {
      success: true,
      result: result.result,
      screenshots: result.screenshots || [],
      executionTime: result.executionTimeMs
    };
    
  } catch (err) {
    // Clean up session on error
    try {
      await client.sessions.stopSession(session.id);
    } catch (cleanupErr) {
      console.error('Session cleanup failed:', cleanupErr);
    }
    
    throw err;
  }
}

/**
 * Handle interactive login with 2FA support
 * @param {string} sessionId - Active session ID
 * @param {object} credentials - { email, password }
 * @param {function} onScreenshot - Callback for 2FA screenshots
 */
async function handleInteractiveLogin(sessionId, credentials, onScreenshot) {
  const client = getClient();
  
  // Create login task with credentials
  const loginTask = await client.tasks.createTask({
    sessionId,
    llm: 'browser-use-llm',
    task: 'Log into the website',
    inputFiles: [{
      name: 'credentials.json',
      content: JSON.stringify(credentials)
    }]
  });
  
  // Monitor task progress
  let status = await client.tasks.getTask(loginTask.id);
  
  while (status.status === 'running') {
    await sleep(2000);
    status = await client.tasks.getTask(loginTask.id);
    
    // Check if 2FA/verification needed
    const currentStep = status.currentStep?.toLowerCase() || '';
    if (currentStep.includes('verification') || 
        currentStep.includes('2fa') ||
        currentStep.includes('code')) {
      
      // Get screenshot
      const screenshot = await client.sessions.getScreenshot(sessionId);
      
      // Send to user via callback
      const verificationCode = await onScreenshot(screenshot, currentStep);
      
      // Submit code
      await client.tasks.createTask({
        sessionId,
        llm: 'browser-use-llm',
        task: `Enter verification code: ${verificationCode}`
      });
    }
  }
  
  if (status.status === 'completed') {
    return {
      success: true,
      message: '✅ Login successful! Profile saved.'
    };
  } else {
    throw new Error(`Login failed: ${status.error || 'Unknown error'}`);
  }
}

/**
 * List all profiles for a user
 * @param {string} userId - Telegram user ID
 */
async function listUserProfiles(userId) {
  const profiles = await loadProfiles();
  const userProfiles = profiles[userId] || {};
  
  const client = getClient();
  const details = [];
  
  for (const [platform, profileId] of Object.entries(userProfiles)) {
    try {
      const profile = await client.profiles.getProfile(profileId);
      details.push({
        platform,
        profileId,
        lastUsed: profile.lastUsedAt,
        cookieDomains: profile.cookieDomains
      });
    } catch (err) {
      details.push({
        platform,
        profileId,
        error: 'Profile not found (may have been deleted)'
      });
    }
  }
  
  return details;
}

/**
 * Delete profile for user+platform
 * @param {string} userId - Telegram user ID
 * @param {string} platform - Platform name
 */
async function deleteProfile(userId, platform) {
  const profiles = await loadProfiles();
  
  if (!profiles[userId]?.[platform]) {
    throw new Error(`No profile found for ${platform}`);
  }
  
  const profileId = profiles[userId][platform];
  const client = getClient();
  
  // Delete from browser-use cloud
  await client.profiles.deleteProfile(profileId);
  
  // Remove from local mapping
  delete profiles[userId][platform];
  if (Object.keys(profiles[userId]).length === 0) {
    delete profiles[userId];
  }
  await saveProfiles(profiles);
  
  return {
    success: true,
    message: `✅ Profile for ${platform} deleted`
  };
}

/**
 * Refresh stale profiles (>7 days old)
 */
async function refreshStaleProfiles() {
  const client = getClient();
  const profiles = await loadProfiles();
  const refreshed = [];
  
  for (const [userId, userProfiles] of Object.entries(profiles)) {
    for (const [platform, profileId] of Object.entries(userProfiles)) {
      try {
        const profile = await client.profiles.getProfile(profileId);
        const daysSinceUsed = (Date.now() - new Date(profile.lastUsedAt)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUsed > 7) {
          // Refresh by opening homepage
          const session = await client.sessions.createSession({ profileId });
          
          await client.tasks.createTask({
            sessionId: session.id,
            llm: 'browser-use-llm',
            task: 'Navigate to homepage to refresh session'
          });
          
          await client.sessions.stopSession(session.id);
          
          refreshed.push({ userId, platform, profileId });
        }
      } catch (err) {
        console.error(`Failed to refresh ${userId}/${platform}:`, err.message);
      }
    }
  }
  
  return refreshed;
}

/**
 * Utility: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions
module.exports = {
  getOrCreateProfile,
  executeTask,
  handleInteractiveLogin,
  listUserProfiles,
  deleteProfile,
  refreshStaleProfiles
};
