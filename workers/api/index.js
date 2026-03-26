// Cloudflare Worker API for K-Beauty Order
// Connects to Cloudflare D1 database

// JWT token expiry: 7 days for customers, 8 hours for admins (in seconds)
const JWT_EXPIRY_CUSTOMER = 7 * 24 * 3600;
const JWT_EXPIRY_ADMIN = 8 * 3600;

// ── CORS ALLOWLIST ───────────────────────────────────────────────────────────
// Add your Pages domains here. Override at runtime via env.ALLOWED_ORIGINS
// (comma-separated, set in Cloudflare Workers dashboard → Variables).
const CORS_ALLOWED_ORIGINS = [
  'https://k-beauty-order.pages.dev',
  'https://beapop.pages.dev',
  'https://036b49c2.k-beauty-order.pages.dev',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
];

/**
 * Return the request's Origin if it's in the allowlist, otherwise null.
 * Reads env.ALLOWED_ORIGINS (comma-separated) for runtime additions.
 * @param {Request} request
 * @param {object} env
 * @returns {string|null}
 */
function resolveAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  const extra = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const allowed = [...CORS_ALLOWED_ORIGINS, ...extra];
  return allowed.includes(origin) ? origin : null;
}

// ── RATE LIMITING ────────────────────────────────────────────────────────────
// Uses Cloudflare KV (RATE_LIMIT_KV binding) as a sliding fixed-window counter.
// If KV is not configured, rate limiting is silently skipped (fail-open).
//
// Window key format:  rl:{category}:{ip}:{window_bucket}
// Each key is stored with TTL = windowSecs + 5s to auto-expire.

const RATE_LIMIT_RULES = {
  auth_strict: { max: 5,   windowSecs: 60  }, // login / register / admin-login
  auth_normal: { max: 15,  windowSecs: 60  }, // change-password, auth/me
  order_write: { max: 10,  windowSecs: 60  }, // POST /api/orders
  write:       { max: 30,  windowSecs: 60  }, // other write endpoints
  global:      { max: 200, windowSecs: 60  }, // per-IP across all routes
};

/**
 * Check and increment rate-limit counter.
 * @param {object} env
 * @param {string} ip
 * @param {string} category - key in RATE_LIMIT_RULES
 * @returns {Promise<{limited: boolean, remaining: number, resetIn: number}>}
 */
async function checkRateLimit(env, ip, category) {
  if (!env.RATE_LIMIT_KV) return { limited: false, remaining: 999, resetIn: 60 };

  const rule = RATE_LIMIT_RULES[category] || RATE_LIMIT_RULES.write;
  const { max, windowSecs } = rule;
  const bucket = Math.floor(Date.now() / 1000 / windowSecs);
  const key = `rl:${category}:${ip}:${bucket}`;

  try {
    const current = parseInt(await env.RATE_LIMIT_KV.get(key) || '0', 10);
    const remaining = Math.max(0, max - current - 1);
    const resetIn = (bucket + 1) * windowSecs - Math.floor(Date.now() / 1000);

    if (current >= max) {
      return { limited: true, remaining: 0, resetIn };
    }

    await env.RATE_LIMIT_KV.put(key, String(current + 1), {
      expirationTtl: windowSecs + 5,
    });
    return { limited: false, remaining, resetIn };
  } catch (e) {
    // KV error — fail open, do not block legitimate traffic
    return { limited: false, remaining: 999, resetIn: 60 };
  }
}

/**
 * Build a 429 Too Many Requests response.
 */
function rateLimitedResponse(corsHeaders, resetIn) {
  return new Response(
    JSON.stringify({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
      },
    }
  );
}

// Helper: SHA256 hash (for password hashing only — NOT for JWT signatures)
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: proper HMAC-SHA256 for JWT signatures (S3 fix — replaces sha256(input+secret))
async function hmacSha256Hex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Hash password with salt
async function hashPassword(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = await sha256(password + salt);
  return salt + ':' + hash;
}

// Helper: Verify password against stored hash
async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const newHash = await sha256(password + salt);
  return newHash === hash;
}

