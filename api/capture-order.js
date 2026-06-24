// ============================================================
// POST /api/capture-order   { orderID }
//
// PayPal 按钮"批准"后调它：服务端捕获扣款，并【即时发放授权】。
// 与 webhook 双保险：两边都调 grant_entitlement，靠 capture_id 唯一约束防重复，
// 谁先到谁发放，另一个自动幂等忽略 → 付款后用户秒解锁，不用等 webhook。
//
// 安全：发放对象是【token 校验出的登录用户】，不盲信前端传来的身份。
// ============================================================
import {
  supabaseAdmin, paypalBase, getPaypalToken,
  readJsonBody, getUserFromRequest,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // 必须是登录用户
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const body = await readJsonBody(req);
    const orderID = body.orderID;
    if (!orderID) return res.status(400).json({ error: 'Missing orderID' });

    // 捕获扣款
    const token = await getPaypalToken();
    const r = await fetch(`${paypalBase()}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'capture failed', detail: data });

    const pu = (data.purchase_units && data.purchase_units[0]) || {};
    const cap = pu.payments && pu.payments.captures && pu.payments.captures[0];
    if (!cap || cap.status !== 'COMPLETED') {
      return res.status(502).json({ error: 'capture not completed', detail: data });
    }

    const captureId = cap.id;
    const amount = cap.amount && cap.amount.value;
    const currency = (cap.amount && cap.amount.currency_code) || 'USD';
    // 优先用订单里的 reference_id（创建时写的 product），兜底用金额判断
    const product = (pu.reference_id === 'lifetime' || pu.reference_id === 'single')
      ? pu.reference_id
      : (Number(amount) >= 19 ? 'lifetime' : 'single');

    // 即时发放（幂等）
    const { error } = await supabaseAdmin.rpc('grant_entitlement', {
      p_user_id: user.id,
      p_product: product,
      p_capture_id: captureId,
      p_order_id: orderID,
      p_amount: amount ? Number(amount) : null,
      p_currency: currency,
    });
    if (error) return res.status(500).json({ error: 'grant failed', detail: error.message });

    return res.status(200).json({ ok: true, product });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
