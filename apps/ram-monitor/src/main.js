const { invoke } = window.__TAURI__.core;

let refreshInterval = null;
let isPaused = false;
let searchQuery = '';
let currentKillPid = null;

// DOM Elements
const elements = {
  refreshRate: document.getElementById('refresh-rate'),
  pauseBtn: document.getElementById('pause-btn'),
  totalRam: document.getElementById('total-ram'),
  usedRam: document.getElementById('used-ram'),
  freeRam: document.getElementById('free-ram'),
  gaugeCircle: document.getElementById('gauge-circle'),
  gaugePercent: document.getElementById('gauge-percent'),
  ramBar: document.getElementById('ram-bar'),
  ramBarLabel: document.getElementById('ram-bar-label'),
  processCount: document.getElementById('process-count'),
  searchInput: document.getElementById('search-input'),
  processTbody: document.getElementById('process-tbody'),
  killModal: document.getElementById('kill-modal'),
  killProcessName: document.getElementById('kill-process-name'),
  killProcessPid: document.getElementById('kill-process-pid'),
  killCancel: document.getElementById('kill-cancel'),
  killConfirm: document.getElementById('kill-confirm'),
  toastContainer: document.getElementById('toast-container'),
};

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Fetch system info
async function fetchSystemInfo() {
  try {
    const info = await invoke('get_system_info');

    elements.totalRam.textContent = formatBytes(info.total_memory);
    elements.usedRam.textContent = formatBytes(info.used_memory);
    elements.freeRam.textContent = formatBytes(info.free_memory);

    const percent = info.percent.toFixed(1);
    elements.gaugePercent.textContent = `${percent}%`;
    elements.ramBarLabel.textContent = `${percent}%`;

    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (info.percent / 100) * circumference;
    elements.gaugeCircle.style.strokeDashoffset = offset;

    elements.ramBar.style.width = `${Math.max(info.percent, 2)}%`;

    elements.gaugeCircle.style.stroke = getRamColor(info.percent);
    elements.ramBar.style.background = getRamGradient(info.percent);

  } catch (error) {
    console.error('Failed to fetch system info:', error);
  }
}

// Get color based on RAM usage
function getRamColor(percent) {
  if (percent < 50) return '#10b981';
  if (percent < 80) return '#f59e0b';
  return '#ef4444';
}

function getRamGradient(percent) {
  if (percent < 50) return 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
  if (percent < 80) return 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
  return 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
}

// Fetch processes
async function fetchProcesses() {
  try {
    const data = await invoke('get_processes');

    elements.processCount.textContent = data.count;

    const filtered = data.processes.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      elements.processTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <p>No processes found</p>
          </td>
        </tr>
      `;
      return;
    }

    elements.processTbody.innerHTML = filtered.map(p => `
      <tr data-pid="${p.pid}">
        <td><span class="process-name">${escapeHtml(p.name)}</span></td>
        <td>${p.pid}</td>
        <td>${p.ram_mb.toFixed(1)} MB</td>
        <td>${p.cpu_percent.toFixed(1)}%</td>
        <td>${escapeHtml(p.status)}</td>
        <td><button class="kill-btn" onclick="showKillModal(${p.pid}, '${escapeHtml(p.name)}')">Kill</button></td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Failed to fetch processes:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Kill process functions
function showKillModal(pid, name) {
  currentKillPid = pid;
  elements.killProcessName.textContent = name;
  elements.killProcessPid.textContent = pid;
  elements.killModal.classList.add('active');
}

function hideKillModal() {
  currentKillPid = null;
  elements.killModal.classList.remove('active');
}

async function confirmKill() {
  if (!currentKillPid) return;

  try {
    const result = await invoke('kill_process', { pid: currentKillPid });
    showToast(result, 'success');
    hideKillModal();
    fetchProcesses();
  } catch (error) {
    showToast(error, 'error');
    hideKillModal();
  }
}

// Refresh control
function startRefresh(ms) {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (!isPaused) {
      fetchSystemInfo();
      fetchProcesses();
    }
  }, ms);
}

function togglePause() {
  isPaused = !isPaused;
  elements.pauseBtn.classList.toggle('paused', isPaused);
  if (!isPaused) {
    fetchSystemInfo();
    fetchProcesses();
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  fetchSystemInfo();
  fetchProcesses();
  startRefresh(2000);

  elements.refreshRate.addEventListener('change', (e) => {
    startRefresh(parseInt(e.target.value));
  });

  elements.pauseBtn.addEventListener('click', togglePause);

  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    fetchProcesses();
  });

  elements.killCancel.addEventListener('click', hideKillModal);
  elements.killConfirm.addEventListener('click', confirmKill);

  elements.killModal.addEventListener('click', (e) => {
    if (e.target === elements.killModal) hideKillModal();
  });
});
