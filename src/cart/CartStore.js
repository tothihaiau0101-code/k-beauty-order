/**
 * CartStore — Local-first cart state with D1 sync (MISSION 79)
 *
 * Strategy:
 *   - localStorage is source of truth (instant, works offline)
 *   - If customer is logged in AND online: sync to D1 after 800ms debounce
 *   - If offline: queue the mutation, flush on "online" event
 *   - On init (page load): pull D1 cart and merge (remote base + local overlay)
 *
 * Backward-compatible: still uses 'kbeauty_cart' key so catalog.html /
 * order-form.html continue to work without changes.
 *
 * Usage:
 *   import CartStore from './src/cart/CartStore.js';
 *   await CartStore.init();
 *   CartStore.subscribe(items => updateUI(items));
 *   CartStore.delta('laneige-lip', 1);
 */

const CART_KEY = 'kbeauty_cart';
const SYNC_QUEUE_KEY = 'kbeauty_cart_sync_queue';
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://beapop-api.beapop.workers.dev';

const CartStore = {
  _items: {},
  _listeners: [],
  _syncing: false,
  _syncTimer: null,
  _initialized: false,

  /**
   * Initialize: load localStorage, then merge with D1 if logged in.
   * Must be called once on page load.
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    // Load from localStorage immediately (sync)
    this._items = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    this._emit();

    // Flush offline queue when network recovers
    window.addEventListener('online', () => this._flushQueue());

    // Pull from D1 to get cross-device cart state
    const token = localStorage.getItem('customerToken');
    if (token && navigator.onLine) {
      await this._pullFromD1(token);
    }
  },

  // ── READ ────────────────────────────────────────────────────────────────────

  /** Returns a snapshot copy of current cart items. */
  get() {
    return { ...this._items };
  },

  /** Total item count (sum of all quantities). */
  getCount() {
    return Object.values(this._items).reduce((s, q) => s + q, 0);
  },

  // ── WRITE ───────────────────────────────────────────────────────────────────

  /**
   * Set exact quantity for an item. qty <= 0 removes the item.
   * @param {string} id
   * @param {number} qty
   */
  set(id, qty) {
    if (qty <= 0) {
      delete this._items[id];
    } else {
      this._items[id] = qty;
    }
    this._persist();
    this._scheduleSync();
  },

  /**
   * Adjust quantity by delta (+1 or -1).
   * @param {string} id
   * @param {number} delta
   */
  delta(id, delta) {
    const current = this._items[id] || 0;
    this.set(id, Math.max(0, current + delta));
  },

  /** Remove a specific item. */
  remove(id) {
    delete this._items[id];
    this._persist();
    this._scheduleSync();
  },

  /** Clear the entire cart. */
  clear() {
    this._items = {};
    this._persist();
    this._scheduleSync();
  },

  // ── SUBSCRIPTION ────────────────────────────────────────────────────────────

  /**
   * Subscribe to cart changes. Callback receives a snapshot of items.
   * @param {function} fn - callback(items: object)
   * @returns {function} unsubscribe function
   */
  subscribe(fn) {
    this._listeners.push(fn);
    fn(this.get()); // emit current state immediately
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },

  // ── SYNC STATE ──────────────────────────────────────────────────────────────

  /** True if a D1 sync is in flight. */
  isSyncing() {
    return this._syncing;
  },

  // ── PRIVATE ─────────────────────────────────────────────────────────────────

  _persist() {
    localStorage.setItem(CART_KEY, JSON.stringify(this._items));
    this._emit();
  },

  _emit() {
    const snapshot = this.get();
    this._listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { /* listener errors must not crash store */ }
    });
  },

  _scheduleSync() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._pushToD1(), 800);
  },

  async _pushToD1() {
    const token = localStorage.getItem('customerToken');
    if (!token) return; // not logged in

    if (!navigator.onLine) {
      this._queueForLater(this._items);
      return;
    }

    this._syncing = true;
    this._emit(); // let UI show syncing indicator if subscribed

    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ items: this._items })
      });

      if (res.ok) {
        localStorage.removeItem(SYNC_QUEUE_KEY);
      } else if (res.status === 401) {
        // Token expired — clear it, stay local-only
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerUser');
      } else {
        this._queueForLater(this._items);
      }
    } catch (e) {
      // Network error
      this._queueForLater(this._items);
    } finally {
      this._syncing = false;
      this._emit();
    }
  },

  /**
   * Pull cart from D1 and merge with local state.
   * Strategy: remote is the base (cross-device), local additions overlay on top.
   */
  async _pullFromD1(token) {
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data.items && typeof data.items === 'object') {
        // Merge: remote base + local overlay (local wins for items added offline)
        const merged = { ...data.items, ...this._items };
        // Remove zero-qty entries from either side
        Object.keys(merged).forEach(k => { if (merged[k] <= 0) delete merged[k]; });
        this._items = merged;
        this._persist();
      }
    } catch (e) {
      // Silent fail — local state is still valid
    }
  },

  /** Queue current items for sync when online. */
  _queueForLater(items) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify({
      items,
      queuedAt: new Date().toISOString()
    }));
  },

  /** Flush queued changes when network becomes available. */
  async _flushQueue() {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return;

    const token = localStorage.getItem('customerToken');
    if (!token) {
      localStorage.removeItem(SYNC_QUEUE_KEY);
      return;
    }

    try {
      const { items } = JSON.parse(raw);
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ items })
      });
      if (res.ok) {
        localStorage.removeItem(SYNC_QUEUE_KEY);
      }
    } catch (e) { /* will retry on next online event */ }
  }
};

export default CartStore;
