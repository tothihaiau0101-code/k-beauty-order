// Analytics - Analytics, Loyalty, Customers tabs logic for admin panel

import { API, apiFetch, formatVND } from './utils.js';

let customerData = [];
let chartLoaded = false;

/**
 * Initialize analytics module
 * @param {Function} getOrders - Function to get all orders from orders module
 * @returns {Object} Analytics functions
 */
let _getOrders = () => [];

export function initAnalytics(getOrders) {
  customerData = [];
  chartLoaded = false;
  _getOrders = getOrders || (() => []);

  return {
    loadAnalytics,
    loadLoyalty,
    loadCustomers,
    renderCustomers,
    toggleChart,
    renderChart,
    getCustomerData: () => customerData
  };
}

/**
 * Load analytics data
 */
function loadAnalytics() {
  const orders = _getOrders();
  const total = orders.length || 1;
  const completed = orders.filter(o => o.status === 'completed').length;

  const convRateEl = document.getElementById('convRate');
  if (convRateEl) convRateEl.textContent = Math.round(completed / total * 100) + '%';

  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  const shipped = orders.filter(o => o.status === 'shipping' || o.status === 'completed').length;

  const deliveryRateEl = document.getElementById('deliveryRate');
  if (deliveryRateEl) {
    deliveryRateEl.textContent = shipped ? Math.round(completed / shipped * 100) + '%' : '—';
  }

  const cancelRateEl = document.getElementById('cancelRate');
  if (cancelRateEl) cancelRateEl.textContent = Math.round(cancelled / total * 100) + '%';

  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrderEl = document.getElementById('avgOrder');
  if (avgOrderEl) avgOrderEl.textContent = Math.round(revenue / total).toLocaleString('vi') + '₫';

  // Top products
  const prod = {};
  orders.forEach(o => (o.items || []).forEach(it => {
    prod[it.name] = (prod[it.name] || 0) + (it.qty || 1);
  }));
  const sorted = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topEl = document.getElementById('topProducts');
  if (topEl) {
    if (sorted.length) {
      topEl.innerHTML = sorted.map((p, i) => {
        const pct = Math.round(p[1] / (sorted[0][1] || 1) * 100);
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
            <span style="color:var(--text-primary);">${i+1}. ${p[0]}</span>
            <span style="color:#a855f7;font-weight:700;">${p[1]} sold</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;margin-top:4px;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#a855f7,#ec4899);border-radius:3px;"></div>
          </div>
        </div>`;
      }).join('');
    } else {
      topEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.82rem;">Chưa có dữ liệu sản phẩm</p>';
    }
  }

  // Weekly chart
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('vi', {weekday:'short'});
    const count = orders.filter(o => (o.created_at || '').startsWith(key)).length;
    days.push({label, count});
  }
  const maxD = Math.max(...days.map(d => d.count), 1);

  const weeklyChartEl = document.getElementById('weeklyChart');
  if (weeklyChartEl) {
    weeklyChartEl.innerHTML = days.map(d => {
      const h = Math.round(d.count / maxD * 120);
      return `<div style="flex:1;text-align:center;">
        <div style="height:${h || 4}px;background:linear-gradient(180deg,#a855f7,#7c3aed);border-radius:4px 4px 0 0;margin:0 auto;width:70%;min-height:4px;"></div>
        <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:6px;">${d.label}</div>
        <div style="font-size:0.7rem;color:#a855f7;font-weight:700;">${d.count}</div>
      </div>`;
    }).join('');
  }
}

/**
 * Load loyalty data
 */
function loadLoyalty() {
  const orders = _getOrders();
  const cust = {};

  orders.forEach(o => {
    const key = o.phone || o.name || 'Unknown';
    if (!cust[key]) cust[key] = { name: o.name || 'N/A', phone: o.phone || 'N/A', spent: 0 };
    cust[key].spent += o.total || 0;
  });

  const list = Object.values(cust).sort((a, b) => b.spent - a.spent);
  const body = document.getElementById('loyaltyBody');

  if (!body) return;

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">Chưa có dữ liệu khách hàng</td></tr>';
    return;
  }

  body.innerHTML = list.map(c => {
    const pts = Math.floor(c.spent / 10000);
    const tier = pts >= 200 ? ['💎 VIP', 'tier-gold'] : pts >= 100 ? ['🥇 Gold', 'tier-gold'] : pts >= 50 ? ['🥈 Silver', 'tier-silver'] : ['🥉 Bronze', 'tier-bronze'];
    return `<tr>
      <td style="font-weight:600;">${c.name}</td>
      <td>${c.phone}</td>
      <td style="color:#ff5a92;font-weight:600;">${c.spent.toLocaleString('vi')}₫</td>
      <td style="color:#a855f7;font-weight:700;">${pts} ⭐</td>
      <td><span class="tier-badge ${tier[1]}">${tier[0]}</span></td>
    </tr>`;
  }).join('');
}

/**
 * Load customers data
 */
async function loadCustomers() {
  try {
    const res = await apiFetch(`${API}/api/orders`);
    if (!res.ok) return;
    const orders = await res.json();

    const customerMap = new Map();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const o of orders) {
      const phone = o.phone || '';
      if (!phone) continue;

      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone: phone,
          name: o.name || o.customer_name || '—',
          orders: 0,
          totalSpent: 0,
          lastOrder: null
        });
      }

      const cust = customerMap.get(phone);
      cust.orders += 1;
      cust.totalSpent += parseFloat(o.total || o.total_amount || 0);

      const orderDate = o.created_at ? new Date(o.created_at) : null;
      if (orderDate && (!cust.lastOrder || orderDate > cust.lastOrder)) {
        cust.lastOrder = orderDate;
      }

      if (orderDate && orderDate < thirtyDaysAgo) {
        cust.isNew = false;
      }
    }

    for (const cust of customerMap.values()) {
      if (!cust.lastOrder || cust.lastOrder >= thirtyDaysAgo) {
        cust.isNew = true;
      }
    }

    customerData = Array.from(customerMap.values());
    renderCustomers();
  } catch(e) {
    console.error('Load customers error', e);
    const customerEmpty = document.getElementById('customerEmpty');
    if (customerEmpty) customerEmpty.style.display = 'block';
  }
}

/**
 * Get tier by orders count
 * @param {number} orders - Number of orders
 * @returns {Object} Tier info
 */
function getTier(orders) {
  if (orders >= 6) return { label: '🥇 Gold', cls: 'tier-gold' };
  if (orders >= 3) return { label: '🥈 Silver', cls: 'tier-silver' };
  return { label: '🥉 Bronze', cls: 'tier-bronze' };
}

/**
 * Render customers table
 */
function renderCustomers() {
  const searchInput = document.getElementById('customerSearch');
  const search = searchInput ? searchInput.value.toLowerCase() : '';

  let filtered = customerData.filter(c => {
    if (!search) return true;
    return (c.name || '').toLowerCase().includes(search) || (c.phone || '').toLowerCase().includes(search);
  });

  const totalCustomers = customerData.length;
  const newCustomers = customerData.filter(c => c.isNew).length;
  const vipCustomers = customerData.filter(c => c.orders >= 3).length;

  const custTotalEl = document.getElementById('custTotal');
  const custNewEl = document.getElementById('custNew');
  const custVipEl = document.getElementById('custVip');

  if (custTotalEl) custTotalEl.textContent = totalCustomers;
  if (custNewEl) custNewEl.textContent = newCustomers;
  if (custVipEl) custVipEl.textContent = vipCustomers;

  const tbody = document.getElementById('customerBody');
  const empty = document.getElementById('customerEmpty');

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  filtered.sort((a, b) => b.totalSpent - a.totalSpent);

  tbody.innerHTML = filtered.map((c, i) => {
    const tier = getTier(c.orders);
    const lastOrderStr = c.lastOrder ? c.lastOrder.toISOString().slice(0, 16).replace('T', ' ') : '—';
    return `<tr>
      <td>${i + 1}</td>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.orders}</td>
      <td style="color:var(--accent-pink);font-weight:600">${formatVND(c.totalSpent)}</td>
      <td style="color:var(--text-secondary)">${lastOrderStr}</td>
      <td><span class="tier-badge ${tier.cls}">${tier.label}</span></td>
    </tr>`;
  }).join('');
}

/**
 * Toggle revenue chart
 */
function toggleChart() {
  const section = document.querySelector('.chart-section');
  const label = document.querySelector('#kpiRevenueCard .kpi-label');

  if (!section || !label) return;

  if (section.classList.contains('visible')) {
    section.classList.remove('visible');
    label.textContent = 'Doanh thu tháng ▼';
  } else {
    section.classList.add('visible');
    label.textContent = 'Doanh thu tháng ▲';
    if (!chartLoaded) {
      apiFetch(`${API}/api/revenue-monthly`).then(r => r.json()).then(renderChart);
      chartLoaded = true;
    }
  }
}

/**
 * Render revenue chart
 * @param {Array} data - Chart data
 */
function renderChart(data) {
  const container = document.getElementById('chartContainer');
  const summary = document.getElementById('chartSummary');
  if (!container || !data || data.length === 0) return;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const currentMonth = new Date().toISOString().slice(0,7);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);
  const avgRevenue = data.filter(d => d.revenue > 0).length > 0
    ? totalRevenue / data.filter(d => d.revenue > 0).length : 0;

  container.innerHTML = data.map((d, i) => {
    const pct = maxRevenue > 0 ? (d.revenue / maxRevenue * 100) : 0;
    const isCurrent = d.month === currentMonth;
    const barClass = d.revenue === 0 ? 'empty' : (isCurrent ? 'current' : '');
    return `<div class="chart-bar-wrap">
      <div class="chart-bar-value">${d.revenue > 0 ? formatVND(d.revenue) : ''}</div>
      <div class="chart-bar ${barClass}" style="height:0%" data-height="${Math.max(pct, d.revenue > 0 ? 3 : 1)}%"
           title="${d.label}: ${formatVND(d.revenue)} — ${d.orders} đơn"></div>
      <div class="chart-bar-label">${d.label}</div>
    </div>`;
  }).join('');

  setTimeout(() => {
    container.querySelectorAll('.chart-bar').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.height = bar.dataset.height;
      }, i * 60);
    });
  }, 100);

  if (summary) {
    summary.innerHTML = `
      <div class="chart-summary-item">
        <div class="chart-summary-value">${formatVND(totalRevenue)}</div>
        <div class="chart-summary-label">Tổng 12 tháng</div>
      </div>
      <div class="chart-summary-item">
        <div class="chart-summary-value">${totalOrders}</div>
        <div class="chart-summary-label">Tổng đơn</div>
      </div>
      <div class="chart-summary-item">
        <div class="chart-summary-value">${formatVND(avgRevenue)}</div>
        <div class="chart-summary-label">Trung bình/tháng</div>
      </div>
    `;
  }
}

// Expose globally
export { customerData, chartLoaded, loadAnalytics, loadLoyalty, loadCustomers, renderCustomers, toggleChart, renderChart };
