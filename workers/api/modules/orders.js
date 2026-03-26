// orders.js - Order handlers for K-Beauty Order API

import { safeId, calcTier } from './utils.js';

/**
 * GET /api/orders - List all orders
 */
export async function handleGetOrders(env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC'
  ).all();

  return new Response(JSON.stringify({ orders: results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * POST /api/orders - Create new order + auto-upsert customer
 */
export async function handleCreateOrder(env, request, corsHeaders) {
  const data = await request.json();

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

  // Auto-upsert customer
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
    // Non-blocking
  }

  return new Response(JSON.stringify({ id, message: 'Order created' }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * PUT /api/orders/:id - Update order status
 */
export async function handleUpdateOrder(env, id, request, corsHeaders) {
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

/**
 * DELETE /api/orders/:id - Delete an order
 */
export async function handleDeleteOrder(env, id, corsHeaders) {
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/stats - Get dashboard stats
 */
export async function handleGetStats(env, corsHeaders) {
  const orderCount = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first();
  const orderTotal = await env.DB.prepare('SELECT SUM(total) as total FROM orders').first();
  const pendingCount = await env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").first();
  const inventoryCount = await env.DB.prepare('SELECT COUNT(*) as count FROM inventory').first();

  return new Response(JSON.stringify({
    totalOrders: orderCount?.count || 0,
    totalRevenue: orderTotal?.total || 0,
    pendingOrders: pendingCount?.count || 0,
    totalProducts: inventoryCount?.count || 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/customers - List customers
 */
export async function handleGetCustomers(env, url, corsHeaders) {
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

/**
 * GET /api/customers/:phone - Customer detail + their orders
 */
export async function handleGetCustomerByPhone(env, path, corsHeaders) {
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

/**
 * POST /api/customers - Create or upsert a customer
 */
export async function handleUpsertCustomer(env, request, corsHeaders) {
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

/**
 * PUT /api/customers/:phone/tier - Update loyalty tier
 */
export async function handleUpdateTier(env, path, request, corsHeaders) {
  const phone = decodeURIComponent(path.split('/api/customers/')[1].replace('/tier', ''));
  const { tier } = await request.json();

  await env.DB.prepare(
    'UPDATE customers SET loyalty_tier = ? WHERE phone = ?'
  ).bind(tier, phone).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * POST /api/seed/customers - Dev-only: bulk insert demo data
 */
export async function handleSeedCustomers(env, request, corsHeaders) {
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

/**
 * GET /api/cart - Get cart for logged-in customer
 */
export async function handleGetCart(env, customerId, corsHeaders) {
  const row = await env.DB.prepare(
    'SELECT items FROM carts WHERE customerId = ?'
  ).bind(customerId).first();

  const items = row ? JSON.parse(row.items || '{}') : {};
  return new Response(JSON.stringify({ items }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * PUT /api/cart - Upsert cart for logged-in customer
 */
export async function handlePutCart(env, customerId, request, corsHeaders) {
  const { items } = await request.json();
  if (typeof items !== 'object' || items === null) {
    return new Response(JSON.stringify({ error: 'items must be an object' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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

/**
 * DELETE /api/cart - Clear cart for logged-in customer
 */
export async function handleClearCart(env, customerId, corsHeaders) {
  await env.DB.prepare(
    'DELETE FROM carts WHERE customerId = ?'
  ).bind(customerId).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
