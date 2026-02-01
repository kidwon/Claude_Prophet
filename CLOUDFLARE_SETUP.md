# Cloudflare Secrets Store 部署指南

本指南说明如何将 Prophet Trader 的 API keys 迁移到 Cloudflare Workers Secrets Store。

## 前提条件

- Cloudflare 账号（免费版即可）
- Node.js 和 npm 已安装
- Prophet Trader 项目已经可以正常运行

## 第一步：安装 Wrangler CLI

Wrangler 是 Cloudflare Workers 的官方命令行工具。

```bash
npm install -g wrangler
```

验证安装：
```bash
wrangler --version
```

## 第二步：登录 Cloudflare

```bash
wrangler login
```

这将打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

## 第三步：部署 Worker

进入 worker 目录并部署：

```bash
cd worker
wrangler deploy
```

部署成功后，你会看到 Worker 的 URL，类似于：
```
https://prophet-config-service.YOUR_SUBDOMAIN.workers.dev
```

**记下这个 URL，后面会用到。**

## 第四步：设置 Secrets

使用 Wrangler 设置所有敏感配置：

```bash
# 设置访问令牌（自己生成一个强随机字符串）
wrangler secret put CONFIG_ACCESS_TOKEN
# 输入一个安全的随机字符串，例如：openssl rand -base64 32

# 设置 Alpaca API keys
wrangler secret put ALPACA_API_KEY
# 粘贴你的 Alpaca API key

wrangler secret put ALPACA_SECRET_KEY
# 粘贴你的 Alpaca Secret key

# 设置 Gemini API key（可选）
wrangler secret put GEMINI_API_KEY
# 粘贴你的 Gemini API key

# 设置其他配置（可选）
wrangler secret put ALPACA_BASE_URL
# 例如：https://paper-api.alpaca.markets

wrangler secret put ALPACA_PAPER
# 例如：true
```

## 第五步：生成访问令牌

生成一个强随机令牌用于 Go 后端访问 Worker：

```bash
openssl rand -base64 32
```

复制输出的字符串，你需要在两个地方使用它：
1. Cloudflare Worker 的 `CONFIG_ACCESS_TOKEN` secret（上一步已设置）
2. 本地 `.env` 文件的 `CONFIG_ACCESS_TOKEN` 变量

## 第六步：配置 Go 后端

编辑项目根目录下的 `.env` 文件，添加以下配置：

```bash
# Cloudflare Configuration Service
CONFIG_SERVICE_URL=https://prophet-config-service.YOUR_SUBDOMAIN.workers.dev
CONFIG_ACCESS_TOKEN=你在第五步生成的令牌
```

将 `YOUR_SUBDOMAIN` 替换为你的实际 Worker URL。

## 第七步：测试配置

### 测试 Worker

使用 curl 测试 Worker 是否正常工作：

```bash
curl -X POST \
  -H "Authorization: Bearer 你的CONFIG_ACCESS_TOKEN" \
  https://prophet-config-service.YOUR_SUBDOMAIN.workers.dev
```

应该返回类似以下的 JSON：
```json
{
  "ALPACA_API_KEY": "PK...",
  "ALPACA_SECRET_KEY": "...",
  "GEMINI_API_KEY": "...",
  ...
}
```

### 测试 Go 后端

重新启动 Go 后端：

```bash
# 重新编译
go build -o prophet_bot ./cmd/bot

# 运行
./prophet_bot
```

如果成功从 Cloudflare 加载配置，你会看到日志：
```
Successfully loaded configuration from Cloudflare Worker
```

如果 Cloudflare 不可用，会自动 fallback 到本地 `.env`：
```
Warning: Failed to load from Cloudflare (...), falling back to local .env
```

## 第八步：安全清理（可选）

一旦确认从 Cloudflare 加载成功，你可以从本地 `.env` 文件中删除敏感的 API keys：

```bash
# 保留这两个配置
CONFIG_SERVICE_URL=https://prophet-config-service.YOUR_SUBDOMAIN.workers.dev
CONFIG_ACCESS_TOKEN=你的令牌

# 可以删除以下配置（它们现在从 Cloudflare 加载）
# ALPACA_API_KEY=...
# ALPACA_SECRET_KEY=...
# GEMINI_API_KEY=...
```

## 故障排查

### Worker 返回 401 Unauthorized

- 检查 `CONFIG_ACCESS_TOKEN` 是否在 Cloudflare 和本地 `.env` 中设置一致
- 确保请求头格式正确：`Authorization: Bearer <token>`

### Go 后端无法启动

- 检查 `CONFIG_SERVICE_URL` 是否正确
- 尝试删除 `CONFIG_SERVICE_URL`，系统会 fallback 到本地 `.env`
- 查看错误日志了解具体问题

### Worker 部署失败

- 确保 `wrangler.toml` 文件存在且格式正确
- 运行 `wrangler whoami` 确认已登录
- 检查 Cloudflare 账号是否有权限创建 Workers

## 开发环境 vs 生产环境

### 开发环境（本地）

可以不设置 `CONFIG_SERVICE_URL`，系统会直接从本地 `.env` 加载配置。

### 生产环境（VPS/云服务器）

设置 `CONFIG_SERVICE_URL` 和 `CONFIG_ACCESS_TOKEN`，API keys 从 Cloudflare 加载，更安全。

## 优势总结

✅ **安全性提升**：敏感信息不存储在服务器文件系统  
✅ **集中管理**：所有环境共享同一套配置  
✅ **零停机更新**：修改 Cloudflare Secrets 无需重启服务  
✅ **免费使用**：Cloudflare Workers 免费额度完全够用  
✅ **自动 Fallback**：Cloudflare 不可用时自动切换到本地配置
