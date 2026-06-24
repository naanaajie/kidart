# 3.4 — PayPal 按钮 + 真实付款闭环（最终验收）

把付费弹窗的占位按钮换成真正的 PayPal 按钮，跑通完整付款链路。

## 新增 / 改动
- `api/capture-order.js`（新）：捕获扣款 + 即时发放授权（与 webhook 双保险，幂等防重）。
- `public/index.html`：付费弹窗挂真 PayPal 按钮；付款成功后轮询授权、自动解锁关窗。

## ⚠️ 配置改成独立文件 public/config.js
现在三个公开值都集中在 **`public/config.js`**，主文件 `index.html` 不再写 key。
打开 `public/config.js`，把三个值填成你自己的（**从后台点"复制"按钮粘贴，别手敲**）：
```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://你的项目.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_...",   // Supabase Publishable key
  PAYPAL_CLIENT_ID: "Ad7tUZ...",             // Sandbox Client ID
};
```
**好处**：以后我再发新版 `index.html`，你的 `config.js` 不用动、key 不会丢。
> 从下个包起，我会**不再包含 config.js**，避免覆盖掉你填好的值。这次的包带一份占位 config.js 给你填。

⚠️ 只放这三个公开值。`SUPABASE` 的 Secret key（sb_secret_）和 `PAYPAL_SECRET` 绝不放这，只在 Vercel 后台。

## 部署
```bash
git add . && git commit -m "feat: paypal buttons + capture" && git push
```
（无新依赖）capture-order 是新接口，部署后自动生效。

## 测试前准备
1. 把你自己账户改回**未解锁**：Supabase profiles 表，`is_lifetime=false`、`single_credits=0`。
2. 准备好沙盒**买家**账号：`sb-qbjqz46378620@personal.example.com` + 它的密码
   （密码在 developer.paypal.com → Testing Tools → Sandbox Accounts 点该账号查看/重置）。

## 完整测试（最终验收）
1. 打开网站，**登录**（你的邮箱），确认右上角是 **剩 0 次**。
2. 切到**打印** Tab → 点导出 → 弹出付费弹窗，能看到两张卡片下方各有**黄色/银色 PayPal 按钮**。
   - 如果按钮位置显示"未配置 Client ID" → `PAYPAL_CLIENT_ID` 没填对。
3. 点 **Lifetime $19.90** 的 PayPal 按钮 → 弹出 PayPal 付款窗。
4. 用**买家账号** `sb-qbjqz46378620@personal.example.com` + 密码登录，确认付款。
5. 付款成功后：弹窗内提示"解锁成功"，约 1～2 秒后自动关闭。
6. **验证解锁**：右上角应变成 **Lifetime / 终身解锁**。
7. 回**打印** Tab 点导出 → 现在应**直接导出无水印高清图**（不再弹付费）。
8. 数据库核对：
   - `profiles`：你这行 `is_lifetime = true`
   - `orders`：多一条 `status=completed` 的记录（capture_id 有值）
   - 用 single 测的话：`single_credits` 增加对应次数

**全部通过 = 整个付费产品闭环跑通，可以真收钱了。** 🎉

## 排错
- 按钮显示"未配置 Client ID" → 填 `PAYPAL_CLIENT_ID` 并 push。
- 点按钮没反应 / 控制台报错 → 截图控制台给我。
- 付款窗能开但捕获失败（提示 Payment failed）→ 看 Vercel → capture-order 的 Logs，把 error 贴我。
- 付款成功但右上角没变 lifetime →
  - 等几秒刷新页面（webhook 兜底也会发放）；
  - 还不行看 Vercel capture-order / paypal-webhook 日志，多半是 `SUPABASE_SERVICE_ROLE_KEY`（应为 sb_secret_ 那把）或 grant_entitlement 报错。
- 若提示 capability 相关错误 → 回 PayPal App 勾上 "Payment links and buttons" 再 Save，重试。

## 两条小提醒
- 现在是 **sandbox**，付的是假钱。上线真收钱要把 PayPal 切 live：换 live 的 Client ID/Secret，
  Vercel `PAYPAL_ENV=live`，并配 live webhook。这步等你准备正式上线再做。
- `SUPABASE_SERVICE_ROLE_KEY`（Vercel 里）应是新的 **Secret key**（`sb_secret_...`）。
  如果 capture/webhook 发放报权限错，优先检查这个。
