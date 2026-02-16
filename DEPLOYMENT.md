# browser-use Skill - Deployment Guide

完整的部署指南，从零到生产环境。

## 📋 目录结构

```
browser-use-skill/
├── README.md                    # 快速入门
├── SKILL.md                     # 详细文档
├── DEPLOYMENT.md                # 本文件
├── package.json                 # NPM配置
├── index.js                     # 核心实现
├── example-integration.js       # OpenClaw集成示例
├── docs/
│   └── self-hosted.md          # 自托管部署指南（DO）
└── scripts/
    ├── test-login.js           # 测试脚本
    ├── list-profiles.js        # 列出所有profiles
    └── refresh-profiles.js     # 刷新过期profiles
```

## 🚀 快速部署（3个选择）

### 选择1: browser-use Cloud（推荐MVP）

**适用**: 快速验证、1-10个用户、非敏感数据

**步骤**:

```bash
# 1. 注册并获取API key
open https://cloud.browser-use.com

# 2. 配置OpenClaw
# 编辑 ~/.openclaw/openclaw.json:
{
  "skills": {
    "entries": {
      "browser-use": {
        "apiKey": "bu_your_api_key_here"
      }
    }
  }
}

# 3. 安装依赖
cd browser-use-skill
npm install

# 4. 测试
npm test
```

**成本**: $0-99/月（根据用量）

**优点**: 
- ✅ 5分钟上线
- ✅ 零运维
- ✅ 内置stealth + CAPTCHA解决

**缺点**:
- ❌ 数据在第三方
- ❌ 成本随scale增长

---

### 选择2: Digital Ocean自托管（推荐生产）

**适用**: 10+用户、需要数据控制、成本敏感

**步骤**:

```bash
# 1. 创建DO droplet
~/bin/doctl compute droplet create browser-use-server \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region sgp1 \
  --ssh-keys <your-key-id>

# 2. SSH登录并部署
ssh root@<droplet-ip>

# 安装Docker
curl -fsSL https://get.docker.com | sh

# 部署browser-use
mkdir ~/browser-use-deploy && cd ~/browser-use-deploy
nano docker-compose.yml  # 见 docs/self-hosted.md
docker-compose up -d

# 3. 修改OpenClaw配置
# 更新 index.js 使用自托管endpoint（见下方）

# 4. 测试
curl http://<droplet-ip>:9222/json/version
```

**成本**: $24-48/月固定

**优点**:
- ✅ 无限profiles和tasks
- ✅ 完全数据控制
- ✅ 固定成本

**缺点**:
- ⚠️ 需要运维
- ⚠️ 需要自己实现stealth（可选）

详见: [docs/self-hosted.md](docs/self-hosted.md)

---

### 选择3: Steve的NAS + DO混合

**适用**: 追求性价比、有本地硬件

**架构**:
```
OpenClaw → 路由逻辑 → [NAS (主力) | DO Droplet (备份)]
```

**步骤**:

```bash
# 1. NAS上部署browser-use (与DO部署相同)
# 2. DO上部署备份实例
# 3. 修改index.js添加路由逻辑:

const ENDPOINTS = [
  { url: 'http://steve-nas:9222', priority: 1 },
  { url: 'http://do-droplet:9222', priority: 2 }
];

async function getAvailableEndpoint() {
  for (const endpoint of ENDPOINTS) {
    try {
      await axios.get(`${endpoint.url}/json/version`, { timeout: 2000 });
      return endpoint.url;
    } catch (err) {
      continue;
    }
  }
  throw new Error('No browser endpoints available');
}
```

**成本**: $0-24/月（仅DO备份）

**优点**:
- ✅ 本地性能最优
- ✅ 成本极低
- ✅ 高可用（自动切换）

**缺点**:
- ⚠️ NAS需要公网访问或VPN
- ⚠️ 复杂度较高

---

## 🔧 OpenClaw集成

### 方式1: 作为Skill调用

在你的agent代码中:

