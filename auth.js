/* ========================================================
   BeaPop Auth & Loyalty Points System
   v4: JWT Auth with D1 Backend (MISSION 77)
   ======================================================== */
(function() {
  'use strict';

  // API Base URL
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://beapop-api.beapop.workers.dev';

  const TOKEN_KEY = 'customerToken';
  const USER_KEY = 'customerUser';
  const POINTS_LOG_KEY = 'beapop_points_log';
  const VOUCHER_KEY = 'beapop_vouchers';

  /* ---- LOYALTY REWARD MILESTONES ---- */
  const REWARD_MILESTONES = [
    { target: 500000,   voucher: { code: 'LOYAL500K',  label: 'Giảm 5%',  type: 'percent', value: 5 } },
    { target: 1000000,  voucher: { code: 'LOYAL1M',    label: 'Giảm 10%', type: 'percent', value: 10, max: 100000 } },
    { target: 2000000,  voucher: { code: 'LOYAL2M',    label: 'Giảm 50k', type: 'fixed',   value: 50000 } },
    { target: 5000000,  voucher: { code: 'LOYAL5M',    label: 'Giảm 15%', type: 'percent', value: 15, max: 200000 } },
    { target: 10000000, voucher: { code: 'LOYAL10M',   label: 'Giảm 20%', type: 'percent', value: 20, max: 300000 } },
  ];

  /* ---- DATA LAYER ---- */
  const Auth = {
    getUser() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e) { return null; }
    },
    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },
    isLoggedIn() {
      return !!this.getToken() && !!this.getUser();
    },

    async login(phone, password) {
      phone = phone.replace(/\D/g, '');
      if (!/^0\d{9}$/.test(phone)) return { success:false, error:'INVALID_PHONE' };

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });

        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.customer));
          return { success: true, user: data.customer };
        } else {
          return { success: false, error: data.error || 'LOGIN_FAILED', needsPassword: data.needsPassword };
        }
      } catch (e) {
        console.error('Login error:', e);
        return { success: false, error: 'NETWORK_ERROR' };
      }
    },

    async register(phone, name, password) {
      phone = phone.replace(/\D/g, '');
      if (!/^0\d{9}$/.test(phone)) return { success:false, error:'INVALID_PHONE' };
      if (!name || name.trim().length < 2) return { success:false, error:'INVALID_NAME' };
      if (!password || password.length < 4) return { success:false, error:'WEAK_PASSWORD' };

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, password })
        });

        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.customer));
          return { success: true, user: data.customer };
        } else {
          return { success: false, error: data.error || 'REGISTER_FAILED' };
        }
      } catch (e) {
        console.error('Register error:', e);
        return { success: false, error: 'NETWORK_ERROR' };
      }
    },

    calcTier(p) { return p>=500?'gold':p>=100?'silver':'bronze'; },
    tierMultiplier(t) { return t==='gold'?2:t==='silver'?1.5:1; },
    tierLabel(t) { return {bronze:'🥉 Bronze',silver:'🥈 Silver',gold:'🥇 Gold'}[t]||'🥉 Bronze'; },
    tierColor(t) { return {bronze:'#cd7f32',silver:'#a0a0a0',gold:'#d4a017'}[t]||'#cd7f32'; },

    earnPoints(amount) {
      const user=this.getUser(); if(!user) return 0;
      const earned=Math.floor((amount/10000)*this.tierMultiplier(user.tier)); if(earned<=0) return 0;
      user.points+=earned; user.totalSpent+=amount; user.orderCount+=1; user.tier=this.calcTier(user.points);
      this.updateProfile(user); this.logPoints('earn',earned,'Đơn hàng '+new Intl.NumberFormat('vi-VN').format(amount)+'₫');
      // Check loyalty milestones for voucher rewards
      this.checkMilestones(user.totalSpent);
      return earned;
    },
    redeemPoints(points) {
      const user=this.getUser(); if(!user||user.points<points) return false;
      const discount=Math.floor(points/100)*50000; user.points-=Math.floor(points/100)*100;
      this.updateProfile(user); this.logPoints('redeem',Math.floor(points/100)*100,'Giảm '+new Intl.NumberFormat('vi-VN').format(discount)+'₫');
      return discount;
    },
    logPoints(type, amount, note) { try { const log=JSON.parse(localStorage.getItem(POINTS_LOG_KEY))||[]; log.unshift({type,amount,note,date:new Date().toISOString()}); if(log.length>100)log.length=100; localStorage.setItem(POINTS_LOG_KEY,JSON.stringify(log)); } catch(e){} },
    getPointsLog() { try { return JSON.parse(localStorage.getItem(POINTS_LOG_KEY))||[]; } catch(e) { return []; } },

    /* ---- LOYALTY VOUCHERS ---- */
    getVouchers() { try { return JSON.parse(localStorage.getItem(VOUCHER_KEY)) || []; } catch(e) { return []; } },
    saveVouchers(vouchers) { localStorage.setItem(VOUCHER_KEY, JSON.stringify(vouchers)); },
    getAvailableVouchers() { return this.getVouchers().filter(v => !v.used); },
    findVoucher(code) { return this.getVouchers().find(v => v.code === code.toUpperCase() && !v.used); },
    useVoucher(code) {
      const vouchers = this.getVouchers();
      const v = vouchers.find(v => v.code === code.toUpperCase() && !v.used);
      if (!v) return false;
      v.used = true; v.usedAt = new Date().toISOString();
      this.saveVouchers(vouchers);
      return true;
    },
    checkMilestones(totalSpent) {
      const vouchers = this.getVouchers();
      const existingCodes = new Set(vouchers.map(v => v.code));
      let newVouchers = [];
      REWARD_MILESTONES.forEach(m => {
        if (totalSpent >= m.target && !existingCodes.has(m.voucher.code)) {
          newVouchers.push({ code: m.voucher.code, label: m.voucher.label, type: m.voucher.type, value: m.voucher.value, max: m.voucher.max || null, milestone: m.target, earned: true, used: false, earnedAt: new Date().toISOString() });
        }
      });
      if (newVouchers.length > 0) this.saveVouchers([...vouchers, ...newVouchers]);
      return newVouchers;
    },
    getMilestones() { return REWARD_MILESTONES; },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    // Stub methods for backward compatibility - points system now server-side
    updateProfile(user) {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  };

  let currentMode = 'login';
  function createLoginModal() {
    if (document.getElementById('loginModal')) return;
    const modal = document.createElement('div'); modal.id = 'loginModal';
    modal.innerHTML = `
      <div class="login-overlay" onclick="window.BeaPop.closeLogin()"></div>
      <div class="login-box">
        <button class="login-close" onclick="window.BeaPop.closeLogin()">&times;</button>
        <div class="login-header"><div class="login-icon">👤</div><h2 id="loginTitle">Đăng nhập</h2><p id="loginSubtitle">Tích điểm & nhận ưu đãi mỗi đơn hàng</p></div>
        <div class="login-tabs" id="loginTabs">
          <button class="login-tab active" data-mode="login" onclick="window.BeaPop.switchMode('login')">Đăng nhập</button>
          <button class="login-tab" data-mode="register" onclick="window.BeaPop.switchMode('register')">Đăng ký</button>
        </div>
        <div class="login-error" id="loginError" style="display:none;"></div>
        <form id="loginForm" onsubmit="return window.BeaPop.handleLogin(event)">
          <div class="login-field"><label>Số điện thoại *</label><input type="tel" id="loginPhone" placeholder="0912 345 678" required autocomplete="tel"></div>
          <div class="login-field" id="nameField" style="display:none;"><label>Tên của bạn *</label><input type="text" id="loginName" placeholder="Tên hiển thị" autocomplete="name"></div>
          <div class="login-field" id="passwordField"><label>Mật khẩu *</label><div style="position:relative;"><input type="password" id="loginPassword" placeholder="Nhập mật khẩu" autocomplete="current-password"><button type="button" class="pwd-toggle" onclick="window.BeaPop.togglePassword('loginPassword',this)">👁</button></div></div>
          <div class="login-field" id="confirmPasswordField" style="display:none;"><label>Xác nhận mật khẩu *</label><div style="position:relative;"><input type="password" id="loginConfirmPassword" placeholder="Nhập lại mật khẩu"><button type="button" class="pwd-toggle" onclick="window.BeaPop.togglePassword('loginConfirmPassword',this)">👁</button></div></div>
          <button type="submit" class="login-btn" id="loginSubmitBtn">Đăng nhập</button>
        </form>
        <div class="login-perks" id="loginPerks"><div class="perk-item"><span>🎁</span> Tích điểm mỗi đơn</div><div class="perk-item"><span>💰</span> 100 điểm = giảm 50k</div><div class="perk-item"><span>🚀</span> Thăng hạng VIP</div></div>
      </div>`;
    document.body.appendChild(modal);
  }

  function createNavUser() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('navUserWrap')) return;
    const wrap = document.createElement('div'); wrap.id = 'navUserWrap';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:4px;';
    const user = Auth.getUser();
    if (user) {
      wrap.innerHTML = '<a href="account.html" id="navUserBtn" style="display:flex;align-items:center;gap:6px;text-decoration:none;padding:5px 12px;border-radius:8px;background:rgba(0,0,0,0.04);transition:all 0.2s;cursor:pointer;"><span style="font-size:0.85rem;">👤</span><span style="font-size:0.78rem;font-weight:600;color:var(--text-primary);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(user.name||user.phone)+'</span><span style="font-size:0.65rem;background:'+Auth.tierColor(user.tier)+';color:#fff;padding:2px 6px;border-radius:10px;font-weight:700;">'+user.points+'⭐</span></a>';
    } else {
      wrap.innerHTML = '<a onclick="window.BeaPop.openLogin()" id="navUserBtn" style="display:flex;align-items:center;gap:4px;text-decoration:none;padding:5px 12px;border-radius:8px;background:rgba(0,0,0,0.04);transition:all 0.2s;cursor:pointer;font-size:0.83rem;font-weight:500;color:var(--text-secondary);"><span>👤</span> Đăng nhập</a>';
    }
    const cartWrap = navLinks.querySelector('.nav-cart-wrap');
    if (cartWrap) navLinks.insertBefore(wrap, cartWrap); else navLinks.appendChild(wrap);
  }

  function injectStyles() {
    if (document.getElementById('beapopAuthStyles')) return;
    const s = document.createElement('style'); s.id = 'beapopAuthStyles';
    s.textContent = '#loginModal{display:none;position:fixed;inset:0;z-index:9999}#loginModal.active{display:flex;align-items:center;justify-content:center}.login-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px)}.login-box{position:relative;background:#fff;border-radius:20px;padding:36px 28px 28px;max-width:380px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:loginSlideUp .35s ease-out}@keyframes loginSlideUp{from{opacity:0;transform:translateY(30px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}.login-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#999;line-height:1}.login-header{text-align:center;margin-bottom:20px}.login-icon{font-size:2.5rem;margin-bottom:8px}.login-header h2{font-family:"Inter",sans-serif;font-size:1.3rem;font-weight:800;color:#1a1a1a;margin-bottom:4px}.login-header p{font-size:.8rem;color:#6b6b7b}.login-tabs{display:flex;gap:4px;background:rgba(0,0,0,0.04);border-radius:10px;padding:3px;margin-bottom:18px}.login-tab{flex:1;padding:8px 12px;border:none;border-radius:8px;background:transparent;font-size:.82rem;font-weight:600;color:#6b6b7b;cursor:pointer;font-family:"Inter",sans-serif;transition:all .2s}.login-tab.active{background:#1a1a1a;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.12)}.login-error{padding:10px 14px;border-radius:10px;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.15);color:#dc2626;font-size:.8rem;font-weight:500;margin-bottom:14px;display:flex;align-items:center;gap:8px;animation:shakeError .4s ease}.login-error.success{background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.15);color:#059669}@keyframes shakeError{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}.login-field{margin-bottom:14px}.login-field label{display:block;font-size:.75rem;font-weight:600;color:#6b6b7b;margin-bottom:5px}.login-field input{width:100%;padding:11px 14px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-size:.9rem;font-family:"Inter",sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}.login-field input:focus{border-color:#1a1a1a;box-shadow:0 0 0 3px rgba(0,0,0,0.06)}.login-field input.has-error{border-color:#dc2626;box-shadow:0 0 0 3px rgba(224,85,85,0.1)}.pwd-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:.85rem;padding:4px;opacity:.5;transition:opacity .2s}.pwd-toggle:hover{opacity:1}.login-btn{width:100%;padding:13px;background:#1a1a1a;color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:700;font-family:"Inter",sans-serif;cursor:pointer;transition:all .2s;margin-top:4px}.login-btn:hover{background:#333;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}.login-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}.login-forgot{text-align:center;margin-top:12px}.login-forgot a{font-size:.78rem;color:#6b6b7b;text-decoration:none;transition:color .2s}.login-forgot a:hover{color:#1a1a1a}.login-perks{display:flex;justify-content:center;gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06)}.perk-item{font-size:.7rem;color:#6b6b7b;text-align:center}.perk-item span{display:block;font-size:1.1rem;margin-bottom:2px}';
    document.head.appendChild(s);
  }

  window.BeaPop = {
    Auth,
    openLogin() { createLoginModal(); this.switchMode('login'); document.getElementById('loginModal').classList.add('active'); document.body.style.overflow='hidden'; setTimeout(()=>document.getElementById('loginPhone')?.focus(),100); },
    closeLogin() { const m=document.getElementById('loginModal'); if(m) m.classList.remove('active'); document.body.style.overflow=''; this.clearError(); },

    switchMode(mode) {
      currentMode = mode;
      const lf=document.getElementById('loginForm'),tabs=document.getElementById('loginTabs');
      const title=document.getElementById('loginTitle'),sub=document.getElementById('loginSubtitle');
      const nf=document.getElementById('nameField'),pf=document.getElementById('passwordField'),cf=document.getElementById('confirmPasswordField'),btn=document.getElementById('loginSubmitBtn');
      this.clearError();
      if(mode==='login'){lf.style.display='';tabs.style.display='flex';title.textContent='Đăng nhập';sub.textContent='Tích điểm & nhận ưu đãi mỗi đơn hàng';nf.style.display='none';pf.style.display='';cf.style.display='none';btn.textContent='Đăng nhập';document.querySelectorAll('.login-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode==='login'));}
      else if(mode==='register'){lf.style.display='';tabs.style.display='flex';title.textContent='Tạo tài khoản';sub.textContent='Đăng ký để tích điểm & nhận ưu đãi';nf.style.display='';pf.style.display='';cf.style.display='';btn.textContent='Đăng ký';document.querySelectorAll('.login-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode==='register'));}
    },

    showError(msg,ok){const el=document.getElementById('loginError');if(!el)return;el.textContent=(ok?'✅ ':'❌ ')+msg;el.className='login-error'+(ok?' success':'');el.style.display='flex';},
    clearError(){const el=document.getElementById('loginError');if(el)el.style.display='none';document.querySelectorAll('.login-field input.has-error').forEach(i=>i.classList.remove('has-error'));},
    togglePassword(id,btn){const inp=document.getElementById(id);if(!inp)return;inp.type=inp.type==='password'?'text':'password';btn.textContent=inp.type==='password'?'👁':'🙈';},

    async handleLogin(e) {
      e.preventDefault(); this.clearError();
      const phone=document.getElementById('loginPhone').value.trim(), password=document.getElementById('loginPassword').value;
      if(currentMode==='register'){
        const name=document.getElementById('loginName').value.trim(),confirmPw=document.getElementById('loginConfirmPassword').value;
        if(!name){document.getElementById('loginName').classList.add('has-error');this.showError('Vui lòng nhập tên');return false;}
        if(password!==confirmPw){document.getElementById('loginConfirmPassword').classList.add('has-error');this.showError('Mật khẩu xác nhận không khớp');return false;}
        const r=await Auth.register(phone,name,password);
        if(r.success){this.closeLogin();const old=document.getElementById('navUserWrap');if(old)old.remove();createNavUser();this.toast('🎉 Đăng ký thành công! Chào mừng '+(r.user.name||r.user.phone));}
        else{if(r.error==='INVALID_PHONE')document.getElementById('loginPhone').classList.add('has-error');if(r.error==='WEAK_PASSWORD')document.getElementById('loginPassword').classList.add('has-error');this.showError(r.error||'Có lỗi xảy ra');}
      } else {
        const r=await Auth.login(phone,password);
        if(r.success){this.closeLogin();const old=document.getElementById('navUserWrap');if(old)old.remove();createNavUser();this.toast('Xin chào '+(r.user.name||r.user.phone)+'! '+Auth.tierLabel(r.user.tier));}
        else{this.showError(r.error||'Có lỗi xảy ra');}
      }
      return false;
    },

    handleLogout(){Auth.logout();const old=document.getElementById('navUserWrap');if(old)old.remove();createNavUser();this.toast('Đã đăng xuất');},

    toast(msg){const t=document.createElement('div');t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:12px;font-size:0.85rem;font-weight:600;z-index:10000;animation:loginSlideUp .3s ease-out;box-shadow:0 8px 30px rgba(0,0,0,0.2);max-width:90%;text-align:center;';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';},2500);setTimeout(()=>t.remove(),3000);},

    init(){injectStyles();createNavUser();}
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>window.BeaPop.init());
  else window.BeaPop.init();
})();
