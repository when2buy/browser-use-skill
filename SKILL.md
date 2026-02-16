# browser-use Skill

AI-powered browser automation with persistent login profiles.

## Features

- 🔐 **Persistent Login Profiles** - Login once, use everywhere
- 🤖 **Natural Language Tasks** - Just describe what you need
- 👤 **Multi-User Support** - Each user gets isolated profiles
- 🔒 **2FA Support** - Interactive verification code handling
- 🌍 **Global Proxy** - 195+ countries available
- 📸 **Screenshot Support** - Visual feedback for debugging

## Setup

### 1. Get browser-use API Key

```bash
# Sign up at https://cloud.browser-use.com
# Get your API key from dashboard
export BROWSER_USE_API_KEY="bu_..."
```

### 2. Install Dependencies

```bash
npm install browser-use-sdk
# or
yarn add browser-use-sdk
```

### 3. Configure in OpenClaw

Add to `openclaw.json`:

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

## Usage

### First-Time Login

```
@bot login to LinkedIn
```

The agent will:
1. Create a profile for you (if first time)
2. Guide you through login
3. Handle 2FA/verification codes
4. Save cookies automatically

### Subsequent Tasks

```
@bot check my LinkedIn notifications
@bot search for "AI jobs" on LinkedIn
@bot scrape top 10 posts from Hacker News
```

Auto-login! Your profile is already authenticated.

### Profile Management

```
@bot list my browser profiles
@bot delete my LinkedIn profile
@bot refresh my profiles
```

## How It Works

### Profile Lifecycle

```
User Request → Get/Create Profile → Create Session → Execute Task
                     ↓
            Save to profiles.json
                     ↓
         (cookies auto-saved to browser-use cloud)
```

### Data Storage

Profile mappings stored in:
```
workspace-cto/browser-use-data/
  ├── profiles.json     # user → profile_id mapping
  └── sessions.json     # active session tracking
```

### Multi-User Isolation

```json
{
  "7373369713": {
    "linkedin": "profile_abc123",
    "twitter": "profile_xyz789",
    "amazon": "profile_def456"
  },
  "1234567890": {
    "linkedin": "profile_ghi789"
  }
}
```

## API Reference

### Core Functions

#### `getOrCreateProfile(userId, platform)`

Get existing profile or create new one.

```javascript
const { profileId, isNew } = await getOrCreateProfile('7373369713', 'linkedin');
```

#### `executeTask(userId, platform, task, options)`

Execute browser task with auto-login.

```javascript
const result = await executeTask(
  '7373369713',
  'linkedin',
  'Check my notifications',
  { proxyLocation: 'SG' }
);
```

#### `handleInteractiveLogin(sessionId, credentials)`

Handle login flow with 2FA support.

```javascript
const result = await handleInteractiveLogin(sessionId, {
  email: 'user@example.com',
  password: '********'
});
```

## Advanced Usage

### Custom Proxy Location

```javascript
await executeTask(userId, platform, task, {
  proxyLocation: 'US',  // or 'SG', 'UK', 'DE', etc.
  screenWidth: 1920,
  screenHeight: 1080
});
```

### Handle CAPTCHA/2FA

The skill automatically detects verification steps and sends screenshots to the user for manual input.

### Profile Refresh (Weekly Maintenance)

```javascript
// Run via OpenClaw cron
await refreshStaleProfiles();  // Refreshes profiles >7 days old
```

## Troubleshooting

### "Profile not found"

```bash
# List all profiles
node scripts/list-profiles.js

# Recreate profile
node scripts/reset-profile.js <telegram_id> <platform>
```

### "Session timeout"

Increase timeout in task options:

```javascript
{ timeout: 120000 }  // 2 minutes
```

### "Login failed"

Check credentials in debug mode:

```javascript
{ debug: true }
```

## Cost Estimation

**browser-use Cloud Pricing**:
- Free: 2 profiles, limited tasks
- Developer: $29/mo - 5 profiles
- Business: $99/mo - Unlimited profiles

**Estimated Usage**:
- 10 users × 3 platforms = 30 profiles → Business plan
- ~100 tasks/day = ~$100-200/mo

**Self-Hosted Alternative**: See `docs/self-hosted.md` for DO deployment ($20/mo flat).

## Security

- ✅ Profiles isolated per user (telegram_id)
- ✅ Credentials never stored locally (only in browser-use cloud)
- ✅ Session tokens auto-expire after inactivity
- ✅ No cross-user data leakage

## Next Steps

1. Test basic flow: `node scripts/test-login.js`
2. Set up profile maintenance cron
3. Monitor usage via browser-use dashboard
4. Consider self-hosted for production scale

## Resources

- 📚 [browser-use Docs](https://docs.cloud.browser-use.com)
- 🔧 [API Reference](https://docs.cloud.browser-use.com/api-reference)
- 💬 [Discord Community](https://discord.gg/browser-use)
- 🐙 [GitHub](https://github.com/browser-use/browser-use)
