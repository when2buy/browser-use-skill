#!/usr/bin/env node

/**
 * List all browser profiles
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(process.env.HOME, '.openclaw/workspace-cto/browser-use-data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

async function main() {
  try {
    const data = await fs.readFile(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(data);
    
    console.log('📋 Browser Profiles:\n');
    
    for (const [userId, userProfiles] of Object.entries(profiles)) {
      console.log(`👤 User: ${userId}`);
      for (const [platform, profileId] of Object.entries(userProfiles)) {
        console.log(`   └─ ${platform}: ${profileId}`);
      }
      console.log('');
    }
    
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('📭 No profiles found yet.');
    } else {
      console.error('❌ Error:', err.message);
    }
  }
}

main();
