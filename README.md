# DoodleToArt

孩子的涂鸦 / 随手拍的花 → 复古肌理插画。可在线编辑、导出可打印的高清装饰画。

---

## 当前进度：第 2 步 2.1 —— 打通 GitHub → Vercel → Serverless 管道

这个包是**最小骨架**，只包含工具页 + 一个测试接口，用来验证部署管道是否打通。
PayPal / Supabase 的逻辑会在后面几步加进 `/api`。

## 目录结构

```
doodletoart/
├── public/
│   └── index.html        ← 工具页（访问网站根路径就是它）
├── api/
│   └── test.js           ← 测试接口：/api/test
├── package.json
└── .gitignore            ← 防止密钥/依赖被提交
```

Vercel 规则：`/api` 下每个 .js = 一个接口；`/public` 下是静态文件。

## 部署步骤（GitHub + Vercel）

### 1. 用 VSCode 打开本文件夹
解压后，VSCode → File → Open Folder → 选 `doodletoart` 文件夹。

### 2. 推到 GitHub
VSCode 内置 Git 面板（左侧第三个图标），或用终端（Terminal → New Terminal）：

```bash
git init
git add .
git commit -m "init: doodletoart skeleton"
# 然后在 github.com 新建一个空仓库（不要勾选 README），把它的地址填到下面
git remote add origin https://github.com/你的用户名/doodletoart.git
git branch -M main
git push -u origin main
```

### 3. 连 Vercel
1. 打开 vercel.com，用 GitHub 账号登录。
2. Add New → Project → Import 刚才那个仓库。
3. **Framework Preset 选 "Other"**，其余保持默认。
4. Deploy，等一两分钟。

### 4. 验证（两个都要对）
- 打开 `https://你的项目.vercel.app/` → 看到工具页正常显示。
- 打开 `https://你的项目.vercel.app/api/test` → 看到：
  ```json
  { "ok": true, "message": "Serverless 管道已打通 🎉", "time": "..." }
  ```

两个都通过 → 2.1 完成，进入 2.2（配置环境变量）。

## 注意
- `.env` 已被 .gitignore 排除，**任何密钥都不要写进会被提交的文件**。
- service_role key、PayPal secret 等只填到 Vercel 后台的 Environment Variables，绝不进前端代码。
