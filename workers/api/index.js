// Cloudflare Worker API for K-Beauty Order
// Connects to Cloudflare D1 database

// JWT token expiry: 7 days for customers, 8 hours for admins (in seconds)
const JWT_EXPIRY_CUSTOMER = 7 * 24 * 3600;
const JWT_EXPIRY_ADMIN = 8 * 3600;

// Helper: SHA256 hash using WebCrypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// Helper: Sign JWT token with expiry
async function signJWT(payload, env, expirySeconds = JWT_EXPIRY_CUSTOMER) {
  const secret = (env && env.JWT_SECRET) || 'beapop_secret_123';
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expirySeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await sha256(signatureInput + secret);
  return `${signatureInput}.${base64UrlEncode(new Uint8Array(signature.match(/.{2}/g).map(b => parseInt(b, 16))))}`;
}

// Helper: Verify JWT token (checks signature + expiry)
async function verifyJWT(token, env) {
  try {
    const secret = (env && env.JWT_SECRET) || 'beapop_secret_123';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

    // Verify signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await sha256(signatureInput + secret);
    const actualSignature = Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/'))
      .split('').map(c => c.charCodeAt(0))).map(b => b.toString(16).padStart(2, '0')).join('');

    if (actualSignature !== expectedSignature) return null;
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Auth API (Public routes)
      if (path === '/api/auth/register' && request.method === 'POST') {
        return await handleRegister(env, request, corsHeaders);
      }
      if (path === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(env, request, corsHeaders);
      }
      if (path === '/api/admin/login' && request.method === 'POST') {
        return await handleAdminLogin(env, request, corsHeaders);
      }

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
        const id = path.split('/').pop();
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
        const id = path.split('/').pop();
        return await handleDeleteOrder(env, id, corsHeaders);
      }

      // Inventory API - Admin protected routes
      if (path === '/api/inventory' && request.method === 'GET') {
        // Admin only - verify admin token
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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
        const id = path.split('/').pop();
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
        const id = path.split('/').pop();
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
      // Seed customers (dev-only)
      if (path === '/api/seed/customers' && request.method === 'POST') {
        return await handleSeedCustomers(env, request, corsHeaders);
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
      console.error('API Error:', error);
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
  const id = data.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO orders (id, name, phone, address, items, total, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.name,
    data.phone,
    data.address,
    JSON.stringify(data.items || []),
    data.total || 0,
    data.status || 'pending',
    data.note
  ).run();

  // ── Auto-upsert customer ──────────────────────────────────
  try {
    const existing = await env.DB.prepare(
      'SELECT customerId, total_spent FROM customers WHERE phone = ?'
    ).bind(data.phone).first();

    if (existing) {
      const newSpent = (existing.total_spent || 0) + (data.total || 0);
      await env.DB.prepare(
        'UPDATE customers SET name=?, address=?, total_orders=total_orders+1, total_spent=?, loyalty_tier=? WHERE phone=?'
      ).bind(data.name, data.address||'', newSpent, calcTier(newSpent), data.phone).run();
    } else {
      const newId = 'CUS' + Date.now().toString().slice(-6);
      await env.DB.prepare(
        'INSERT INTO customers (customerId,name,phone,address,loyalty_tier,total_orders,total_spent) VALUES (?,?,?,?,?,1,?)'
      ).bind(newId, data.name, data.phone, data.address||'', 'Bronze', data.total||0).run();
    }
  } catch (e) {
    // Non-blocking: order still succeeds if customer upsert fails
    console.error('Customer upsert failed:', e.message);
  }

  return new Response(JSON.stringify({ id, message: 'Order created' }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// PUT /api/orders/:id - Update order status
async function handleUpdateOrder(env, id, request, corsHeaders) {
  const data = await request.json();

  await env.DB.prepare(`
    UPDATE orders SET status = ? WHERE id = ?
  `).bind(data.status, id).run();

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

    return new Response(JSON.stringify({ token, customer: { customerId, name, phone } }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Register error:', error);
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
      'SELECT customerId, name, phone, password_hash, loyalty_tier FROM customers WHERE phone = ?'
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
        loyalty_tier: customer.loyalty_tier
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
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
    console.error('Admin login error:', error);
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