```javascript
const browserUse = require('/path/to/browser-use-skill/index');

async function handleUserMessage(context) {
  const { userId, message } = context;
  
  if (message.includes('check LinkedIn')) {
    const result = await browserUse.executeTask(
      userId,
      'linkedin',
      'Check my notifications'
    );
    
    return result.result;
  }
}
```

### 方式2: 使用提供的集成模板

```javascript
const { handleBrowserRequest } = require('/path/to/browser-use-skill/example-integration');

// 在agent消息处理中
if (needsBrowserAutomation(message)) {
  return await handleBrowserRequest({
    userId: telegramId,
    message: message,
    sendMessage: (text) => telegram.sendMessage(chatId, text),
    sendPhoto: (img, caption) => telegram.sendPhoto(chatId, img, caption)
  });
}
```

### 方式3: 添加为OpenClaw Native Skill

```bash
# 复制到OpenClaw skills目录
cp -r browser-use-skill /usr/local/lib/node_modules/openclaw/skills/

# OpenClaw会自动加载，可以通过@bot browser <task>调用
```

---

## 📊 Profile管理逻辑

### 数据流

```
用户请求 → getOrCreateProfile()
              ↓
    检查 profiles.json
              ↓
    存在? → 使用现有profile_id
              ↓
    不存在? → 调用 browser-use API创建
              ↓
         保存到 profiles.json
              ↓
    创建session → 执行task
              ↓
    cookies自动保存到browser-use cloud (或本地profile目录)
```

### profiles.json示例

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

**位置**: `~/.openclaw/workspace-cto/browser-use-data/profiles.json`

### Profile隔离保证

- ✅ 每个`telegram_id`独立存储
- ✅ 不同平台分开profile
- ✅ 零跨用户数据泄露
- ✅ Profile删除时同步清理

---

## 🔒 安全配置

### API Key管理

**方法1: 环境变量（推荐生产）**

```bash
# 添加到 ~/.bashrc 或 systemd service
export BROWSER_USE_API_KEY="bu_..."

# OpenClaw会自动读取
```

**方法2: OpenClaw配置**

```json
{
  "skills": {
    "entries": {
      "browser-use": {
        "apiKey": "bu_..."
      }
    }
  }
}
```

**方法3: 加密配置文件**

```bash
# 使用sops或ansible-vault加密openclaw.json
sops -e openclaw.json > openclaw.enc.json
```

### Profile数据保护

```bash
# 设置严格权限
chmod 600 ~/.openclaw/workspace-cto/browser-use-data/profiles.json

# 定期备份（加密）
tar -czf - profiles.json | openssl enc -aes-256-cbc -salt > profiles.backup.enc

# 恢复
openssl enc -d -aes-256-cbc -in profiles.backup.enc | tar -xzf -
```

### 自托管网络隔离

```bash
# 仅允许OpenClaw服务器访问
sudo ufw allow from <openclaw-ip> to any port 9222
sudo ufw deny 9222
```

---

## 📅 维护计划

### 每周: 刷新Profile

防止cookies过期（>7天未使用）

**OpenClaw Cron配置**:

```json
{
  "schedule": {
    "kind": "cron",
    "expr": "0 2 * * 0"
  },
  "payload": {
    "kind": "systemEvent",
    "text": "cd /path/to/browser-use-skill && npm run refresh"
  }
}
```

或手动:

```bash
cd browser-use-skill
npm run refresh
```

### 每月: 检查配额

**browser-use Cloud**:

```bash
# 登录dashboard查看
open https://cloud.browser-use.com/dashboard

# 检查:
# - Profile使用量
# - Task执行次数
# - 成本趋势
```

**自托管**:

```bash
# 检查磁盘空间
df -h
du -sh ~/.openclaw/workspace-cto/browser-use-data/

# 检查Docker资源
docker stats browser-use

# 清理旧profile（>30天未使用）
find /profiles -type d -mtime +30 -exec rm -rf {} \;
```

