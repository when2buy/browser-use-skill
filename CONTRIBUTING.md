# Contributing to browser-use-skill

感谢你考虑为这个项目做贡献！🎉

## 开发流程

### 1. Fork & Clone

```bash
# Fork the repo on GitHub
git clone https://github.com/YOUR_USERNAME/browser-use-skill.git
cd browser-use-skill
npm install
```

### 2. 创建功能分支

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 3. 开发 & 测试

```bash
# 运行测试
npm test

# 列出profiles
npm run list-profiles

# 刷新profiles
npm run refresh
```

### 4. Commit规范

使用清晰的commit messages:

```
feat: 添加XXX功能
fix: 修复XXX bug
docs: 更新文档
refactor: 重构XXX模块
test: 添加测试
chore: 构建/工具配置
```

示例:
```bash
git commit -m "feat: add support for Firefox profiles"
git commit -m "fix: handle CAPTCHA timeout gracefully"
```

### 5. Push & Pull Request

```bash
git push origin feature/my-new-feature
```

然后在GitHub上创建Pull Request，描述：
- ✅ 做了什么改动
- ✅ 为什么需要这个改动
- ✅ 如何测试
- ✅ 相关Issue（如果有）

## 代码规范

### JavaScript风格

- 使用2空格缩进
- 使用ES6+ features
- 添加JSDoc注释
- 遵循现有代码风格

示例:
```javascript
/**
 * Execute browser task with auto-login
 * @param {string} userId - Telegram user ID
 * @param {string} platform - Platform name
 * @param {string} task - Natural language task
 * @param {object} options - Additional options
 * @returns {Promise<object>} Task result
 */
async function executeTask(userId, platform, task, options = {}) {
  // Implementation
}
```

### 文档

- README.md: 快速入门
- SKILL.md: 详细功能文档
- DEPLOYMENT.md: 部署指南
- docs/: 专题文档

更新文档时保持：
- ✅ 简洁清晰
- ✅ 有代码示例
- ✅ 英文/中文双语（可选）

## 测试

### 添加新功能时

1. 在`scripts/`下添加测试脚本
2. 更新`package.json`的scripts
3. 在PR中说明测试方法

### 测试checklist

- [ ] 核心功能测试通过
- [ ] Multi-user隔离验证
- [ ] Profile创建/删除正常
- [ ] 错误处理正确
- [ ] 文档已更新

## 报告Bug

在GitHub Issues中报告时，请包含：

1. **环境信息**:
   - OS版本
   - Node版本
   - OpenClaw版本
   - browser-use-skill版本

2. **重现步骤**:
   ```
   1. 执行 npm test
   2. 看到XXX错误
   3. 期望XXX但实际XXX
   ```

3. **日志/截图**:
   ```
   Error: ...
   ```

4. **可能的解决方案**（如果有想法）

## 功能建议

在GitHub Issues中提出时，请说明：

1. **Use Case**: 什么场景需要这个功能？
2. **当前限制**: 现有功能为什么不够用？
3. **期望行为**: 你希望怎么实现？
4. **替代方案**: 有没有workaround？

## 安全问题

如果发现安全漏洞，请**不要**公开issue，而是：

1. 发邮件到: security@when2buy.com（暂时）
2. 或在Telegram私聊: @when2buy_cto_bot

我们会尽快响应并修复。

## 协作沟通

- **GitHub Issues**: Bug报告、功能建议
- **Pull Requests**: 代码贡献
- **Telegram**: 实时讨论（链接TBD）
- **Discord**: 社区讨论（链接TBD）

## 开发环境建议

### 推荐工具

- **Editor**: VSCode + Prettier
- **Node版本**: v18+ (推荐v22)
- **Git**: v2.30+

### VSCode配置

`.vscode/settings.json`:
```json
{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "javascript.preferences.quoteStyle": "single"
}
```

### 本地调试

```javascript
// 启用debug模式
process.env.DEBUG = 'browser-use:*';

// 或在index.js中添加console.log
console.log('[DEBUG]', profileId, sessionId);
```

## 版本发布

由维护者执行：

```bash
# 更新版本
npm version patch  # 或 minor / major

# Push tags
git push --tags

# 发布到npm（如果需要）
npm publish
```

## License

提交代码即表示同意以MIT License开源。

---

感谢你的贡献！🚀

有任何问题欢迎在Issues或Telegram提问。