// Helper: Base64URL encode
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper: Sign JWT token with expiry (proper HS256 via HMAC-SHA256)
async function signJWT(payload, env, expirySeconds = JWT_EXPIRY_CUSTOMER) {
  const secret = (env && env.JWT_SECRET) || 'beapop_secret_123';
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expirySeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  // S3 fix: use HMAC-SHA256, not sha256(input+secret)
  const sigHex = await hmacSha256Hex(signatureInput, secret);
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  return `${signatureInput}.${base64UrlEncode(sigBytes)}`;
}

// Helper: Verify JWT token — checks HMAC signature + expiry (S3 fix)
async function verifyJWT(token, env) {
  try {
    const secret = (env && env.JWT_SECRET) || 'beapop_secret_123';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry before verifying signature (fail fast)
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

    // Verify HMAC-SHA256 signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSigHex = await hmacSha256Hex(signatureInput, secret);
    const actualSigHex = Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/'))
        .split('').map(c => c.charCodeAt(0))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    if (actualSigHex !== expectedSigHex) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper: Extract bearer token from request
function getBearerToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// Helper: safe resource ID from URL path segment — S5 fix: prevent path traversal
// Allows UUID format, alphanumeric+dash IDs up to 64 chars
function safeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = decodeURIComponent(raw).trim();
  if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(clean)) return null;
  return clean;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── CORS LOCKDOWN (M80) ─────────────────────────────────────────────────
    // Replace wildcard '*' with exact-match origin from allowlist.
    // Server-to-server (no Origin header) → omit ACAO header entirely.
    const allowedOrigin = resolveAllowedOrigin(request, env);
    const corsHeaders = {
      ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, Authorization, X-Seed-Secret',
      'Vary': 'Origin',                             // required when origin varies
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── GLOBAL RATE LIMIT (M80) ─────────────────────────────────────────────
    // 200 req/min per IP across all routes — DoS baseline guard
    const clientIP = request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
      || 'unknown';

    const globalCheck = await checkRateLimit(env, clientIP, 'global');
    if (globalCheck.limited) {
      return rateLimitedResponse(corsHeaders, globalCheck.resetIn);
    }

    try {
      // ── AUTH ROUTES — rate limited (M80) ────────────────────────────────
      if (path === '/api/auth/register' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleRegister(env, request, corsHeaders);
      }
      if (path === '/api/auth/login' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleLogin(env, request, corsHeaders);
      }
      if (path === '/api/admin/login' && request.method === 'POST') {
        // Admin login gets tighter limit: keyed by IP+username to prevent
        // distributed credential stuffing across different IPs
        const body = await request.clone().json().catch(() => ({}));
        const usernameKey = `${clientIP}:${(body.username || '').slice(0, 32)}`;
        const rl = await checkRateLimit(env, usernameKey, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleAdminLogin(env, request, corsHeaders);
      }
      if (path === '/api/auth/me' && request.method === 'GET') {
        const rl = await checkRateLimit(env, clientIP, 'auth_normal');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleAuthMe(env, request, corsHeaders);
      }
      if (path === '/api/auth/change-password' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleChangePassword(env, request, corsHeaders);
      }

      // ── ORDERS API ───────────────────────────────────────────────────────
      // Orders API - Admin protected routes
      if (path === '/api/orders' && request.method === 'GET') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleGetOrders(env, corsHeaders);
      }
      if (path === '/api/orders' && request.method === 'POST') {
        // Rate limit order creation: 10/min per IP (anti-spam)
        const rl = await checkRateLimit(env, clientIP, 'order_write');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return await handleCreateOrder(env, request, corsHeaders);
      }
      if (path.startsWith('/api/orders/') && request.method === 'PUT') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]); // S5 fix
        if (!id) return new Response(JSON.stringify({ error: 'Invalid order id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return await handleUpdateOrder(env, id, request, corsHeaders);
      }
      if (path.startsWith('/api/orders/') && request.method === 'DELETE') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]); // S5 fix
        if (!id) return new Response(JSON.stringify({ error: 'Invalid order id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return await handleDeleteOrder(env, id, corsHeaders);
      }

      // Inventory API - GET is public (stock display); write routes are admin-only
      if (path === '/api/inventory' && request.method === 'GET') {
        return await handleGetInventory(env, corsHeaders);
      }
      if (path === '/api/inventory' && request.method === 'POST') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleCreateInventory(env, request, corsHeaders);
      }
      if (path.startsWith('/api/inventory/') && request.method === 'PUT') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]); // S5 fix
        if (!id) return new Response(JSON.stringify({ error: 'Invalid inventory id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return await handleUpdateInventory(env, id, request, corsHeaders);
      }
      if (path.startsWith('/api/inventory/') && request.method === 'DELETE') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]); // S5 fix
        if (!id) return new Response(JSON.stringify({ error: 'Invalid inventory id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return await handleDeleteInventory(env, id, corsHeaders);
      }

      // Stats API - Admin protected
      if (path === '/api/stats' && request.method === 'GET') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleGetStats(env, corsHeaders);
      }

      // Customers API - Admin protected routes
      if (path === '/api/customers' && request.method === 'GET') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleGetCustomers(env, url, corsHeaders);
      }
      if (path.startsWith('/api/customers/') && request.method === 'GET') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleGetCustomerByPhone(env, path, corsHeaders);
      }
      if (path === '/api/customers' && request.method === 'POST') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleUpsertCustomer(env, request, corsHeaders);
      }
      if (path.includes('/api/customers/') && path.endsWith('/tier') && request.method === 'PUT') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleUpdateTier(env, path, request, corsHeaders);
      }
      // Seed customers (dev-only — S2 fix: require SEED_SECRET env var)
      if (path === '/api/seed/customers' && request.method === 'POST') {
        const seedSecret = env.SEED_SECRET || '';
        const provided = request.headers.get('X-Seed-Secret') || '';
        if (!seedSecret || provided !== seedSecret) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleSeedCustomers(env, request, corsHeaders);
      }

      // Cart API - Customer routes (M79)
      if (path === '/api/cart' && request.method === 'GET') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleGetCart(env, customer.customerId, corsHeaders);
      }
      if (path === '/api/cart' && request.method === 'PUT') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handlePutCart(env, customer.customerId, request, corsHeaders);
      }
      if (path === '/api/cart' && request.method === 'DELETE') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleClearCart(env, customer.customerId, corsHeaders);
      }

      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// GET /api/orders - List all orders
