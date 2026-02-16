#!/usr/bin/env node

/**
 * Refresh stale browser profiles (>7 days old)
 * Run this weekly via OpenClaw cron
 */

const { refreshStaleProfiles } = require('../index');

async function main() {
  console.log('🔄 Refreshing stale browser profiles...\n');
  
  try {
    const refreshed = await refreshStaleProfiles();
    
    if (refreshed.length === 0) {
      console.log('✅ All profiles are fresh!');
    } else {
      console.log(`✅ Refreshed ${refreshed.length} profiles:\n`);
      for (const { userId, platform, profileId } of refreshed) {
        console.log(`   ✓ ${userId}/${platform} (${profileId})`);
      }
    }
    
  } catch (err) {
    console.error('❌ Refresh failed:', err.message);
    process.exit(1);
  }
}

main();
