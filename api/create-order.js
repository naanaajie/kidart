// ============================================================
// POST /api/create-order   （也支持 GET 方便浏览器测试）
//
// 作用：前端说"我要买 single / lifetime"，本接口：
//   1) 去 Supabase 的 pricing 表查【当前价格】——金额绝不信前端传来的
//   2) 用 PayPal 沙盒凭据创建订单
//   3) 把订单号返回前端
//
// 安全要点：
//   - 金额、商品在服务端定义；前端只传 product（single|lifetime）
//   - 登录用户 id 写进订单 custom_id，供 webhook 发放时识别是谁
// ============================================================
import {
  supabaseAdmin, paypalBase, getPaypalToken,
  readJsonBody, getUserFromRequest,
} from './_lib.js';

export default async function handler(req, res) {
  try {
    // 取 product：POST 从 body，GET 从 query（测试用），默认 lifetime
    const isPost = req.method === 'POST';
    const body = isPost ? await readJsonBody(req) : {};
    const product = (body.product || (req.query && req.query.product) || 'lifetime');

    if (product !== 'single' && product !== 'lifetime') {
      return res.status(400).json({ error: 'Invalid product (single|lifetime)' });
    }

    // 1) 查价格（真相在数据库）
    const { data: price, error: pErr } = await supabaseAdmin
      .from('pricing')
      .select('*')
      .eq('id', product)
      .eq('active', true)
      .single();

    if (pErr || !price) {
      return res.status(400).json({ error: 'Price not found', detail: pErr?.message });
    }

    // 2) 解析登录用户（可选；测试时可匿名）
    const user = await getUserFromRequest(req);

    // 3) 创建 PayPal 订单
    const token = await getPaypalToken();
    const r = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: product,
          custom_id: user ? user.id : undefined,   // 没登录则不带，JSON 会自动省略
          description: price.label,
          amount: {
            currency_code: price.currency,
            value: Number(price.amount).toFixed(2),
          },
        }],
      }),
    });

    const order = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: 'PayPal create order failed', detail: order });
    }

    // 返回订单号给前端（前端再用它拉起 PayPal 付款界面）
    return res.status(200).json({
      id: order.id,
      status: order.status,
      product,
      amount: price.amount,
      currency: price.currency,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