async function handleGetOrders(env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC'
  ).all();

  return new Response(JSON.stringify({ orders: results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// POST /api/orders - Create new order + auto-upsert customer
async function handleCreateOrder(env, request, corsHeaders) {
  const data = await request.json();

  // S1+S4 fix: input validation — reject malformed or malicious payloads
  const name = (data.name || '').toString().trim().slice(0, 200);
  const phone = (data.phone || '').toString().replace(/\D/g, '').slice(0, 15);
  const address = (data.address || '').toString().trim().slice(0, 500);
  const note = (data.note || '').toString().trim().slice(0, 1000);
  const total = parseFloat(data.total) || 0;

  if (!name || name.length < 2) {
    return new Response(JSON.stringify({ error: 'Tên không hợp lệ' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (!/^0\d{9}$/.test(phone)) {
    return new Response(JSON.stringify({ error: 'Số điện thoại không hợp lệ' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (!address) {
    return new Response(JSON.stringify({ error: 'Địa chỉ không được để trống' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (total < 0) {
    return new Response(JSON.stringify({ error: 'Tổng tiền không hợp lệ' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // S1 fix: always generate server-side ID — never trust client-supplied id
  // S1 fix: always set status='pending' — never trust client-supplied status
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO orders (id, name, phone, address, items, total, status, note)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    id,
    name,
    phone,
    address,
    JSON.stringify(Array.isArray(data.items) ? data.items : []),
    total,
    note
  ).run();

  // ── Auto-upsert customer (uses validated vars, not raw data) ──
  try {
    const existing = await env.DB.prepare(
      'SELECT customerId, total_spent FROM customers WHERE phone = ?'
    ).bind(phone).first();

    if (existing) {
      const newSpent = (existing.total_spent || 0) + total;
      await env.DB.prepare(
        'UPDATE customers SET name=?, address=?, total_orders=total_orders+1, total_spent=?, loyalty_tier=? WHERE phone=?'
      ).bind(name, address, newSpent, calcTier(newSpent), phone).run();
    } else {
      const newId = 'CUS' + Date.now().toString().slice(-6);
      await env.DB.prepare(
        'INSERT INTO customers (customerId,name,phone,address,loyalty_tier,total_orders,total_spent) VALUES (?,?,?,?,?,1,?)'
      ).bind(newId, name, phone, address, 'Bronze', total).run();
    }
  } catch (e) {
    // Non-blocking: order still succeeds if customer upsert fails
  }

  return new Response(JSON.stringify({ id, message: 'Order created' }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// PUT /api/orders/:id - Update order status (admin only — S1 fix: whitelist status)
async function handleUpdateOrder(env, id, request, corsHeaders) {
  const data = await request.json();
  const VALID_STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

  if (!VALID_STATUSES.includes(data.status)) {
    return new Response(JSON.stringify({ error: 'Invalid status value' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  await env.DB.prepare(
    'UPDATE orders SET status = ? WHERE id = ?'
  ).bind(data.status, id).run();

  return new Response(JSON.stringify({ id, status: data.status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// GET /api/inventory - List all inventory
async function handleGetInventory(env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM inventory ORDER BY name'
  ).all();

  return new Response(JSON.stringify({ inventory: results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// PUT /api/inventory/:id - Update inventory stock
async function handleUpdateInventory(env, id, request, corsHeaders) {
  const data = await request.json();

  // Update inventory
  await env.DB.prepare(`
    UPDATE inventory SET stock = ?, price = ? WHERE id = ?
  `).bind(data.stock, data.price || 0, id).run();

  // Log to history
  await env.DB.prepare(`
    INSERT INTO inventory_history (product_id, action, qty, note, stock_after)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    data.action || 'update',
    data.qty_change || 0,
    data.note || '',
    data.stock
  ).run();

  return new Response(JSON.stringify({ id, stock: data.stock }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// GET /api/stats - Get dashboard stats
async function handleGetStats(env, corsHeaders) {
  const orderCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM orders'
  ).first();

  const orderTotal = await env.DB.prepare(
    'SELECT SUM(total) as total FROM orders'
  ).first();

  const pendingCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
  ).first();

  const inventoryCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM inventory'
  ).first();

  return new Response(JSON.stringify({
    totalOrders: orderCount?.count || 0,
    totalRevenue: orderTotal?.total || 0,
    pendingOrders: pendingCount?.count || 0,
    totalProducts: inventoryCount?.count || 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ── CUSTOMER HANDLERS ────────────────────────────────────────

// GET /api/customers - List customers (filter by tier, limit, search)
async function handleGetCustomers(env, url, corsHeaders) {
  const limit  = parseInt(url.searchParams.get('limit') || '100');
  const tier   = url.searchParams.get('tier') || null;
  const search = url.searchParams.get('q')    || null;

  let query  = 'SELECT * FROM customers';
  const conditions = [];
  const params = [];

  if (tier)   { conditions.push('loyalty_tier = ?');                  params.push(tier); }
  if (search) { conditions.push('(name LIKE ? OR phone LIKE ?)');     params.push(`%${search}%`, `%${search}%`); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ` ORDER BY total_spent DESC LIMIT ${limit}`;

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// GET /api/customers/:phone - Customer detail + their orders
async function handleGetCustomerByPhone(env, path, corsHeaders) {
  const phone = decodeURIComponent(path.split('/api/customers/')[1]);
  const customer = await env.DB.prepare(
    'SELECT * FROM customers WHERE phone = ?'
  ).bind(phone).first();

  if (!customer) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { results: orders } = await env.DB.prepare(
    'SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC'
  ).bind(phone).all();

  return new Response(JSON.stringify({ ...customer, orders }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// POST /api/customers - Create or upsert a customer
async function handleUpsertCustomer(env, request, corsHeaders) {
  const c = await request.json();
  await env.DB.prepare(`
    INSERT INTO customers (customerId,name,phone,email,address,loyalty_tier,total_orders,total_spent,joined_at,note)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(phone) DO UPDATE SET
      name=excluded.name, email=excluded.email,
      address=excluded.address, note=excluded.note
  `).bind(
    c.customerId || ('CUS' + Date.now().toString().slice(-6)),
    c.name, c.phone, c.email||'', c.address||'',
    c.loyalty_tier||'Bronze', c.total_orders||0, c.total_spent||0,
    (c.joined_at||'').slice(0,19) || new Date().toISOString().slice(0,19),
    c.note||''
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// PUT /api/customers/:phone/tier - Update loyalty tier
async function handleUpdateTier(env, path, request, corsHeaders) {
  const phone = decodeURIComponent(path.split('/api/customers/')[1].replace('/tier', ''));
  const { tier } = await request.json();

  await env.DB.prepare(
    'UPDATE customers SET loyalty_tier = ? WHERE phone = ?'
  ).bind(tier, phone).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// POST /api/seed/customers - Dev-only: bulk insert demo data
async function handleSeedCustomers(env, request, corsHeaders) {
  const customers = await request.json();
  if (!Array.isArray(customers)) {
    return new Response(JSON.stringify({ error: 'Expected array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO customers
      (customerId,name,phone,email,address,loyalty_tier,total_orders,total_spent,joined_at,note)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  const batch = customers.map(c => stmt.bind(
    c.customerId, c.name, c.phone, c.email||'',
    c.address||'', c.loyalty_tier||'Bronze',
    c.total_orders||0, c.total_spent||0,
    (c.joined_at||'').slice(0,19)||new Date().toISOString().slice(0,19),
    c.note||''
  ));

  await env.DB.batch(batch);

  return new Response(JSON.stringify({ ok: true, inserted: customers.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Helper: calculate loyalty tier based on total spent
function calcTier(spent) {
  if (spent >= 10000000) return 'Platinum';
  if (spent >= 5000000)  return 'Gold';
  if (spent >= 1000000)  return 'Silver';
  return 'Bronze';
}

// ── AUTH HANDLERS ───────────────────────────────────────────

// POST /api/auth/register - Register new customer
async function handleRegister(env, request, corsHeaders) {
  try {
    const { phone, name, password } = await request.json();

    if (!phone || !name || !password) {
      return new Response(JSON.stringify({ error: 'Missing phone, name, or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if phone already exists
    const existing = await env.DB.prepare(
      'SELECT customerId FROM customers WHERE phone = ?'
    ).bind(phone).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Phone already registered' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const passwordHash = await hashPassword(password);
    const customerId = 'CUS' + Date.now().toString().slice(-6);

    await env.DB.prepare(`
      INSERT INTO customers (customerId, name, phone, password_hash, loyalty_tier, total_orders, total_spent)
      VALUES (?, ?, ?, ?, 'Bronze', 0, 0)
    `).bind(customerId, name, phone, passwordHash).run();

    const token = await signJWT({ phone, name, role: 'customer', customerId }, env, JWT_EXPIRY_CUSTOMER);

    return new Response(JSON.stringify({
      token,
      customer: { customerId, name, phone, loyalty_tier: 'Bronze', total_orders: 0, total_spent: 0 }
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/auth/login - Login customer
async function handleLogin(env, request, corsHeaders) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return new Response(JSON.stringify({ error: 'Missing phone or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const customer = await env.DB.prepare(
      'SELECT customerId, name, phone, password_hash, loyalty_tier, total_orders, total_spent FROM customers WHERE phone = ?'
    ).bind(phone).first();

    if (!customer || !customer.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid phone or password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const valid = await verifyPassword(password, customer.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid phone or password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = await signJWT({
      phone: customer.phone,
      name: customer.name,
      role: 'customer',
      customerId: customer.customerId
    }, env, JWT_EXPIRY_CUSTOMER);

    return new Response(JSON.stringify({
      token,
      customer: {
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        loyalty_tier: customer.loyalty_tier,
        total_orders: customer.total_orders || 0,
        total_spent: customer.total_spent || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/admin/login - Admin login
async function handleAdminLogin(env, request, corsHeaders) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const admin = await env.DB.prepare(
      'SELECT username, password_hash, role FROM admins WHERE username = ?'
    ).bind(username).first();

    if (!admin || !admin.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = await signJWT({ username, role: admin.role || 'admin' }, env, JWT_EXPIRY_ADMIN);

    return new Response(JSON.stringify({
      token,
      admin: { username, role: admin.role || 'admin' }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Middleware: Verify admin JWT token
async function verifyAdmin(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'admin') return null;

  return payload;
}

// DELETE /api/orders/:id - Delete an order (admin only)
async function handleDeleteOrder(env, id, corsHeaders) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// POST /api/inventory - Create new inventory item (admin only)
async function handleCreateInventory(env, request, corsHeaders) {
  const data = await request.json();
  const id = data.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO inventory (id, name, category, stock, price)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, data.name, data.category || '', data.stock || 0, data.price || 0).run();

  return new Response(JSON.stringify({ id, message: 'Inventory created' }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// DELETE /api/inventory/:id - Delete inventory item (admin only)
async function handleDeleteInventory(env, id, corsHeaders) {
  await env.DB.prepare('DELETE FROM inventory WHERE id = ?').bind(id).run();
  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// GET /api/auth/me - Get current customer profile (requires customer JWT)
async function handleAuthMe(env, request, corsHeaders) {
  const token = getBearerToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'customer') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const customer = await env.DB.prepare(
    'SELECT customerId, name, phone, loyalty_tier, total_orders, total_spent FROM customers WHERE phone = ?'
  ).bind(payload.phone).first();
  if (!customer) {
    return new Response(JSON.stringify({ error: 'Customer not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify(customer), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// POST /api/auth/change-password - Change customer password (requires customer JWT)
async function handleChangePassword(env, request, corsHeaders) {
  const token = getBearerToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'customer') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  try {
    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing oldPassword or newPassword' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (newPassword.length < 4) {
      return new Response(JSON.stringify({ error: 'WEAK_PASSWORD' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const customer = await env.DB.prepare(
      'SELECT password_hash FROM customers WHERE phone = ?'
    ).bind(payload.phone).first();
    if (!customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const valid = await verifyPassword(oldPassword, customer.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'WRONG_PASSWORD' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const newHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE customers SET password_hash = ? WHERE phone = ?')
      .bind(newHash, payload.phone).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Change password failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Middleware: Verify customer JWT token (MISSION 79)
async function verifyCustomer(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'customer') return null;
  return payload;
}

// GET /api/cart - Get cart for logged-in customer (MISSION 79)
async function handleGetCart(env, customerId, corsHeaders) {
  const row = await env.DB.prepare(
    'SELECT items FROM carts WHERE customerId = ?'
  ).bind(customerId).first();

  const items = row ? JSON.parse(row.items || '{}') : {};
  return new Response(JSON.stringify({ items }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// PUT /api/cart - Upsert cart for logged-in customer (MISSION 79)
async function handlePutCart(env, customerId, request, corsHeaders) {
  const { items } = await request.json();
  if (typeof items !== 'object' || items === null) {
    return new Response(JSON.stringify({ error: 'items must be an object' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Remove zero or negative quantities before saving
  const cleaned = {};
  for (const [id, qty] of Object.entries(items)) {
    if (typeof qty === 'number' && qty > 0) cleaned[id] = qty;
  }

  await env.DB.prepare(`
    INSERT INTO carts (customerId, items, updated_at)
    VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(customerId) DO UPDATE SET
      items = excluded.items,
      updated_at = excluded.updated_at
  `).bind(customerId, JSON.stringify(cleaned)).run();

  return new Response(JSON.stringify({ ok: true, items: cleaned }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// DELETE /api/cart - Clear cart for logged-in customer (MISSION 79)
async function handleClearCart(env, customerId, corsHeaders) {
  await env.DB.prepare(
    'DELETE FROM carts WHERE customerId = ?'
  ).bind(customerId).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
