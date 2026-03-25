// Stock - Inventory/Kho tab logic for admin panel

import { API, apiFetch, formatVND } from './utils.js';

let stockData = [];

/**
 * Initialize stock tab
 * @returns {Object} Stock functions
 */
export function initStock() {
  stockData = [];
  return {
    loadStock,
    renderStockTable,
    renderHistory,
    openStockModal,
    closeStockModal,
    confirmStock,
    getStockData: () => stockData
  };
}

/**
 * Load stock data and history from API
 */
async function loadStock() {
  // Show skeleton while loading
  const tbody = document.getElementById('stockBody');
  if (tbody && window.BeaUI) {
    tbody.innerHTML = `<tr class="bea-sk-dark">${
      Array(5).fill('<td style="padding:10px 14px"><div class="bea-sk" style="height:12px;border-radius:6px"></div></td>').join('')
    }</tr>`.repeat(6);
  }

  try {
    const [stockRes, histRes] = await Promise.all([
      apiFetch(`${API}/api/inventory`),
      apiFetch(`${API}/api/inventory/history`).catch(() => ({ ok: false }))
    ]);
    if (!stockRes.ok) throw new Error('stock_' + stockRes.status);
    const data = await stockRes.json();
    stockData = data.inventory || data;
    renderStockTable(stockData);
    if (histRes.ok) {
      const history = await histRes.json();
      renderHistory(history.history || history);
    }
  } catch(e) {
    console.error('Load stock error', e);
    if (window.BeaUI) BeaUI.ErrorBoundary.show('Không thể tải dữ liệu kho hàng', 'error', 5000);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:rgba(255,255,255,0.4)">⚠️ Không thể tải dữ liệu</td></tr>';
  }
}

/**
 * Render stock table
 * @param {Array} items - Stock items
 */
function renderStockTable(items) {
  const skuTotal = document.getElementById('skuTotal');
  const skuInStock = document.getElementById('skuInStock');
  const skuLow = document.getElementById('skuLow');
  const skuOut = document.getElementById('skuOut');

  if (skuTotal) skuTotal.textContent = items.length;
  if (skuInStock) skuInStock.textContent = items.filter(i => i.stock > 2).length;
  if (skuLow) skuLow.textContent = items.filter(i => i.stock > 0 && i.stock <= 2).length;
  if (skuOut) skuOut.textContent = items.filter(i => i.stock === 0).length;

  const tbody = document.getElementById('stockBody');
  if (tbody) {
    tbody.innerHTML = items.map(p => {
      const bc = p.stock === 0 ? 'out-stock' : p.stock <= 2 ? 'low-stock' : 'in-stock';
      const bt = p.stock === 0 ? 'Hết hàng' : p.stock <= 2 ? `Còn ${p.stock}` : `${p.stock} sp`;
      const disabledAttr = p.stock === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : '';
      return `<tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.name}</td>
        <td>${p.category || ''}</td>
        <td><span class="stock-badge ${bc}">${bt}</span></td>
        <td>${formatVND(p.price)}</td>
        <td style="white-space:nowrap;">
          <button class="btn-stock btn-in" onclick="window._stock.openStockModal('${p.id}','in')">+ Nhập</button>
          <button class="btn-stock btn-out" onclick="window._stock.openStockModal('${p.id}','out')" ${disabledAttr}>- Xuất</button>
        </td>
      </tr>`;
    }).join('');
  }
}

/**
 * Render history table
 * @param {Array} items - History items
 */
function renderHistory(items) {
  const body = document.getElementById('historyBody');
  if (!items || items.length === 0) {
    if (body) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Chưa có lịch sử</td></tr>';
    }
    return;
  }
  if (body) {
    body.innerHTML = items.slice(0, 20).map(h => `<tr>
      <td>${(h.timestamp || '').slice(0, 16).replace('T', ' ')}</td>
      <td>${h.name || h.id}</td>
      <td><span class="history-action ${h.action}">${h.action === 'in' ? '📥 Nhập' : '📤 Xuất'}</span></td>
      <td><strong>${h.qty}</strong></td>
      <td>${h.note || '—'}</td>
      <td>${h.stock_after}</td>
    </tr>`).join('');
  }
}

// Modal state
let stockModalId = '';
let stockModalAction = '';

/**
 * Open stock modal
 * @param {string} id - Product ID
 * @param {string} action - 'in' or 'out'
 */
function openStockModal(id, action) {
  stockModalId = id;
  stockModalAction = action;
  const p = stockData.find(i => i.id === id);

  const title = document.getElementById('stockModalTitle');
  if (title) {
    title.textContent = action === 'in'
      ? `📥 Nhập hàng: ${p?.name || id}`
      : `📤 Xuất hàng: ${p?.name || id}`;
  }

  const qtyInput = document.getElementById('stockQty');
  if (qtyInput) qtyInput.value = 1;

  const noteInput = document.getElementById('stockNote');
  if (noteInput) noteInput.value = '';

  const btn = document.getElementById('stockConfirmBtn');
  if (btn) {
    btn.className = action === 'in' ? 'btn-confirm-in' : 'btn-confirm-out';
    btn.textContent = action === 'in' ? '✅ Nhập' : '📤 Xuất';
  }

  const modal = document.getElementById('stockModal');
  if (modal) modal.classList.add('show');
}

/**
 * Close stock modal
 */
function closeStockModal() {
  const modal = document.getElementById('stockModal');
  if (modal) modal.classList.remove('show');
}

/**
 * Confirm stock update
 */
async function confirmStock() {
  const qtyInput = document.getElementById('stockQty');
  const noteInput = document.getElementById('stockNote');
  const qty = parseInt(qtyInput?.value || '0') || 0;
  const note = noteInput?.value || '';

  if (qty <= 0) return alert('Số lượng phải > 0');

  try {
    const res = await apiFetch(`${API}/api/inventory/${stockModalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: stockModalAction, quantity: qty, note })
    });
    const result = await res.json();
    if (result.error) return alert('Lỗi: ' + result.error);
    closeStockModal();
    loadStock();
  } catch(e) {
    alert('Lỗi kết nối API');
  }
}

// Expose globally
export { stockData, loadStock, renderStockTable, renderHistory, openStockModal, closeStockModal, confirmStock };
