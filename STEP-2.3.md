# 2.3 — create-order（服务端按价格创建 PayPal 订单）

这步新增了两个文件，并给 package.json 加了一个依赖。

## 新增 / 改动
- `api/_lib.js`（新增）：共用工具——连 Supabase 服务端、取 PayPal 令牌、解析登录用户。
- `api/create-order.js`（新增）：按商品查价 → 创建 PayPal 订单 → 返回订单号。
- `package.json`（更新）：新增依赖 `@supabase/supabase-js`。

## 操作步骤

### 1. 安装依赖
在 VSCode 里打开终端（Terminal → New Terminal），在项目根目录运行：

```bash
npm install
```

这会生成 `package-lock.json` 和 `node_modules/`（后者已被 .gitignore 排除，不会提交）。

### 2. 提交并推送
```bash
git add .
git commit -m "feat: create-order endpoint"
git push
```
Vercel 会自动重新部署（约 1 分钟）。

### 3. 测试（确认能拿到 PayPal 订单号）

**方式 A — 浏览器直接打开**（最简单）：
```
https://你的项目.vercel.app/api/create-order?product=lifetime
```
应返回类似：
```json
{ "id": "5O190127TN364715T", "status": "CREATED", "product": "lifetime", "amount": "19.90", "currency": "USD" }
```
看到一个 `id`（PayPal 订单号）= 成功 ✅

也可以试 `?product=single`，金额应变成 3.90。

**方式 B — curl**（终端）：
```bash
curl -X POST https://你的项目.vercel.app/api/create-order \
  -H "Content-Type: application/json" \
  -d '{"product":"lifetime"}'
```

## 这步验收标准
- `?product=lifetime` 返回带 `id` 的 JSON，`amount` = 19.90
- `?product=single` 返回带 `id` 的 JSON，`amount` = 3.90

两个都对 → 2.3 完成。说明"服务端按数据库价格创建 PayPal 订单"这条通了，
而且价格来自数据库（以后改价只改 Supabase 的 pricing 表，不动代码）。

## 如果报错
打开那个 URL 如果返回 `{"error": "..."}`，把 error 内容贴给我：
- `Missing env var: XXX` → 某个环境变量没配好 / 拼写不对
- `PayPal token error 401` → PayPal Client ID 或 Secret 不对（注意别混了沙盒/实盘）
- `Price not found` → pricing 表没数据（回 Supabase 确认第 1 步的 insert 成功）
