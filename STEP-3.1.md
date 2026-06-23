# 3.1 — 前端接 Supabase 登录（邮箱魔法链接）

给 `public/index.html` 加了登录层：顶部账户按钮 + 登录弹窗 + 登录脚本。
**工具本身功能没动。**

## 你必须做的一件事：填两个值

打开 `public/index.html`，在**底部那段 `<script>`** 里找到这两行（有醒目注释框），填成你自己的：

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";   // ← 改成你的 Project URL
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";          // ← 改成你的 anon public key
```

两个值在：**Supabase 后台 → Project Settings → API**
- `Project URL` → 填给 `SUPABASE_URL`
- `Project API keys` 里的 **`anon` `public`** → 填给 `SUPABASE_ANON_KEY`

⚠️ 注意：这里要的是 **anon（公开）** key，**不是** service_role。
anon key 放前端是安全的、设计如此（它受 RLS 保护，改不动别人数据）。

## 前置（你已做）
- Supabase → Authentication → URL Configuration：Site URL 和 Redirect URLs 已加
  `https://kidart-theta.vercel.app`
- Email provider 已启用

## 部署
```bash
git add .
git commit -m "feat: supabase email login"
git push
```
（无新依赖，不用 npm install）

## 测试（验收）
1. 打开 `https://kidart-theta.vercel.app/`
2. 右上角应出现 **Sign in** 按钮 → 点它 → 弹出登录框
3. 输入你的邮箱 → **发送登录链接** → 应提示"链接已发送"
4. 去邮箱收信（注意垃圾箱），点开链接 → 跳回网站
5. 右上角按钮应变成 **你的邮箱 · 剩 3 次**（注册自动送的免费额度）
6. 去 Supabase → Authentication → Users 能看到你这个用户；
   `profiles` 表里也有你这行，`single_credits = 3`

全部对 → 3.1 完成 ✅。说明：登录通了、RLS 能读到自己的授权、注册送额度生效。

## 排错
- 点 Sign in 没反应 / 控制台报 "未配置" → 两个值没填或填错
- 收不到邮件 → Supabase 自带邮件**每小时限发几封**，等一会儿再试；
  确认 URL Configuration 白名单填了你的网址
- 点开链接没登录上 / 报 redirect 错误 → Redirect URLs 没加对，
  补一条 `https://kidart-theta.vercel.app/**`
- 按钮显示邮箱但没有"剩 3 次" → profiles 没读到（极少见），
  确认第 1 步 SQL 的 RLS "read own profile" 策略在

## 说明
- 现在只是"能登录 + 显示额度"。**导出还没接门禁**——付费/解锁是 3.3、3.4。
- 登录态已通过 `window.kidartAuth` 暴露给后续步骤（带 token 调 create-order 用）。