### 每季度: 安全审计

```bash
# 检查过期profiles
npm run list-profiles

# 检查日志异常
grep -i error ~/.openclaw/logs/assistant.log

# 更新依赖
npm audit
npm update
```

---

## 🐛 故障排查

### 问题1: "BROWSER_USE_API_KEY not configured"

**解决**:

```bash
# 检查配置
cat ~/.openclaw/openclaw.json | jq '.skills.entries."browser-use"'

# 或设置环境变量
export BROWSER_USE_API_KEY="bu_..."
```

### 问题2: "Profile not found"

**原因**: Profile在browser-use cloud被删除，但本地mapping仍存在

**解决**:

```bash
# 列出所有profiles
npm run list-profiles

# 手动编辑删除无效映射
nano ~/.openclaw/workspace-cto/browser-use-data/profiles.json

# 或让用户重新登录（会自动创建新profile）
```

### 问题3: "Task timeout"

**解决**:

```javascript
// 增加超时时间
await executeTask(userId, platform, task, {
  timeout: 120000  // 2分钟（默认60秒）
});
```

### 问题4: 登录失败（2FA）

**检查**:

```javascript
// 确保实现了2FA回调
await handleInteractiveLogin(
  sessionId,
  credentials,
  async (screenshot, step) => {
    // 必须实现：发送screenshot给用户并等待验证码
    const code = await getCodeFromUser();
    return code;
  }
);
```

---

## 📈 扩展方案

### 10人以下

```
browser-use Cloud ($29-99/mo)
→ OpenClaw agent
→ Telegram users
```

### 10-50人

```
DO Droplet ($24/mo)
→ Docker browser-use
→ OpenClaw agent
→ Telegram users
```

### 50-200人

```
DO Droplet 4vCPU/8GB ($48/mo)
+ Load Balancer ($12/mo)
→ [browser-use instances x2]
→ OpenClaw agent (hash-based routing)
→ Telegram users
```

### 200+人

```
K8s Cluster
→ browser-use Pod Pool (autoscaling)
→ Shared PVC (profiles)
→ Redis (session routing)
→ OpenClaw agents
→ Telegram users
```

---

## ✅ 部署检查清单

### Phase 1: 基础设置

- [ ] 选择部署方式（Cloud / DO / 混合）
- [ ] 获取API key或部署服务器
- [ ] 安装依赖 (`npm install`)
- [ ] 配置OpenClaw (`openclaw.json`或env)
- [ ] 运行测试 (`npm test`)

### Phase 2: OpenClaw集成

- [ ] 复制skill到项目目录
- [ ] 修改agent代码调用skill
- [ ] 测试首次登录流程（包括2FA）
- [ ] 测试后续自动登录
- [ ] 验证multi-user隔离

### Phase 3: 生产准备

- [ ] 设置profile备份（加密）
- [ ] 配置weekly refresh cron
- [ ] 设置监控告警
- [ ] 文档化紧急恢复流程
- [ ] 负载测试（模拟10并发用户）

### Phase 4: 运维

- [ ] 建立日志审查流程
- [ ] 监控成本趋势
- [ ] 定期安全审计
- [ ] 用户反馈收集

---

## 🆘 获取帮助

### 官方资源

- 📚 [browser-use Docs](https://docs.cloud.browser-use.com)
- 🐙 [GitHub Issues](https://github.com/browser-use/browser-use/issues)
- 💬 [Discord](https://discord.gg/browser-use)

### 内部文档

- [SKILL.md](SKILL.md) - 详细API文档
- [README.md](README.md) - 快速入门
- [docs/self-hosted.md](docs/self-hosted.md) - 自托管指南

### 调试模式

```javascript
// 启用详细日志
process.env.DEBUG = 'browser-use:*';

// 或在OpenClaw中
{
  "logging": {
    "level": "debug"
  }
}
```

---

**下一步**: 根据你们的需求，选择部署方式并开始测试！

有问题随时问我 🚀
