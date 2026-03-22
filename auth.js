/* ========================================================
   BeaPop Auth & Loyalty Points System
   LocalStorage MVP — No backend required
   ======================================================== */

(function() {
  'use strict';

  const STORAGE_KEY = 'beapop_user';
  const POINTS_LOG_KEY = 'beapop_points_log';
  const USERS_DB_KEY = 'beapop_users_db';

  /* ---- DATA LAYER ---- */
  const Auth = {
    getUser() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
      catch(e) { return null; }
    },

    isLoggedIn() {
      return !!this.getUser();
    },

    login(phone, name) {
      phone = phone.replace(/\D/g, '');
      if (phone.length < 9) return null;

      // Check if user exists in DB
      const db = this.getAllUsers();
      let user = db[phone];

      if (!user) {
        user = {
          phone: phone,
          name: name || '',
          points: 0,
          tier: 'bronze',
          totalSpent: 0,
          orderCount: 0,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
      } else {
        if (name) user.name = name;
        user.lastLogin = new Date().toISOString();
      }

      // Save to session
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      // Save to users DB
      db[phone] = user;
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));

      return user;
    },

    logout() {
      localStorage.removeItem(STORAGE_KEY);
    },

    updateProfile(data) {
      const user = this.getUser();
      if (!user) return null;
      Object.assign(user, data);
      user.tier = this.calcTier(user.points);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      // Sync to DB
      const db = this.getAllUsers();
      db[user.phone] = user;
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
      return user;
    },

    getAllUsers() {
      try { return JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {}; }
      catch(e) { return {}; }
    },

    /* ---- POINTS ---- */
    calcTier(points) {
      if (points >= 500) return 'gold';
      if (points >= 100) return 'silver';
      return 'bronze';
    },

    tierMultiplier(tier) {
      if (tier === 'gold') return 2;
      if (tier === 'silver') return 1.5;
      return 1;
    },

    tierLabel(tier) {
      const map = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold' };
      return map[tier] || '🥉 Bronze';
    },

    tierColor(tier) {
      const map = { bronze: '#cd7f32', silver: '#a0a0a0', gold: '#d4a017' };
      return map[tier] || '#cd7f32';
    },

    earnPoints(amount) {
      const user = this.getUser();
      if (!user) return 0;
      const multiplier = this.tierMultiplier(user.tier);
      const earned = Math.floor((amount / 10000) * multiplier);
      if (earned <= 0) return 0;

      user.points += earned;
      user.totalSpent += amount;
      user.orderCount += 1;
      user.tier = this.calcTier(user.points);

      this.updateProfile(user);
      this.logPoints('earn', earned, 'Đơn hàng ' + new Intl.NumberFormat('vi-VN').format(amount) + '₫');
      return earned;
    },

    redeemPoints(points) {
      const user = this.getUser();
      if (!user || user.points < points) return false;
      const discount = Math.floor(points / 100) * 50000;
      user.points -= Math.floor(points / 100) * 100;
      this.updateProfile(user);
      this.logPoints('redeem', Math.floor(points / 100) * 100, 'Giảm ' + new Intl.NumberFormat('vi-VN').format(discount) + '₫');
      return discount;
    },

    logPoints(type, amount, note) {
      try {
        const log = JSON.parse(localStorage.getItem(POINTS_LOG_KEY)) || [];
        log.unshift({ type, amount, note, date: new Date().toISOString() });
        if (log.length > 100) log.length = 100;
        localStorage.setItem(POINTS_LOG_KEY, JSON.stringify(log));
      } catch(e) {}
    },

    getPointsLog() {
      try { return JSON.parse(localStorage.getItem(POINTS_LOG_KEY)) || []; }
      catch(e) { return []; }
    }
  };

  /* ---- LOGIN MODAL ---- */
  function createLoginModal() {
    if (document.getElementById('loginModal')) return;
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.innerHTML = `
      <div class="login-overlay" onclick="window.BeaPop.closeLogin()"></div>
      <div class="login-box">
        <button class="login-close" onclick="window.BeaPop.closeLogin()">&times;</button>
        <div class="login-header">
          <div class="login-icon">👤</div>
          <h2>Đăng nhập BeaPop</h2>
          <p>Tích điểm & nhận ưu đãi mỗi đơn hàng</p>
        </div>
        <form id="loginForm" onsubmit="return window.BeaPop.handleLogin(event)">
          <div class="login-field">
            <label>Số điện thoại *</label>
            <input type="tel" id="loginPhone" placeholder="0912 345 678" required pattern="[0-9]{9,11}" autocomplete="tel">
          </div>
          <div class="login-field">
            <label>Tên của bạn</label>
            <input type="text" id="loginName" placeholder="Tên hiển thị" autocomplete="name">
          </div>
          <button type="submit" class="login-btn">Đăng nhập</button>
        </form>
        <div class="login-perks">
          <div class="perk-item"><span>🎁</span> Tích điểm mỗi đơn</div>
          <div class="perk-item"><span>💰</span> 100 điểm = giảm 50k</div>
          <div class="perk-item"><span>🚀</span> Thăng hạng VIP</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /* ---- NAV USER BUTTON ---- */
  function createNavUser() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('navUserWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'navUserWrap';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:4px;';

    const user = Auth.getUser();
    if (user) {
      wrap.innerHTML = `
        <a href="account.html" id="navUserBtn" style="display:flex;align-items:center;gap:6px;text-decoration:none;padding:5px 12px;border-radius:8px;background:rgba(0,0,0,0.04);transition:all 0.2s;cursor:pointer;">
          <span style="font-size:0.85rem;">👤</span>
          <span style="font-size:0.78rem;font-weight:600;color:var(--text-primary);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.name || user.phone}</span>
          <span style="font-size:0.65rem;background:${Auth.tierColor(user.tier)};color:#fff;padding:2px 6px;border-radius:10px;font-weight:700;">${user.points}⭐</span>
        </a>
      `;
    } else {
      wrap.innerHTML = `
        <a onclick="window.BeaPop.openLogin()" id="navUserBtn" style="display:flex;align-items:center;gap:4px;text-decoration:none;padding:5px 12px;border-radius:8px;background:rgba(0,0,0,0.04);transition:all 0.2s;cursor:pointer;font-size:0.83rem;font-weight:500;color:var(--text-secondary);">
          <span>👤</span> Đăng nhập
        </a>
      `;
    }

    // Insert before cart
    const cartWrap = navLinks.querySelector('.nav-cart-wrap');
    if (cartWrap) {
      navLinks.insertBefore(wrap, cartWrap);
    } else {
      navLinks.appendChild(wrap);
    }
  }

  /* ---- INJECT STYLES ---- */
  function injectStyles() {
    if (document.getElementById('beapopAuthStyles')) return;
    const style = document.createElement('style');
    style.id = 'beapopAuthStyles';
    style.textContent = `
      #loginModal { display:none; position:fixed; inset:0; z-index:9999; }
      #loginModal.active { display:flex; align-items:center; justify-content:center; }
      .login-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); }
      .login-box { position:relative; background:#fff; border-radius:20px; padding:36px 28px 28px; max-width:380px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.15); animation:loginSlideUp 0.35s ease-out; }
      @keyframes loginSlideUp { from{opacity:0;transform:translateY(30px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      .login-close { position:absolute; top:12px; right:14px; background:none; border:none; font-size:1.5rem; cursor:pointer; color:#999; line-height:1; }
      .login-header { text-align:center; margin-bottom:24px; }
      .login-icon { font-size:2.5rem; margin-bottom:8px; }
      .login-header h2 { font-family:'Inter',sans-serif; font-size:1.3rem; font-weight:800; color:#1a1a1a; margin-bottom:4px; }
      .login-header p { font-size:0.8rem; color:#6b6b7b; }
      .login-field { margin-bottom:14px; }
      .login-field label { display:block; font-size:0.75rem; font-weight:600; color:#6b6b7b; margin-bottom:5px; }
      .login-field input { width:100%; padding:11px 14px; border-radius:10px; border:1px solid rgba(0,0,0,0.1); font-size:0.9rem; font-family:'Inter',sans-serif; outline:none; transition:border-color 0.2s,box-shadow 0.2s; }
      .login-field input:focus { border-color:#1a1a1a; box-shadow:0 0 0 3px rgba(0,0,0,0.06); }
      .login-btn { width:100%; padding:13px; background:#1a1a1a; color:#fff; border:none; border-radius:10px; font-size:0.9rem; font-weight:700; font-family:'Inter',sans-serif; cursor:pointer; transition:all 0.2s; margin-top:4px; }
      .login-btn:hover { background:#333; transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.15); }
      .login-perks { display:flex; justify-content:center; gap:16px; margin-top:20px; padding-top:16px; border-top:1px solid rgba(0,0,0,0.06); }
      .perk-item { font-size:0.7rem; color:#6b6b7b; text-align:center; }
      .perk-item span { display:block; font-size:1.1rem; margin-bottom:2px; }
    `;
    document.head.appendChild(style);
  }

  /* ---- PUBLIC API ---- */
  window.BeaPop = {
    Auth: Auth,

    openLogin() {
      createLoginModal();
      document.getElementById('loginModal').classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('loginPhone')?.focus(), 100);
    },

    closeLogin() {
      const m = document.getElementById('loginModal');
      if (m) m.classList.remove('active');
      document.body.style.overflow = '';
    },

    handleLogin(e) {
      e.preventDefault();
      const phone = document.getElementById('loginPhone').value.trim();
      const name = document.getElementById('loginName').value.trim();
      const user = Auth.login(phone, name);
      if (user) {
        this.closeLogin();
        // Refresh nav
        const old = document.getElementById('navUserWrap');
        if (old) old.remove();
        createNavUser();
        // Show welcome toast
        this.toast('Xin chào ' + (user.name || user.phone) + '! ' + Auth.tierLabel(user.tier));
      }
      return false;
    },

    handleLogout() {
      Auth.logout();
      const old = document.getElementById('navUserWrap');
      if (old) old.remove();
      createNavUser();
      this.toast('Đã đăng xuất');
    },

    toast(msg) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:12px;font-size:0.85rem;font-weight:600;z-index:10000;animation:loginSlideUp 0.3s ease-out;box-shadow:0 8px 30px rgba(0,0,0,0.2);';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 2500);
      setTimeout(() => t.remove(), 3000);
    },

    init() {
      injectStyles();
      createNavUser();
    }
  };

  // Auto init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.BeaPop.init());
  } else {
    window.BeaPop.init();
  }
})();
