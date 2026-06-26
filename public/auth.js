// ===== stylejoy shared auth =====
// Provides window.kidartAuth for all tools.
// Load after config.js and @supabase/supabase-js.
(function(){
  "use strict";

  const CFG = window.APP_CONFIG || {};
  const SUPABASE_URL = CFG.SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
  const SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "YOUR-ANON-PUBLIC-KEY";
  const PAYPAL_CLIENT_ID = CFG.PAYPAL_CLIENT_ID || "YOUR-PAYPAL-CLIENT-ID";

  const byId = id => document.getElementById(id);
  const configured = !SUPABASE_URL.includes("YOUR-") && !SUPABASE_ANON_KEY.includes("YOUR-");
  let sb = null;
  if (configured && window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sb = sb;
    console.log('[auth] createClient ok, URL=', SUPABASE_URL);
  } else {
    console.warn('[auth] createClient skipped: configured=', configured, 'window.supabase=', !!window.supabase);
  }

  // 弹窗文案（中英，跟随主界面语言）
  const I18N2 = {
    zh:{ signin_title:'登录 / 注册', signin_sub:'输入邮箱，我们会发一条登录链接给你。点开即登录，无需密码。',
         signin_btn:'发送登录链接', account_title:'我的账户', signout_btn:'退出登录',
         acct_signin:'登录', sending:'发送中…', sent:'链接已发送，请去邮箱查收（注意垃圾箱）。',
         invalid_email:'请输入有效邮箱', err:'出错了，请重试',
         lifetime:'终身解锁', credits_left:'剩 {n} 次', account_short:'账户', not_configured:'Supabase 未配置（请在代码顶部填 URL 和 anon key）',
         google_btn:'使用 Google 登录', or_divider:'或',
         pay_title:'解锁高清导出', pay_sub:'高清 / 可打印导出需解锁。社交尺寸始终可免费导出（带水印）。',
         pay_single:'单张高清', pay_lifetime:'终身无限', pay_best:'最划算',
         pay_single_desc:'本次导出 1 张无水印高清图', pay_lifetime_desc:'无限次导出 · 无水印 · 含后续新功能（约做 5 张就回本）',
         pay_stub:'支付按钮下一步接入', pay_stub_msg:'PayPal 付款将在下一步（3.4）接入。',
         pay_processing:'付款处理中…', pay_failed:'付款失败，请重试', pay_cancel:'已取消付款',
         pay_success:'解锁成功！正在为你打开…', pay_success_delay:'付款成功！授权稍后到账，请刷新页面。',
         pay_need_clientid:'未配置 PayPal Client ID（请在代码顶部填）' },
    en:{ signin_title:'Sign in / Sign up', signin_sub:"Enter your email and we'll send a magic link — click it to sign in, no password needed.",
         signin_btn:'Send magic link', account_title:'My account', signout_btn:'Sign out',
         acct_signin:'Sign in', sending:'Sending…', sent:'Link sent! Check your inbox (and spam).',
         invalid_email:'Please enter a valid email', err:'Something went wrong, try again',
         lifetime:'Lifetime', credits_left:'{n} left', account_short:'Account', not_configured:'Supabase not configured (fill URL & anon key at top of script)',
         google_btn:'Continue with Google', or_divider:'or',
         pay_title:'Unlock HD export', pay_sub:'HD / printable export needs unlocking. Social sizes are always free (watermarked).',
         pay_single:'Single HD', pay_lifetime:'Lifetime unlimited', pay_best:'Best value',
         pay_single_desc:'One watermark-free HD export', pay_lifetime_desc:'Unlimited exports · no watermark · future features included (pays off in ~5 prints)',
         pay_stub:'Payment buttons coming next', pay_stub_msg:'PayPal checkout will be wired in the next step (3.4).',
         pay_processing:'Processing payment…', pay_failed:'Payment failed, please try again', pay_cancel:'Payment cancelled',
         pay_success:'Unlocked! Opening…', pay_success_delay:'Payment received! Entitlement will arrive shortly — please refresh.',
         pay_need_clientid:'PayPal Client ID not configured (fill it at top of script)' },
  };
  function alang(){ try{ return localStorage.getItem('ri_lang')==='en' ? 'en':'zh'; }catch(e){ return 'zh'; } }
  function t2(k,vars){ let s=(I18N2[alang()]||I18N2.zh)[k]||k; if(vars)for(const x in vars)s=s.split('{'+x+'}').join(vars[x]); return s; }
  function applyAuthLang(){ document.querySelectorAll('[data-i18n2]').forEach(el=>{ el.textContent=t2(el.dataset.i18n2); }); updateAccountBtn(); }

  let session = null, profile = null;
  const show = (el,on)=>{ el.style.display = on ? '' : 'none'; };
  const openModal  = ()=>{ applyAuthLang(); renderState(); byId('auth-msg').textContent=''; byId('auth-mask').classList.add('show'); };
  const closeModal = ()=> byId('auth-mask').classList.remove('show');

  function statusText(){
    if(!profile) return '';
    return profile.is_lifetime ? t2('lifetime') : t2('credits_left',{n: profile.single_credits});
  }
  function updateAccountBtn(){
    const btn = byId('account-btn'); if(!btn) return;
    const loggedIn = !!(session && session.user);
    const st = loggedIn ? statusText() : '';
    const label = loggedIn ? (st || t2('account_short')) : t2('acct_signin');
    console.log('[auth] updateAccountBtn: loggedIn=', loggedIn, 'label=', label, 'session=', session ? 'exists' : 'null');
    btn.textContent = label;
  }
  function renderState(){
    const inOk = !!(session && session.user);
    show(byId('auth-signin'), !inOk);
    show(byId('auth-signedin'), inOk);
    if(inOk){
      byId('acct-email').textContent = session.user.email || '';
      byId('acct-status').textContent = statusText();
    }
  }

  async function fetchProfile(){
    if(!sb || !session){ profile=null; return; }
    try{
      const { data, error } = await sb.from('profiles')
        .select('is_lifetime,single_credits').eq('id', session.user.id).single();
      profile = error ? null : data;
    }catch(e){ profile=null; }
  }

  function hasAccess(){ return !!(profile && (profile.is_lifetime || profile.single_credits > 0)); }

  async function spend(spec){
    if(!sb || !session) return false;
    try{
      const { data, error } = await sb.rpc('spend_single_credit');
      if(error || data !== true) return false;
      try{
        await sb.from('exports').insert({
          user_id: session.user.id, spec: spec || null,
          credits_spent: (profile && profile.is_lifetime) ? 0 : 1,
        });
      }catch(e){}
      const { data: s } = await sb.auth.getSession();
      await refresh(s.session);
      return true;
    }catch(e){ return false; }
  }

  // ---------- 付费弹窗 ----------
  const closePay = ()=> byId('pay-mask').classList.remove('show');

  let paypalSDKPromise = null;
  function ensurePayPalSDK(){
    if(window.paypal) return Promise.resolve(window.paypal);
    if(paypalSDKPromise) return paypalSDKPromise;
    if(PAYPAL_CLIENT_ID.includes('YOUR-')) return Promise.reject(new Error('no-client-id'));
    paypalSDKPromise = new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
      s.onload=()=> window.paypal ? resolve(window.paypal) : reject(new Error('sdk-empty'));
      s.onerror=()=> reject(new Error('sdk-load-failed'));
      document.head.appendChild(s);
    });
    return paypalSDKPromise;
  }

  async function waitForAccess(){
    for(let i=0;i<6;i++){
      if(window.kidartAuth && window.kidartAuth.refresh) await window.kidartAuth.refresh();
      if(hasAccess()){
        byId('pay-msg').className='msg ok'; byId('pay-msg').textContent=t2('pay_success');
        setTimeout(closePay, 1200);
        return;
      }
      await new Promise(r=>setTimeout(r,1200));
    }
    byId('pay-msg').className='msg ok'; byId('pay-msg').textContent=t2('pay_success_delay');
  }

  async function mountPayPal(containerId, product){
    const el = byId(containerId); if(!el) return;
    el.innerHTML='';
    let paypal;
    try{ paypal = await ensurePayPalSDK(); }
    catch(e){ el.innerHTML=`<div style="font-size:12px;color:var(--text-dim);text-align:center">${t2('pay_need_clientid')}</div>`; return; }
    paypal.Buttons({
      style:{ layout:'vertical', color: product==='lifetime'?'gold':'silver', shape:'pill', height:42, tagline:false, label:'pay' },
      createOrder: async ()=>{
        const token = await window.kidartAuth.getToken();
        const r = await fetch('/api/create-order',{
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
          body: JSON.stringify({ product }),
        });
        const d = await r.json();
        if(!d.id) throw new Error('create-order failed');
        return d.id;
      },
      onApprove: async (data)=>{
        byId('pay-msg').className='msg'; byId('pay-msg').textContent=t2('pay_processing');
        try{
          const token = await window.kidartAuth.getToken();
          const r = await fetch('/api/capture-order',{
            method:'POST',
            headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
            body: JSON.stringify({ orderID: data.orderID }),
          });
          const d = await r.json();
          if(!r.ok || !d.ok){ byId('pay-msg').className='msg err'; byId('pay-msg').textContent=t2('pay_failed'); return; }
          await waitForAccess();
        }catch(e){ byId('pay-msg').className='msg err'; byId('pay-msg').textContent=t2('pay_failed'); }
      },
      onError: (err)=>{ console.error('paypal error', err); byId('pay-msg').className='msg err'; byId('pay-msg').textContent=t2('pay_failed'); },
      onCancel: ()=>{ byId('pay-msg').className='msg'; byId('pay-msg').textContent=t2('pay_cancel'); },
    }).render('#'+containerId);
  }

  async function loadPrices(){
    const box = byId('pay-options'); box.innerHTML='';
    let prices=[];
    try{
      const { data } = await sb.from('pricing').select('id,amount,currency').in('id',['single','lifetime']);
      prices = data || [];
    }catch(e){}
    const get = id => prices.find(p=>p.id===id);
    const life = get('lifetime'), single = get('single');
    const cur = (life && life.currency) || (single && single.currency) || 'USD';
    const sym = cur==='USD' ? '$' : '';
    const fmt = a => sym + Number(a).toFixed(2);
    if(life){
      const d=document.createElement('div'); d.className='pay-card best';
      d.innerHTML=`<div class="pc-top"><span class="pc-name">${t2('pay_lifetime')}</span><span class="pc-badge">${t2('pay_best')}</span></div>
        <div class="pc-price">${fmt(life.amount)}</div>
        <div class="pc-desc">${t2('pay_lifetime_desc')}</div>
        <div class="pc-btnwrap" id="pp-lifetime"></div>`;
      box.appendChild(d);
    }
    if(single){
      const d=document.createElement('div'); d.className='pay-card';
      d.innerHTML=`<div class="pc-top"><span class="pc-name">${t2('pay_single')}</span></div>
        <div class="pc-price">${fmt(single.amount)}</div>
        <div class="pc-desc">${t2('pay_single_desc')}</div>
        <div class="pc-btnwrap" id="pp-single"></div>`;
      box.appendChild(d);
    }
    if(life) mountPayPal('pp-lifetime','lifetime');
    if(single) mountPayPal('pp-single','single');
  }

  async function openPaywall(){
    if(!sb){ return; }
    if(!session){ openModal(); return; }
    applyAuthLang();
    byId('pay-msg').textContent='';
    byId('pay-mask').classList.add('show');
    await loadPrices();
  }

  async function refresh(s){
    console.log('[auth] refresh called: session=', s ? 'exists (user=' + (s.user && s.user.email) + ')' : 'null');
    session = s;
    await fetchProfile();
    updateAccountBtn(); renderState();
    window.kidartAuth = {
      isLoggedIn: !!session,
      user: session ? session.user : null,
      profile,
      hasAccess,
      spend,
      openPaywall,
      getToken: async ()=>{ if(!sb) return null; const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; },
      refresh: async ()=>{ if(!sb) return; const { data } = await sb.auth.getSession(); await refresh(data.session); },
      open: openModal,
      // 便捷方法：未登录→打开登录，已登录未付费→打开 paywall，已有权限→返回 true
      requireAccess: async ()=>{
        if(!window.kidartAuth.isLoggedIn){ openModal(); return false; }
        if(!window.kidartAuth.hasAccess()){ await openPaywall(); return false; }
        return true;
      },
    };
  }

  // 事件绑定（仅当对应元素存在时绑定，保证在 app.html 和 shape.html 都安全）
  const on = (id, ev, fn) => { const el=byId(id); if(el) el.addEventListener(ev, fn); };

  on('account-btn', 'click', openModal);
  on('auth-close',  'click', closeModal);
  on('auth-mask',   'click', e=>{ if(e.target===byId('auth-mask')) closeModal(); });

  on('auth-send', 'click', async ()=>{
    const msg = byId('auth-msg'); msg.className='msg';
    if(!sb){ msg.className='msg err'; msg.textContent=t2('not_configured'); return; }
    const email = byId('auth-email').value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.className='msg err'; msg.textContent=t2('invalid_email'); return; }
    msg.className='msg'; msg.textContent=t2('sending');
    try{
      const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin } });
      if(error){ msg.className='msg err'; msg.textContent=error.message || t2('err'); }
      else{ msg.className='msg ok'; msg.textContent=t2('sent'); }
    }catch(e){ msg.className='msg err'; msg.textContent=t2('err'); }
  });

  on('auth-google', 'click', async ()=>{
    const msg = byId('auth-msg'); msg.className='msg'; msg.textContent='';
    if(!sb){ msg.className='msg err'; msg.textContent=t2('not_configured'); return; }
    console.log('[auth] Google OAuth: initiating signInWithOAuth');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if(error){
      console.log('[auth] Google OAuth error:', error.message);
      msg.className='msg err'; msg.textContent=error.message || t2('err');
    }
  });

  on('auth-signout', 'click', async ()=>{
    session = null; profile = null;
    updateAccountBtn(); renderState();
    closePay(); closeModal();
    if(sb){
      const { error } = await sb.auth.signOut();
      console.log('[auth] signOut result: error=', error || 'none');
    }
  });

  on('pay-close', 'click', closePay);
  on('pay-mask',  'click', e=>{ if(e.target===byId('pay-mask')) closePay(); });

  const lt = byId('lang-toggle');
  if(lt) lt.addEventListener('click', ()=> setTimeout(applyAuthLang, 0));

  applyAuthLang();
  if(sb){
    sb.auth.onAuthStateChange((event, s)=>{
      console.log('[auth] onAuthStateChange: event=', event, 'session=', s ? 'exists' : 'null');
      refresh(s);
    });
  } else {
    updateAccountBtn();
    console.warn('[auth] 未配置 Supabase URL / anon key，登录暂不可用。');
  }
})();
