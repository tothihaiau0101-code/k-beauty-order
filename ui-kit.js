/* ============================================================
   BeaPop UI Kit — Skeleton Loading + Glassmorphism Error Boundary
   M81 · Shared across all pages
   ============================================================ */
(function () {
  'use strict';

  // ── SKELETON GENERATOR ──────────────────────────────────────
  const Skeleton = {
    /** Single shimmer block */
    block(w, h, r) {
      return `<div class="bea-sk" style="width:${w||'100%'};height:${h||'16px'};border-radius:${r||'8px'}"></div>`;
    },

    /** 4-column KPI card row (admin dark or storefront light) */
    kpiRow() {
      const card = `
        <div class="kpi-card" style="pointer-events:none">
          <div class="bea-sk" style="width:36px;height:36px;border-radius:50%;margin:0 auto 8px"></div>
          <div class="bea-sk" style="width:70px;height:26px;margin:0 auto 6px"></div>
          <div class="bea-sk" style="width:54px;height:11px;margin:0 auto"></div>
        </div>`;
      return Array(4).fill(card).join('');
    },

    /** Table rows */
    tableRows(cols, rows) {
      cols = cols || 6; rows = rows || 5;
      const tds = Array(cols).fill(0).map(() =>
        `<td style="padding:12px 14px"><div class="bea-sk" style="height:13px;border-radius:6px"></div></td>`
      ).join('');
      return Array(rows).fill(`<tr>${tds}</tr>`).join('');
    },

    /** Account profile header */
    profile() {
      return `
        <div style="text-align:center;padding:24px 0 8px">
          <div class="bea-sk" style="width:80px;height:80px;border-radius:50%;margin:0 auto 14px"></div>
          <div class="bea-sk" style="width:140px;height:22px;margin:0 auto 8px"></div>
          <div class="bea-sk" style="width:100px;height:14px;margin:0 auto"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0">
          ${Array(3).fill(`<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
            <div class="bea-sk" style="width:50px;height:24px;margin:0 auto 6px"></div>
            <div class="bea-sk" style="width:60px;height:12px;margin:0 auto"></div>
          </div>`).join('')}
        </div>`;
    },

    /** Product grid cards */
    productGrid(count) {
      count = count || 6;
      const card = `
        <div style="background:var(--bg-card,#fff);border-radius:16px;overflow:hidden;border:1px solid var(--border,rgba(0,0,0,0.07))">
          <div class="bea-sk" style="width:100%;height:200px;border-radius:0"></div>
          <div style="padding:14px">
            <div class="bea-sk" style="height:14px;margin-bottom:8px"></div>
            <div class="bea-sk" style="width:60%;height:12px;margin-bottom:12px"></div>
            <div class="bea-sk" style="width:80px;height:20px;border-radius:10px"></div>
          </div>
        </div>`;
      return Array(count).fill(card).join('');
    },

    /** Order tracking result */
    trackingCard() {
      return `
        <div style="background:var(--bg-card,#fff);border:1px solid var(--border,rgba(0,0,0,0.07));border-radius:16px;padding:20px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06))">
            <div class="bea-sk" style="width:110px;height:18px"></div>
            <div class="bea-sk" style="width:80px;height:22px;border-radius:12px"></div>
          </div>
          <div class="bea-sk" style="height:13px;margin-bottom:8px"></div>
          <div class="bea-sk" style="width:50%;height:13px;margin-bottom:18px"></div>
          <div style="display:flex;gap:8px">
            ${Array(4).fill(`<div style="flex:1;text-align:center">
              <div class="bea-sk" style="width:30px;height:30px;border-radius:50%;margin:0 auto 6px"></div>
              <div class="bea-sk" style="width:40px;height:10px;margin:0 auto;border-radius:4px"></div>
            </div>`).join('')}
          </div>
        </div>`;
    }
  };

  // ── GLASSMORPHISM ERROR BOUNDARY ────────────────────────────
  const ICONS = { error: '⚠️', success: '✅', info: 'ℹ️', warning: '⚡' };

  const ErrorBoundary = {
    /** Show glassmorphism toast notification */
    show(message, type, duration) {
      type = type || 'error';
      duration = duration == null ? 5000 : duration;

      let container = document.getElementById('bea-toasts');
      if (!container) {
        container = document.createElement('div');
        container.id = 'bea-toasts';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'bea-toast bea-toast-' + type;
      toast.innerHTML =
        '<span class="bea-toast-icon">' + (ICONS[type] || '⚠️') + '</span>' +
        '<span class="bea-toast-msg">' + message + '</span>' +
        '<button class="bea-toast-x" onclick="this.closest(\'.bea-toast\').remove()" aria-label="Đóng">×</button>' +
        '<div class="bea-toast-bar" style="animation-duration:' + duration + 'ms"></div>';

      container.appendChild(toast);
      requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('bea-toast-in')));

      const timer = setTimeout(() => {
        toast.classList.remove('bea-toast-in');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      }, duration);

      toast.querySelector('.bea-toast-x').addEventListener('click', () => clearTimeout(timer));
      return toast;
    },

    /** Wrap async call — show error toast on failure and rethrow */
    async wrap(fn, msg) {
      try { return await fn(); }
      catch (e) {
        ErrorBoundary.show(msg || 'Không thể tải dữ liệu. Vui lòng thử lại.', 'error');
        throw e;
      }
    },

    /** Show inline error in a container element */
    inline(container, message, onRetry) {
      if (typeof container === 'string') container = document.getElementById(container);
      if (!container) return;
      container.innerHTML =
        '<div class="bea-error-inline">' +
          '<div class="bea-error-inline-icon">⚠️</div>' +
          '<div class="bea-error-inline-msg">' + message + '</div>' +
          (onRetry
            ? '<button class="bea-error-retry" onclick="(' + onRetry.toString() + ')()">↺ Thử lại</button>'
            : '') +
        '</div>';
    }
  };

  window.BeaUI = { Skeleton, ErrorBoundary };
})();
