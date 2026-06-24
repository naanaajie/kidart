// ============================================================
//  public/config.js —— 站点前端配置
//
//  这里的三个值都是【公开安全】的，可以放前端、可以进 GitHub：
//    - SUPABASE_URL        项目地址
//    - SUPABASE_ANON_KEY   Supabase 的 Publishable key（受 RLS 保护）
//    - PAYPAL_CLIENT_ID    PayPal 的 Client ID（前端 SDK 用）
//
//  ⚠️ 绝对不要把机密放这里：
//    - SUPABASE service_role / Secret key（sb_secret_...）
//    - PAYPAL_SECRET
//    这两个只能待在 Vercel 后台的环境变量里。
//
//  填值建议：从后台【点复制按钮】粘贴，不要手敲
//  （I 大写 i / l 小写 L 长得一样，手敲极易错，错一个字符 key 就失效）。
// ============================================================
window.APP_CONFIG = {
  // Supabase 后台 → Project Settings → API → Project URL
  SUPABASE_URL: "https://awvhpaieygjqzofclbrm.supabase.co",

  // Supabase 后台 → Project Settings → API → Publishable key（sb_publishable_...）
  SUPABASE_ANON_KEY: "sb_publishable__d8F-lWU3jdGLRe7BKGn3g_x-to_rXU",

  // PayPal 开发者后台 → Apps & Credentials → Sandbox → 你的 App → Client ID
  PAYPAL_CLIENT_ID: "AXXoeMtfQ7IS4m809GpYC-4d_eyh9xCxtdG06P-_pWOAY0b_2UhofY0pLFBJCIvGyv7VxOU_dwSBr64P",
};
