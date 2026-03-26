// inventory.js - Inventory handlers for K-Beauty Order API

import { safeId } from './utils.js';

/**
 * Validate inventory data
 * @param {object} data - Inventory data to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateInventory(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid inventory data' };
  }
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Product name is required' };
  }
  if (data.name.length > 200) {
    return { valid: false, error: 'Product name must be ≤200 characters' };
  }
  if (data.category && typeof data.category !== 'string' && data.category.length > 100) {
    return { valid: false, error: 'Category must be ≤100 characters' };
  }
  const stock = parseInt(data.stock) || 0;
  if (stock < 0 || stock > 1000000) {
    return { valid: false, error: 'Stock must be between 0 and 1,000,000' };
  }
  const price = parseFloat(data.price) || 0;
  if (price < 0 || price > 1000000000) {
    return { valid: false, error: 'Price must be between 0 and 1,000,000,000' };
  }
  return { valid: true };
}

/**
 * GET /api/inventory - List all inventory
 */
export async function handleGetInventory(env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM inventory ORDER BY name'
    ).all();

    return new Response(JSON.stringify({ inventory: results || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Inventory GET] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch inventory' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/inventory - Create new inventory item
 */
export async function handleCreateInventory(env, request, corsHeaders) {
  try {
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validation = validateInventory(data);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const id = safeId(data.id) || crypto.randomUUID();
    const stock = parseInt(data.stock) || 0;
    const price = parseFloat(data.price) || 0;

    // Check for duplicate ID
    const existing = await env.DB.prepare(
      'SELECT id FROM inventory WHERE id = ?'
    ).bind(id).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Product ID already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(`
      INSERT INTO inventory (id, name, category, stock, price)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, data.name.trim(), (data.category || '').trim(), stock, price).run();

    return new Response(JSON.stringify({
      id,
      message: 'Inventory item created',
      item: { id, name: data.name.trim(), category: data.category || '', stock, price }
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Inventory POST] Error:', error.message);
    if (error.message.includes('UNIQUE constraint')) {
      return new Response(JSON.stringify({ error: 'Duplicate product ID' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to create inventory item' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/inventory/:id - Update inventory stock
 */
export async function handleUpdateInventory(env, id, request, corsHeaders) {
  try {
    // Verify product exists
    const existing = await env.DB.prepare(
      'SELECT * FROM inventory WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate action for stock history
    const action = data.action;
    if (action && !['in', 'out', 'adjustment'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action. Must be: in, out, or adjustment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const stock = parseInt(data.stock);
    const price = parseFloat(data.price) !== undefined ? parseFloat(data.price) : existing.price;

    if (isNaN(stock) || stock < 0 || stock > 1000000) {
      return new Response(JSON.stringify({ error: 'Invalid stock value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (isNaN(price) || price < 0) {
      return new Response(JSON.stringify({ error: 'Invalid price value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate qty_change for history
    const qtyChange = action === 'in'
      ? Math.max(0, stock - existing.stock)
      : action === 'out'
        ? Math.max(0, existing.stock - stock)
        : stock - existing.stock;

    // Update inventory
    await env.DB.prepare(`
      UPDATE inventory SET stock = ?, price = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).bind(stock, price, id).run();

    // Record in history only if action is specified
    if (action) {
      await env.DB.prepare(`
        INSERT INTO inventory_history (product_id, action, qty, note, stock_after, timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).bind(
        id,
        action,
        qtyChange,
        (data.note || '').slice(0, 500),
        stock
      ).run();
    }

    return new Response(JSON.stringify({
      id,
      stock,
      price,
      message: 'Inventory updated'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Inventory PUT] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to update inventory' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * DELETE /api/inventory/:id - Delete inventory item
 */
export async function handleDeleteInventory(env, id, corsHeaders) {
  try {
    // Verify product exists
    const existing = await env.DB.prepare(
      'SELECT id FROM inventory WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete inventory (history is kept for audit)
    await env.DB.prepare('DELETE FROM inventory WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({
      ok: true,
      id,
      message: 'Product deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Inventory DELETE] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to delete inventory' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
