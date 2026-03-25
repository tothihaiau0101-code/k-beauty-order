// Cloudflare Worker API for K-Beauty Order
// Connects to Cloudflare D1 database

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Orders API
      if (path === '/api/orders' && request.method === 'GET') {
        return await handleGetOrders(env, corsHeaders);
      }
      if (path === '/api/orders' && request.method === 'POST') {
        return await handleCreateOrder(env, request, corsHeaders);
      }
      if (path.startsWith('/api/orders/') && request.method === 'PUT') {
        const id = path.split('/').pop();
        return await handleUpdateOrder(env, id, request, corsHeaders);
      }

      // Inventory API
      if (path === '/api/inventory' && request.method === 'GET') {
        return await handleGetInventory(env, corsHeaders);
      }
      if (path.startsWith('/api/inventory/') && request.method === 'PUT') {
        const id = path.split('/').pop();
        return await handleUpdateInventory(env, id, request, corsHeaders);
      }

      // Stats API
      if (path === '/api/stats' && request.method === 'GET') {
        return await handleGetStats(env, corsHeaders);
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

// POST /api/orders - Create new order
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
