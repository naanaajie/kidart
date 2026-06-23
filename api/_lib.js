// ============================================================
// 共用工具（服务端专用，绝不会被打包进前端）
//   - supabaseAdmin: 用 service_role 连接，可绕过 RLS 发放授权
//   - getPaypalToken: 拿 PayPal API 访问令牌
//   - getUserFromRequest: 校验前端带来的登录态，得到是哪个用户
// 这些都依赖 Vercel 环境变量，本地不会有值
// ============================================================
import { createClient } from '@supabase/supabase-js';

// 读环境变量，缺失时明确报错（方便定位"忘了配某个变量"）
export function env(name, required = true) {
  const v = process.env[name];
  if (required && (!v || !String(v).trim())) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

// 服务端 Supabase 客户端：用 service_role，拥有最高权限
export const supabaseAdmin = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 根据 PAYPAL_ENV 选择沙盒 / 实盘的 API 地址
export function paypalBase() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

// 获取 PayPal 访问令牌（OAuth2 client_credentials）
export async function getPaypalToken() {
  const id = env('PAYPAL_CLIENT_ID');
  const secret = env('PAYPAL_SECRET');
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`PayPal token error ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j.access_token;
}

// 读取 JSON body（兼容已解析 / 原始流两种情况）
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// 从请求里解析出"是哪个登录用户"。前端会带上 Supabase 的 access token。
// 没带或无效则返回 null（测试时允许匿名）。
export async function getUserFromRequest(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
