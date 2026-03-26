// auth.js - Authentication handlers for K-Beauty Order API

import {
  sha256,
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
  getBearerToken,
  calcTier,
} from './utils.js';

const JWT_EXPIRY_CUSTOMER = 7 * 24 * 3600;
const JWT_EXPIRY_ADMIN = 8 * 3600;

/**
 * POST /api/auth/register - Register new customer
 */
export async function handleRegister(env, request, corsHeaders) {
  try {
    const { phone, name, password } = await request.json();

    if (!phone || !name || !password) {
      return new Response(JSON.stringify({ error: 'Missing phone, name, or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

/**
 * POST /api/auth/login - Login customer
 */
export async function handleLogin(env, request, corsHeaders) {
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

/**
 * POST /api/admin/login - Admin login
 */
export async function handleAdminLogin(env, request, corsHeaders) {
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

/**
 * GET /api/auth/me - Get current customer profile
 */
export async function handleAuthMe(env, request, corsHeaders) {
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

/**
 * POST /api/auth/change-password - Change customer password
 */
export async function handleChangePassword(env, request, corsHeaders) {
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
