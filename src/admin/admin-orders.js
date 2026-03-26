// Orders - Orders tab logic for admin panel

import { API, apiFetch, STATUS_MAP, formatVND } from './utils.js';

let allOrders = [];
let currentSort = { key: 'created_at', asc: false };

/**
 * Initialize orders tab
 * @param {Object} options - Options with callbacks
 */
export function initOrders(options = {}) {
  allOrders = [];
  currentSort = { key: 'created_at', asc: false };

  if (options.onOrdersLoaded) {
    window._ordersCallback = options.onOrdersLoaded;
  }

  if (options.onStatsLoaded) {
    window._statsCallback = options.onStatsLoaded;
  }

  if (options.onEmptyState) {
    window._emptyStateCallback = options.onEmptyState;
  }

  return {
    loadData,
    renderTable,
    sortBy,
    openModal,
    closeModal,
    updateStatus,
    exportCSV,
    getAllOrders: () => allOrders
  };
}

/**
 * Load orders and stats from API
 */
async function loadData() {
  // Skeleton: KPI row + table rows
  const kpiRow = document.getElementById('kpiRow');
  const tbody = document.getElementById('orderBody');
  if (kpiRow && window.BeaUI) kpiRow.innerHTML = BeaUI.Skeleton.kpiRow();
  if (tbody && window.BeaUI) tbody.innerHTML = `<tr class="bea-sk-dark">${
    Array(6).fill('<td style="padding:12px 14px"><div class="bea-sk" style="height:13px;border-radius:6px"></div></td>').join('')
  }</tr>`.repeat(5);

  try {
    const [ordersRes, statsRes] = await Promise.all([
      apiFetch(`${API}/api/orders`),
      apiFetch(`${API}/api/stats`)
    ]);
    if (ordersRes.ok) {
      const data = await ordersRes.json();
      allOrders = data.orders || data;
      renderTable();
      if (window._ordersCallback) window._ordersCallback(allOrders);
    } else {
      throw new Error('orders_' + ordersRes.status);
    }
    if (statsRes.ok) {
      const s = await statsRes.json();
      if (window._statsCallback) window._statsCallback({
        total_orders: s.totalOrders || s.total_orders || 0,
        pending: s.pendingOrders || s.pending || 0,
        shipping: s.shippingOrders || s.shipping || 0,
        revenue: s.totalRevenue || s.revenue || 0
      });
    }
    const lastRefreshEl = document.getElementById('lastRefresh');
    if (lastRefreshEl) lastRefreshEl.textContent = `Cập nhật: ${new Date().toLocaleTimeString('vi')}`;
  } catch (e) {
    if (e.message === 'orders_401') {
      // Token expired — redirect to login
      if (window.BeaUI) BeaUI.ErrorBoundary.show('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'warning', 3000);
      setTimeout(() => window.location.href = 'login.html', 3000);
      return;
    }
    if (window.BeaUI) {
      BeaUI.ErrorBoundary.show('Không thể tải dữ liệu đơn hàng', 'error', 6000);
    }
    if (window._emptyStateCallback) {
      window._emptyStateCallback({
        type: 'error',
        message: 'Không kết nối được server',
        hint: 'Kiểm tra kết nối mạng và thử lại'
      });
    }
  }
}

/**
 * Render orders table
 */
function renderTable() {
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const filterSt = filterStatus ? filterStatus.value : '';

  let filtered = allOrders.filter(o => {
    const name = (o.name || o.customer_name || '').toLowerCase();
    const phone = (o.phone || '').toLowerCase();
    const oid = (o.orderId || o.id || '').toLowerCase();
    const matchSearch = !search || name.includes(search) || phone.includes(search) || oid.includes(search);
    const matchStatus = !filterSt || (o.status || 'pending') === filterSt;
    return matchSearch && matchStatus;
  });

  // Sort
  filtered.sort((a, b) => {
    let va = a[currentSort.key] || '';
    let vb = b[currentSort.key] || '';
    if (currentSort.key === 'total') {
      va = parseFloat(a.total || a.total_amount || 0);
      vb = parseFloat(b.total || b.total_amount || 0);
    }
    if (va < vb) return currentSort.asc ? -1 : 1;
    if (va > vb) return currentSort.asc ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('orderBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  if (tbody) {
    tbody.innerHTML = filtered.map(o => {
      const oid = o.orderId || o.id || '—';
      const name = o.name || o.customer_name || '—';
      const phone = o.phone || '—';
      const total = o.total || o.total_amount || 0;
      const status = o.status || 'pending';
      const st = STATUS_MAP[status] || STATUS_MAP.pending;
      const time = o.created_at ? o.created_at.slice(0,16).replace('T',' ') : '—';
      return `<tr onclick="window._orders.openModal('${oid}')">
        <td><strong>${oid}</strong></td>
        <td>${name}</td>
        <td>${phone}</td>
        <td style="color:var(--accent-pink);font-weight:600">${formatVND(total)}</td>
        <td><span class="status-badge ${st.cls}">${st.icon} ${st.label}</span></td>
        <td style="color:var(--text-secondary)">${time}</td>
      </tr>`;
    }).join('');
  }
}

/**
 * Sort table by key
 * @param {string} key - Sort key
 */
function sortBy(key) {
  if (currentSort.key === key) currentSort.asc = !currentSort.asc;
  else { currentSort.key = key; currentSort.asc = true; }
  renderTable();
}

/**
 * Open order detail modal
 * @param {string} oid - Order ID
 */
function openModal(oid) {
  const o = allOrders.find(x => (x.orderId || x.id) === oid);
  if (!o) return;

  const status = o.status || 'pending';
  const st = STATUS_MAP[status] || STATUS_MAP.pending;
  const name = o.name || o.customer_name || '—';
  const total = o.total || o.total_amount || 0;
  const items = o.items || [];
  const time = o.created_at ? o.created_at.slice(0,16).replace('T',' ') : '—';

  let itemsHtml = '';
  if (items.length > 0) {
    itemsHtml = items.map(i =>
      `<div class="item-line">
        <span>▪️ ${i.name || 'Item'} x${i.qty || 1}</span>
        <span class="item-total">${formatVND((i.price || 0) * (i.qty || 1))}</span>
      </div>`
    ).join('');
  } else {
    const prod = o.products || '';
    itemsHtml = prod ? `<div class="item-line"><span>▪️ ${prod}</span></div>` : '<div style="color:var(--text-secondary)">Không có chi tiết</div>';
  }

  const statuses = ['pending','confirmed','shipping','completed','cancelled'];
  const statusBtns = statuses.map(s => {
    const sm = STATUS_MAP[s];
    const isActive = s === status ? 'active' : '';
    return `<button class="status-btn ${isActive}" onclick="window._orders.updateStatus('${oid}','${s}')">${sm.icon} ${sm.label}</button>`;
  }).join('');

  const modalContent = document.getElementById('modalContent');
  if (modalContent) {
    modalContent.innerHTML = `
      <button class="modal-close" onclick="window._orders.closeModal()">✕</button>
      <h2>📦 Đơn #${oid}</h2>
      <div class="modal-row"><span class="label">👤 Khách hàng</span><span class="value">${name}</span></div>
      <div class="modal-row"><span class="label">📞 Số điện thoại</span><span class="value">${o.phone || '—'}</span></div>
      <div class="modal-row"><span class="label">📍 Địa chỉ</span><span class="value">${o.address || '—'}</span></div>
      <div class="modal-row"><span class="label">🕐 Thời gian</span><span class="value">${time}</span></div>
      <div class="modal-row"><span class="label">📌 Trạng thái</span><span class="value"><span class="status-badge ${st.cls}">${st.icon} ${st.label}</span></span></div>
      <div class="modal-divider"></div>
      <div style="font-weight:600;font-size:0.85rem;margin-bottom:8px;">📦 Sản phẩm:</div>
      <div class="modal-items">${itemsHtml}</div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span class="label" style="font-weight:700;font-size:0.95rem;">💰 Tổng cộng</span><span class="value" style="font-size:1.1rem;color:var(--accent-pink);font-weight:800;">${formatVND(total)}</span></div>
      ${o.note ? `<div class="modal-row"><span class="label">📝 Ghi chú</span><span class="value">${o.note}</span></div>` : ''}
      <div class="modal-divider"></div>
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Đổi trạng thái:</div>
      <div class="status-actions">${statusBtns}</div>
    `;
  }
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.add('active');
}

/**
 * Close order detail modal
 */
function closeModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

/**
 * Update order status
 * @param {string} oid - Order ID
 * @param {string} newStatus - New status
 */
async function updateStatus(oid, newStatus) {
  try {
    const res = await apiFetch(`${API}/api/orders/${oid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      closeModal();
      await loadData();
      setTimeout(() => openModal(oid), 200);
    }
  } catch (e) {
    alert('Lỗi kết nối server');
  }
}

/**
 * Export orders to CSV
 */
function exportCSV() {
  if (allOrders.length === 0) return alert('Không có dữ liệu');
  const headers = ['Mã đơn','Ngày','Khách hàng','SĐT','Địa chỉ','Sản phẩm','Tổng tiền','Trạng thái'];
  const rows = allOrders.map(o => {
    const items = (o.items || []).map(i => `${i.name||''}x${i.qty||1}`).join('; ') || o.products || '';
    const status = o.status || 'pending';
    const statusLabel = STATUS_MAP[status]?.label || status;
    return [
      o.orderId || o.id || '',
      (o.created_at||'').slice(0,10),
      o.name || o.customer_name || '',
      o.phone || '',
      o.address || '',
      items,
      o.total || o.total_amount || 0,
      statusLabel
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `don-hang-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose globally for HTML onclick handlers
export { allOrders, currentSort, loadData, renderTable, sortBy, openModal, closeModal, updateStatus, exportCSV };
