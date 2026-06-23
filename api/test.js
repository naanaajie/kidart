// 测试接口：部署后访问 https://你的域名/api/test
// 看到下面这段 JSON，就说明 GitHub → Vercel → serverless 管道打通了。
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "Serverless 管道已打通 🎉",
    time: new Date().toISOString(),
  });
}
