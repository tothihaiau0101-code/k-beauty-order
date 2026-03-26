/**
 * BeaPop Auth Page
 * Handles login and registration functionality
 */

const API_BASE = 'https://beapop-api.beapop.workers.dev';

/**
 * Switch between login and register tabs
 */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  if (tab === 'login') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }

  // Clear messages
  document.querySelectorAll('.error-msg, .success-msg').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

/**
 * Validate Vietnamese phone number format
 */
function validatePhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return /^0[0-9]{9}$/.test(cleaned);
}

/**
 * Login handler
 */
async function handleLogin(event) {
  event.preventDefault();

  const phone = document.getElementById('loginPhone').value.replace(/[^0-9]/g, '');
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  const successEl = document.getElementById('loginSuccess');

  // Validate
  if (!validatePhone(phone)) {
    errorEl.textContent = 'Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0)';
    errorEl.style.display = 'block';
    return;
  }

  if (password.length < 4) {
    errorEl.textContent = 'Mật khẩu phải có ít nhất 4 ký tự';
    errorEl.style.display = 'block';
    return;
  }

  // Submit
  btn.disabled = true;
  btn.textContent = 'Đang kiểm tra...';
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      // Store token and user data
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));

      successEl.textContent = 'Đăng nhập thành công! Đang chuyển...';
      successEl.style.display = 'block';

      // Redirect after short delay
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'account.html';
        window.location.href = redirect;
      }, 1000);
    } else {
      errorEl.textContent = data.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      errorEl.style.display = 'block';
    }
  } catch (e) {
    errorEl.textContent = 'Không thể kết nối đến server. Vui lòng thử lại sau.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng Nhập';
  }
}

/**
 * Register handler
 */
async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const phone = document.getElementById('registerPhone').value.replace(/[^0-9]/g, '');
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  const btn = document.getElementById('registerBtn');
  const errorEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');

  // Validate
  if (name.length < 2) {
    errorEl.textContent = 'Họ tên phải có ít nhất 2 ký tự';
    errorEl.style.display = 'block';
    return;
  }

  if (!validatePhone(phone)) {
    errorEl.textContent = 'Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0)';
    errorEl.style.display = 'block';
    return;
  }

  if (password.length < 4) {
    errorEl.textContent = 'Mật khẩu phải có ít nhất 4 ký tự';
    errorEl.style.display = 'block';
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'Mật khẩu xác nhận không khớp';
    errorEl.style.display = 'block';
    return;
  }

  // Submit
  btn.disabled = true;
  btn.textContent = 'Đang tạo tài khoản...';
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      // Store token and user data
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));

      successEl.textContent = 'Đăng ký thành công! Đang chuyển...';
      successEl.style.display = 'block';

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = 'account.html';
      }, 1000);
    } else {
      errorEl.textContent = data.error || 'Đăng ký thất bại. Số điện thoại có thể đã được sử dụng.';
      errorEl.style.display = 'block';
    }
  } catch (e) {
    errorEl.textContent = 'Không thể kết nối đến server. Vui lòng thử lại sau.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng Ký';
  }
}

// Check if already logged in on page load
(function() {
  const token = localStorage.getItem('customerToken');
  if (token) {
    // Already logged in, redirect to account
    window.location.href = 'account.html';
  }
})();

// Make functions globally available
window.switchTab = switchTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
