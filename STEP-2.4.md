# 2.4 — paypal-webhook（收款回调 + 发放授权）

新增 `api/paypal-webhook.js`：PayPal 付款后会主动打到它，它【验签 + 防重复 + 发放授权】。

## 重要：操作顺序

必须 **先部署，再去 PayPal 配 webhook**（配置时填的地址得是已经能访问的）。

---

### 第 1 步：部署 webhook 函数
把新文件放进项目后：
```bash
git add .
git commit -m "feat: paypal webhook"
git push
```
等 Vercel 部署完。

**冒烟测试**（确认函数已上线）：浏览器打开
```
https://kidart-theta.vercel.app/api/paypal-webhook
```
应返回 `{"error":"Method not allowed"}`（因为它只收 POST）。
**看到这个就说明函数部署成功了** ✅（这是正常的，不是出错）。

---

### 第 2 步：在 PayPal 后台配置 webhook
1. developer.paypal.com → Apps & Credentials → **Sandbox** → 点进你的 App
2. 找到 **Webhooks** → **Add Webhook**
3. **Webhook URL** 填：
   ```
   https://kidart-theta.vercel.app/api/paypal-webhook
   ```
4. **Event types**：勾选 **`PAYMENT.CAPTURE.COMPLETED`**
   （可以用搜索框找它；只勾这一个就够了）
5. Save。

---

### 第 3 步：拿 Webhook ID 回填 Vercel
1. 保存后，那个 webhook 会显示一个 **Webhook ID**（一串字符）。复制它。
2. Vercel → 项目 → Settings → Environment Variables → 找到 `PAYPAL_WEBHOOK_ID`
   → 编辑，把值填成刚复制的 Webhook ID → Save。
3. **Redeploy**（改了环境变量必须重新部署：Deployments → ··· → Redeploy）。

---

### 第 4 步：验证（两个层次）

**层次 A — 立刻能做：确认 webhook 已接入、能验签**
PayPal 后台有个 **Webhooks Simulator / Test**（在 webhook 配置附近或 Mock 工具里）：
- 选事件 `PAYMENT.CAPTURE.COMPLETED`，发送一个测试通知到你的地址。
- 期望：你的函数返回 200，且日志里**没有 "Invalid signature"**。
- 注意：模拟事件里的 `custom_id` 是假的（不是真实用户），所以它**不会真的发放授权**，会返回类似 `{"ok":true,"note":"no custom_id, skipped"}` 或跳过——**这是对的**。这一层只验证"能收到 + 验签通过"。

> 说明：少数情况下 PayPal 模拟器发的事件验签会不通过（这是模拟器的已知特性，不代表你配错了）。真正可靠的验证是下面层次 B。

**层次 B — 完整闭环（在第 3 步做）**
真正"付一笔钱 → `is_lifetime` 自动变 true"的端到端测试，要等第 3 步加上前端 PayPal 付款按钮后，用沙盒买家账号真实走一遍付款，那时 webhook 会带着【真实用户 id】触发，授权真正写入。**这是整条链路的最终验收，我们下一步一起做。**

---

## 这步的完成标准
- `/api/paypal-webhook` 用浏览器打开返回 "Method not allowed"（证明已部署）✅
- PayPal 后台 webhook 配好了，URL + `PAYMENT.CAPTURE.COMPLETED` 事件 ✅
- `PAYPAL_WEBHOOK_ID` 已回填 Vercel 并 Redeploy ✅
- （可选）模拟器测试能收到、日志无 "Invalid signature"

做到前三条，2.4 就算完成，进第 3 步（前端登录 + PayPal 按钮 + 完整闭环测试）。

## 排错
- 打开地址返回的不是 "Method not allowed" 而是 500/报错 → 把内容贴给我。
- 模拟器测试日志出现 **"Invalid signature"** 且是真实付款也失败 → 多半是 webhook id 没填对，或"原始 body"读取问题，告诉我，我帮你调 body 读取方式。
- 看日志：Vercel → 项目 → 某次 Deployment → Functions / Logs，能看到 webhook 函数的 console 输出。
