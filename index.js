/**
 * browser-use Skill for OpenClaw
 * AI-powered browser automation with persistent profiles
 */

const { BrowserUse } = require('browser-use-sdk');
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
    
    client = new BrowserUse({ apiKey });
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
  const profile = await client.browserProfiles.create({
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
  
  try {
    // If new profile, need initial login
    if (isNew) {
      return {
        needsAuth: true,
        profileId,
        message: `🔐 First time logging into ${platform}. Please provide:\n\n` +
                 `1. Email/Username\n2. Password\n\n` +
                 `(Your credentials are securely stored in browser-use cloud, not on our servers)`
      };
    }
    
    // Execute task with profile (tasks.run handles session automatically)
    const result = await client.tasks.run({
      task,
      browserProfileId: profileId,
      // Optional parameters
      ...(options.model && { llm: options.model }),
      ...(options.timeout && { maxDurationSeconds: Math.floor(options.timeout / 1000) })
    });
    
    return {
      success: true,
      result: result.output,
      taskId: result.id,
      executionTime: result.durationMs
    };
    
  } catch (err) {
    throw err;
  }
}

/**
 * Handle interactive login with 2FA support
 * @param {string} profileId - Browser profile ID
 * @param {object} credentials - { email, password }
 * @param {string} loginUrl - URL to login page
 * @param {function} onScreenshot - Callback for 2FA screenshots (optional)
 */
async function handleInteractiveLogin(profileId, credentials, loginUrl, onScreenshot) {
  const client = getClient();
  
  // Create login task with credentials
  const task = await client.tasks.create({
    task: `Navigate to ${loginUrl} and log in with provided credentials`,
    browserProfileId: profileId,
    parameters: {
      email: credentials.email,
      password: credentials.password
    }
  });
  
  // If 2FA callback provided, monitor task with streaming
  if (onScreenshot) {
    const stream = client.tasks.stream({ taskId: task.id });
    
    for await (const msg of stream) {
      if (msg.status === 'running') {
        // Check if need verification
        const step = msg.step?.description?.toLowerCase() || '';
        if (step.includes('verification') || step.includes('2fa') || step.includes('code')) {
          // Note: Screenshot retrieval may need different API endpoint
          const verificationCode = await onScreenshot(null, step);
          
          // Update task with verification code
          await client.tasks.update(task.id, {
            parameters: { verificationCode }
          });
        }
      } else if (msg.status === 'finished') {
        return {
          success: true,
          message: '✅ Login successful! Profile saved.'
        };
      } else if (msg.status === 'failed') {
        throw new Error(`Login failed: ${msg.error || 'Unknown error'}`);
      }
    }
  } else {
    // Wait for task completion without streaming
    const result = await client.tasks.retrieve(task.id);
    
    if (result.status === 'finished') {
      return {
        success: true,
        message: '✅ Login successful! Profile saved.'
      };
    } else {
      throw new Error(`Login failed: ${result.error || 'Unknown error'}`);
    }
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
      const profile = await client.browserProfiles.retrieve(profileId);
      details.push({
        platform,
        profileId,
        name: profile.name,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
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
  await client.browserProfiles.delete(profileId);
  
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
        const profile = await client.browserProfiles.retrieve(profileId);
        const daysSinceUsed = (Date.now() - new Date(profile.updatedAt)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUsed > 7) {
          // Refresh by running a simple task
          await client.tasks.run({
            task: 'Navigate to google.com to refresh browser session',
            browserProfileId: profileId,
            maxDurationSeconds: 30
          });
          
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
