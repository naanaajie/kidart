// ============================================================
// POST /api/paypal-webhook
//
// PayPal 在收到付款后【主动】打到这个地址。这是【唯一】能发放授权的入口。
// 做三件事，缺一不可：
//   1) 验签：确认请求真的来自 PayPal（防伪造解锁）
//   2) 幂等：同一笔只发一次（PayPal 会重复投递）—— 靠 orders.paypal_capture_id 唯一约束
//   3) 发放：用 service_role 调 grant_entitlement（lifetime 置 true / single +1）
//
// "这笔钱是谁付的" = 订单里的 custom_id（2.3 create-order 时写入的 user id）
//
// ⚠️ 验签需要拿到【原始请求体】，所以这里关闭了 Vercel 的自动 body 解析
// ============================================================
import { supabaseAdmin, paypalBase, getPaypalToken, env } from './_lib.js';

// 关键：告诉 Vercel 不要自动解析 body，我们要原始字节做验签
export const config = { api: { bodyParser: false } };

// 读取原始请求体（字符串）
async function readRawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);

    // ---------- 1) 验签 ----------
    // 用 PayPal 的 verify-webhook-signature 接口校验
    const token = await getPaypalToken();
    const verifyRes = await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: env('PAYPAL_WEBHOOK_ID'),
        webhook_event: JSON.parse(rawBody),
      }),
    });
    const verify = await verifyRes.json();

    if (!verifyRes.ok || verify.verification_status !== 'SUCCESS') {
      console.error('Webhook verify failed:', verify);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // ---------- 解析事件 ----------
    const event = JSON.parse(rawBody);
    const type = event.event_type;

    // 我们只关心"收款完成"
    if (type !== 'PAYMENT.CAPTURE.COMPLETED') {
      // 其它事件直接回 200，告诉 PayPal "收到了，不用重发"
      return res.status(200).json({ ignored: type });
    }

    const capture = event.resource || {};
    const captureId = capture.id;                       // 这笔扣款的唯一 id（幂等用）
    const userId = capture.custom_id;                   // 是谁付的（2.3 埋进去的）
    const amount = capture.amount && capture.amount.value;
    const currency = capture.amount && capture.amount.currency_code;
    // 订单号（用于记录）
    const orderId =
      capture.supplementary_data &&
      capture.supplementary_data.related_ids &&
      capture.supplementary_data.related_ids.order_id;

    // custom_id 缺失 = 这笔订单创建时没带用户（比如匿名测试单），无法发放
    if (!userId) {
      console.warn('Capture without custom_id, cannot grant:', captureId);
      return res.status(200).json({ ok: true, note: 'no custom_id, skipped' });
    }

    // 用金额反推买的是哪个产品（也可改成从 pricing 表比对）
    const product = Number(amount) >= 19 ? 'lifetime' : 'single';

    // ---------- 2)+3) 幂等 + 发放（grant_entitlement 内部已做幂等判断）----------
    const { error } = await supabaseAdmin.rpc('grant_entitlement', {
      p_user_id: userId,
      p_product: product,
      p_capture_id: captureId,
      p_order_id: orderId || null,
      p_amount: amount ? Number(amount) : null,
      p_currency: currency || 'USD',
    });

    if (error) {
      console.error('grant_entitlement error:', error);
      return res.status(500).json({ error: 'grant failed', detail: error.message });
    }

    return res.status(200).json({ ok: true, product, user: userId });
  } catch (e) {
    console.error('webhook error:', e);
    // 返回非 200 会让 PayPal 重试；如果是我们代码的偶发错误，重试有机会成功
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
