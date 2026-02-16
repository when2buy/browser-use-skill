# browser-use Skill for OpenClaw

🤖 AI-powered browser automation with persistent login profiles.

## Quick Start

### 1. Install

```bash
cd browser-use-skill
npm install
```

### 2. Get API Key

Sign up at [cloud.browser-use.com](https://cloud.browser-use.com) and get your API key.

### 3. Configure OpenClaw

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "browser-use": {
        "apiKey": "bu_your_api_key_here"
      }
    }
  }
}
```

Or set environment variable:

```bash
export BROWSER_USE_API_KEY="bu_your_api_key_here"
```

### 4. Test

```bash
npm test
```

## Usage Examples

### From Telegram

```
User: @bot login to LinkedIn

Bot: 🔐 First time logging into linkedin. Please provide:
     1. Email/Username
     2. Password

User: email@example.com
      mypassword123

Bot: 📸 [Screenshot of 2FA page]
     Please enter the verification code:

User: 123456

Bot: ✅ Login successful! Profile saved.

---

User: @bot check my LinkedIn notifications

Bot: 🤖 Executing: check my LinkedIn notifications...
     ✅ Task completed!
     
     You have 3 new notifications:
     1. John Doe liked your post
     2. New connection request from Jane Smith
     3. Weekly job digest
     
     ⏱️ Execution time: 8.3s
```

### From Code

```javascript
const { executeTask } = require('./index');

async function example() {
  // Execute browser task
  const result = await executeTask(
    '7373369713',           // Telegram user ID
    'linkedin',             // Platform
    'Check notifications',  // Natural language task
    { proxyLocation: 'SG' } // Options
  );
  
  if (result.needsAuth) {
    console.log('Need to login first');
  } else {
    console.log('Result:', result.result);
  }
}
```

## Features

- ✅ **Multi-User Support**: Each user gets isolated profiles
- ✅ **Persistent Login**: Login once, use everywhere
- ✅ **2FA Support**: Interactive verification handling
- ✅ **Natural Language**: Just describe what you need
- ✅ **Global Proxy**: 195+ countries available
- ✅ **Screenshot Support**: Visual debugging

## API Reference

See [SKILL.md](SKILL.md) for detailed documentation.

### Core Functions

```javascript
// Get or create profile
const { profileId, isNew } = await getOrCreateProfile(userId, platform);

// Execute task
const result = await executeTask(userId, platform, task, options);

// List user profiles
const profiles = await listUserProfiles(userId);

// Delete profile
await deleteProfile(userId, platform);

// Refresh stale profiles (>7 days)
await refreshStaleProfiles();
```

## Scripts

```bash
# Test basic functionality
npm test

# List all profiles
npm run list-profiles

# Refresh stale profiles
npm run refresh
```

## Data Storage

Profiles are stored in:

```
~/.openclaw/workspace-cto/browser-use-data/
  ├── profiles.json     # User → Profile ID mapping
  └── sessions.json     # Active sessions (future use)
```

Example `profiles.json`:

```json
{
  "7373369713": {
    "linkedin": "profile_abc123",
    "twitter": "profile_xyz789"
  },
  "1234567890": {
    "linkedin": "profile_def456"
  }
}
```

## Cost Estimation

**browser-use Cloud Plans**:

| Plan      | Price   | Profiles  | Tasks    |
|-----------|---------|-----------|----------|
| Free      | $0      | 2         | Limited  |
| Developer | $29/mo  | 5         | ~1000/mo |
| Business  | $99/mo  | Unlimited | ~5000/mo |

**Recommendation**:
- **MVP (1-5 users)**: Developer plan ($29/mo)
- **Production (10+ users)**: Business plan ($99/mo) or self-hosted

## Self-Hosted Option

See [docs/self-hosted.md](docs/self-hosted.md) for deploying on Digital Ocean:

- **Cost**: $20-40/month flat
- **Unlimited profiles & tasks**
- **Full data control**

## Maintenance

### Weekly Profile Refresh (OpenClaw Cron)

Add to your agent's workspace:

```bash
# Add cron job to refresh profiles weekly
openclaw cron add --schedule "0 0 * * 0" --task "npm run refresh"
```

Or via OpenClaw API:

```javascript
// In your agent's HEARTBEAT.md or cron config
{
  "schedule": { "kind": "cron", "expr": "0 0 * * 0" },
  "payload": {
    "kind": "systemEvent",
    "text": "Refresh browser profiles"
  }
}
```

## Troubleshooting

### "BROWSER_USE_API_KEY not configured"

Set in `openclaw.json` or environment:

```bash
export BROWSER_USE_API_KEY="bu_..."
```

### "Profile not found"

The profile may have been deleted from browser-use cloud. Delete local mapping:

```bash
node scripts/list-profiles.js
# Manually edit profiles.json to remove stale entries
```

### "Task timeout"

Increase timeout in options:

```javascript
await executeTask(userId, platform, task, {
  timeout: 120000  // 2 minutes
});
```

## Security

- ✅ Profiles are isolated per user (Telegram ID)
- ✅ Credentials stored only in browser-use cloud (encrypted)
- ✅ No local credential storage
- ✅ Session tokens auto-expire
- ✅ Zero cross-user data leakage

## Resources

- 📚 [browser-use Docs](https://docs.cloud.browser-use.com)
- 🔧 [API Reference](https://docs.cloud.browser-use.com/api-reference)
- 🐙 [GitHub](https://github.com/browser-use/browser-use)

## Next Steps

1. ✅ Test basic flow: `npm test`
2. 🔌 Integrate into your OpenClaw agent (see `example-integration.js`)
3. 📅 Set up weekly profile refresh cron
4. 📊 Monitor usage via browser-use dashboard
5. 🚀 Consider self-hosted for production scale

## License

MIT

---

Built with ❤️ for When2Buy Team
