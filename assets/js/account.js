/**
 * BeaPop Account Page
 * Handles user account display, tier management, points, vouchers, and settings
 */

document.addEventListener('DOMContentLoaded', function() {
  renderAccount();
});

/**
 * Change password handler
 */
function handleChangePassword() {
  const oldPwd = document.getElementById('oldPassword').value;
  const newPwd = document.getElementById('newPassword').value;
  const confirmPwd = document.getElementById('confirmPassword').value;
  const resultEl = document.getElementById('changePasswordResult');

  if (!oldPwd || !newPwd || !confirmPwd) {
    resultEl.textContent = '❌ Vui lòng điền đầy đủ thông tin';
    resultEl.className = 'form-result error';
    return;
  }
  if (newPwd.length < 4) {
    resultEl.textContent = '❌ Mật khẩu mới phải có ít nhất 4 ký tự';
    resultEl.className = 'form-result error';
    return;
  }
  if (newPwd !== confirmPwd) {
    resultEl.textContent = '❌ Mật khẩu xác nhận không khớp';
    resultEl.className = 'form-result error';
    return;
  }

  window.BeaPop.Auth.changePassword(oldPwd, newPwd).then(r => {
    if (r.success) {
      resultEl.textContent = '✅ Đổi mật khẩu thành công!';
      resultEl.className = 'form-result success';
      document.getElementById('oldPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      if (window.BeaUI) BeaUI.ErrorBoundary.show('Đổi mật khẩu thành công!', 'success', 3000);
    } else {
      const msg = r.error === 'WRONG_PASSWORD' ? 'Mật khẩu cũ không đúng' : r.error === 'NETWORK_ERROR' ? 'Không thể kết nối server' : 'Có lỗi xảy ra';
      resultEl.textContent = '❌ ' + msg;
      resultEl.className = 'form-result error';
      if (window.BeaUI) BeaUI.ErrorBoundary.show(msg, 'error', 4000);
    }
  });
}

/**
 * Change PIN handler
 */
function handleChangePin() {
  const pwd = document.getElementById('pinPassword').value;
  const newPin = document.getElementById('newPin').value;
  const confirmPin = document.getElementById('confirmPin').value;
  const resultEl = document.getElementById('changePinResult');

  if (!pwd || !newPin || !confirmPin) {
    resultEl.textContent = '❌ Vui lòng điền đầy đủ thông tin';
    resultEl.className = 'form-result error';
    return;
  }
  if (!/^\d{4,6}$/.test(newPin)) {
    resultEl.textContent = '❌ PIN phải là 4-6 chữ số';
    resultEl.className = 'form-result error';
    return;
  }
  if (newPin !== confirmPin) {
    resultEl.textContent = '❌ PIN xác nhận không khớp';
    resultEl.className = 'form-result error';
    return;
  }

  window.BeaPop.Auth.changePin(pwd, newPin).then(r => {
    if (r.success) {
      resultEl.textContent = '✅ Đổi PIN thành công!';
      resultEl.className = 'form-result success';
      document.getElementById('pinPassword').value = '';
      document.getElementById('newPin').value = '';
      document.getElementById('confirmPin').value = '';
    } else {
      resultEl.textContent = r.error === 'WRONG_PASSWORD' ? '❌ Mật khẩu không đúng' : '❌ Có lỗi xảy ra';
      resultEl.className = 'form-result error';
    }
  });
}

/**
 * Copy voucher code to clipboard
 */
function copyVoucherCode(code, btn) {
  navigator.clipboard.writeText(code).then(function() {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#1a8a5e';
    btn.style.color = '#fff';
    setTimeout(function() {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1500);
  }).catch(function() {
    alert('Không thể sao chép. Vui lòng copy thủ công: ' + code);
  });
}

/**
 * Render account page content
 */
async function renderAccount() {
  const container = document.getElementById('accountContent');

  // Show skeleton while waiting for auth.js to hydrate
  if (window.BeaUI) container.innerHTML = '<div class="account-section">' + BeaUI.Skeleton.profile() + '</div>';

  const user = window.BeaPop?.Auth?.getUser();

  if (!user) {
    container.innerHTML = `
      <div class="not-logged-in">
        <div style="font-size:4rem;margin-bottom:16px;">👤</div>
        <h2>Chưa đăng nhập</h2>
        <p>Đăng nhập để tích điểm, nhận ưu đãi<br>và theo dõi đơn hàng</p>
        <button class="btn-login-big" onclick="window.BeaPop.openLogin()">Đăng nhập ngay</button>
      </div>
    `;
    return;
  }

  const Auth = window.BeaPop.Auth;
  const log = Auth.getPointsLog();
  const tier = user.tier || 'bronze';
  const nextTier = tier === 'bronze' ? 'Silver' : tier === 'silver' ? 'Gold' : 'Max';
  const nextPoints = tier === 'bronze' ? 100 : tier === 'silver' ? 500 : user.points;
  const progress = tier === 'gold' ? 100 : Math.min(100, Math.round((user.points / nextPoints) * 100));

  container.innerHTML = `
    <div class="account-header">
      <div class="account-avatar">👤</div>
      <div class="account-name">${user.name || 'Khách hàng'}</div>
      <div class="account-phone">${user.phone}</div>
    </div>

    <div class="tier-card ${tier}">
      <div class="tier-badge">${Auth.tierLabel(tier)}</div>
      <div class="points-big">${user.points.toLocaleString('vi-VN')}</div>
      <div class="points-label">điểm tích luỹ</div>
      ${tier !== 'gold' ? `
      <div class="tier-progress">
        <div class="tier-next">
          <span>Lên hạng ${nextTier}</span>
          <span>${user.points}/${nextPoints} điểm</span>
        </div>
        <div class="tier-progress-bar">
          <div class="tier-progress-fill" style="width:${progress}%"></div>
        </div>
      </div>` : `<div style="font-size:0.75rem;color:#b8860b;margin-top:8px;font-weight:600;">🎉 Hạng cao nhất — x2 điểm mỗi đơn!</div>`}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${user.orderCount || 0}</div>
        <div class="stat-label">Đơn hàng</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${user.totalSpent ? new Intl.NumberFormat('vi-VN', {notation: 'compact'}).format(user.totalSpent) : '0'}₫</div>
        <div class="stat-label">Tổng chi tiêu</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.floor(user.points / 100) * 50}k₫</div>
        <div class="stat-label">Có thể giảm</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title"><span>🎁</span> Quyền lợi hạng ${Auth.tierLabel(tier)}</div>
      <div class="perk-row">
        <div class="perk-icon">⭐</div>
        <div class="perk-text">
          <strong>x${Auth.tierMultiplier(tier)} điểm mỗi đơn</strong>
          <small>Mỗi 10.000₫ = ${Auth.tierMultiplier(tier)} điểm</small>
        </div>
      </div>
      ${tier !== 'bronze' ? `
      <div class="perk-row">
        <div class="perk-icon">🚚</div>
        <div class="perk-text">
          <strong>Freeship mọi đơn</strong>
          <small>Không giới hạn giá trị</small>
        </div>
      </div>` : ''}
      ${tier === 'gold' ? `
      <div class="perk-row">
        <div class="perk-icon">👑</div>
        <div class="perk-text">
          <strong>Ưu đãi riêng</strong>
          <small>Sale sớm, quà sinh nhật, deal VIP</small>
        </div>
      </div>` : ''}
      <div class="perk-row">
        <div class="perk-icon">💰</div>
        <div class="perk-text">
          <strong>Đổi 100 điểm = giảm 50.000₫</strong>
          <small>Áp dụng khi thanh toán</small>
        </div>
      </div>
    </div>

    <!-- 🎯 Mục Tiêu Thưởng -->
    <div class="section-card">
      <div class="section-title"><span>🎯</span> Mục Tiêu Thưởng</div>
      <div class="milestone-list">
        ${Auth.getMilestones().map(function(m, idx) {
          const milestoneSpent = user.totalSpent || 0;
          const earned = milestoneSpent >= m.target;
          const prevTarget = idx === 0 ? 0 : Auth.getMilestones()[idx - 1].target;
          const isNext = !earned && milestoneSpent >= prevTarget;
          const statusClass = earned ? 'achieved' : isNext ? 'next' : 'locked';
          const icon = earned ? '✅' : isNext ? '🔥' : '🔒';
          const progress = isNext && prevTarget < m.target
            ? Math.min(100, Math.round(((milestoneSpent - prevTarget) / (m.target - prevTarget)) * 100))
            : (earned ? 100 : 0);
          return '<div class="milestone-item ' + statusClass + '">' +
            '<div class="milestone-icon">' + icon + '</div>' +
            '<div class="milestone-info">' +
              '<div class="milestone-info-top">' +
                '<span class="milestone-target">' + new Intl.NumberFormat('vi-VN').format(m.target) + '₫</span>' +
                '<span class="milestone-reward">' + m.voucher.label + '</span>' +
              '</div>' +
              (isNext ? '<div class="milestone-progress-bar"><div class="milestone-progress-fill" style="width:' + progress + '%"></div></div>' : '') +
            '</div>' +
          '</div>';
        }).join('')}
      </div>
    </div>

    <!-- 🎟️ Voucher Của Tôi -->
    <div class="section-card">
      <div class="section-title"><span>🎟️</span> Voucher Của Tôi</div>
      ${function() {
        const vouchers = Auth.getVouchers();
        if (vouchers.length === 0) {
          return '<div style="text-align:center;color:#9a9aaa;font-size:0.8rem;padding:16px 0;">Mua hàng để mở khoá voucher giảm giá 🎁</div>';
        }
        return vouchers.map(function(v) {
          const statusClass = v.used ? 'used' : 'available';
          const statusText = v.used ? 'Đã dùng ' + new Date(v.usedAt).toLocaleDateString('vi-VN') : 'Sẵn dùng';
          const valueDisplay = v.type === 'percent'
            ? (v.max ? v.value + '% (≤' + new Intl.NumberFormat('vi-VN').format(v.max) + '₫)' : v.value + '%')
            : new Intl.NumberFormat('vi-VN').format(v.value) + '₫';
          return '<div class="voucher-card ' + statusClass + '">' +
            '<div class="voucher-left"><div class="voucher-value">' + valueDisplay + '</div></div>' +
            '<div class="voucher-right">' +
              '<div>' +
                '<div class="voucher-code">' + v.code + '</div>' +
                '<div class="voucher-desc">' + v.label + '</div>' +
                '<div class="voucher-status">' + statusText + '</div>' +
              '</div>' +
              (!v.used ? '<button class="voucher-copy-btn" onclick="copyVoucherCode(\'' + v.code + '\', this)">Copy</button>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      }()}
    </div>

    <div class="section-card">
      <div class="section-title"><span>📋</span> Lịch sử điểm</div>
      ${log.length === 0 ? '<div style="text-align:center;color:#9a9aaa;font-size:0.8rem;padding:16px 0;">Chưa có giao dịch điểm</div>' :
        log.slice(0, 10).map(function(item) {
          const d = new Date(item.date);
          const dateStr = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
          return '<div class="points-log-item">' +
            '<div class="log-info"><div class="log-note">' + item.note + '</div><div class="log-date">' + dateStr + '</div></div>' +
            '<div class="log-amount ' + item.type + '">' + (item.type === 'earn' ? '+' : '-') + item.amount + ' ⭐</div></div>';
        }).join('')
      }
    </div>

    <!-- Change Password Form -->
    <div class="section-card">
      <div class="section-title"><span>🔐</span> Đổi mật khẩu</div>
      <div class="change-form">
        <input type="password" id="oldPassword" placeholder="Mật khẩu hiện tại" autocomplete="current-password">
        <input type="password" id="newPassword" placeholder="Mật khẩu mới (ít nhất 4 ký tự)" autocomplete="new-password">
        <input type="password" id="confirmPassword" placeholder="Xác nhận mật khẩu mới" autocomplete="new-password">
        <button type="button" class="btn-change" onclick="handleChangePassword()">Đổi mật khẩu</button>
        <div id="changePasswordResult"></div>
      </div>
    </div>

    <!-- Change PIN Form -->
    <div class="section-card">
      <div class="section-title"><span>🔢</span> Đổi mã PIN bảo mật</div>
      <div class="change-form">
        <input type="password" id="pinPassword" placeholder="Mật khẩu hiện tại để xác nhận" autocomplete="current-password">
        <input type="password" id="newPin" placeholder="PIN mới (4-6 số)" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}">
        <input type="password" id="confirmPin" placeholder="Xác nhận PIN mới" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}">
        <button type="button" class="btn-change" onclick="handleChangePin()">Đổi PIN</button>
        <div id="changePinResult"></div>
      </div>
    </div>

    <button class="btn-logout" onclick="window.BeaPop.handleLogout(); renderAccount();">Đăng xuất</button>
  `;
}

// Make functions globally available
window.handleChangePassword = handleChangePassword;
window.handleChangePin = handleChangePin;
window.copyVoucherCode = copyVoucherCode;
window.renderAccount = renderAccount;
