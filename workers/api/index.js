// Cloudflare Worker API for K-Beauty Order
// Refactored with ES Modules - 2026-03-26

import {
  resolveAllowedOrigin,
  buildCorsHeaders,
  checkRateLimit,
  rateLimitedResponse,
  verifyAdmin,
  verifyCustomer,
  safeId,
} from './modules/utils.js';

import {
  handleRegister,
  handleLogin,
  handleAdminLogin,
  handleAuthMe,
  handleChangePassword,
} from './modules/auth.js';

import {
  handleGetOrders,
  handleCreateOrder,
  handleUpdateOrder,
  handleDeleteOrder,
  handleGetStats,
  handleGetCustomers,
  handleGetCustomerByPhone,
  handleUpsertCustomer,
  handleUpdateTier,
  handleSeedCustomers,
  handleGetCart,
  handlePutCart,
  handleClearCart,
} from './modules/orders.js';

import {
  handleGetInventory,
  handleCreateInventory,
  handleUpdateInventory,
  handleDeleteInventory,
} from './modules/inventory.js';

import {
  handlePayosCreate,
  handlePayosWebhook,
} from './modules/payos.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const allowedOrigin = resolveAllowedOrigin(request, env);
    const corsHeaders = buildCorsHeaders(allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Global rate limit
    const clientIP = request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
      || 'unknown';

    const globalCheck = await checkRateLimit(env, clientIP, 'global');
    if (globalCheck.limited) {
      return rateLimitedResponse(corsHeaders, globalCheck.resetIn);
    }

    try {
      // AUTH ROUTES
      if (path === '/api/auth/register' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleRegister(env, request, corsHeaders);
      }
      if (path === '/api/auth/login' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleLogin(env, request, corsHeaders);
      }
      if (path === '/api/admin/login' && request.method === 'POST') {
        const body = await request.clone().json().catch(() => ({}));
        const usernameKey = `${clientIP}:${(body.username || '').slice(0, 32)}`;
        const rl = await checkRateLimit(env, usernameKey, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleAdminLogin(env, request, corsHeaders);
      }
      if (path === '/api/auth/me' && request.method === 'GET') {
        const rl = await checkRateLimit(env, clientIP, 'auth_normal');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleAuthMe(env, request, corsHeaders);
      }
      if (path === '/api/auth/change-password' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'auth_strict');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleChangePassword(env, request, corsHeaders);
      }

      // ORDERS API
      if (path === '/api/orders' && request.method === 'GET') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleGetOrders(env, corsHeaders);
      }
      if (path === '/api/orders' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'order_write');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handleCreateOrder(env, request, corsHeaders);
      }
      if (path.startsWith('/api/orders/') && request.method === 'PUT') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]);
        if (!id) return badRequest(corsHeaders);
        return handleUpdateOrder(env, id, request, corsHeaders);
      }
      if (path.startsWith('/api/orders/') && request.method === 'DELETE') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]);
        if (!id) return badRequest(corsHeaders);
        return handleDeleteOrder(env, id, corsHeaders);
      }

      // INVENTORY API
      if (path === '/api/inventory' && request.method === 'GET') {
        return handleGetInventory(env, corsHeaders);
      }
      if (path === '/api/inventory' && request.method === 'POST') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleCreateInventory(env, request, corsHeaders);
      }
      if (path.startsWith('/api/inventory/') && request.method === 'PUT') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]);
        if (!id) return badRequest(corsHeaders);
        return handleUpdateInventory(env, id, request, corsHeaders);
      }
      if (path.startsWith('/api/inventory/') && request.method === 'DELETE') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const id = safeId(path.split('/')[3]);
        if (!id) return badRequest(corsHeaders);
        return handleDeleteInventory(env, id, corsHeaders);
      }

      // STATS API
      if (path === '/api/stats' && request.method === 'GET') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleGetStats(env, corsHeaders);
      }

      // CUSTOMERS API
      if (path === '/api/customers' && request.method === 'GET') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleGetCustomers(env, url, corsHeaders);
      }
      if (path.startsWith('/api/customers/') && request.method === 'GET') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleGetCustomerByPhone(env, path, corsHeaders);
      }
      if (path === '/api/customers' && request.method === 'POST') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleUpsertCustomer(env, request, corsHeaders);
      }
      if (path.includes('/api/customers/') && path.endsWith('/tier') && request.method === 'PUT') {
        const admin = await verifyAdmin(request, env);
        if (!admin) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleUpdateTier(env, path, request, corsHeaders);
      }
      if (path === '/api/seed/customers' && request.method === 'POST') {
        const seedSecret = env.SEED_SECRET || '';
        const provided = request.headers.get('X-Seed-Secret') || '';
        if (!seedSecret || provided !== seedSecret) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleSeedCustomers(env, request, corsHeaders);
      }

      // CART API
      if (path === '/api/cart' && request.method === 'GET') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleGetCart(env, customer.customerId, corsHeaders);
      }
      if (path === '/api/cart' && request.method === 'PUT') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handlePutCart(env, customer.customerId, request, corsHeaders);
      }
      if (path === '/api/cart' && request.method === 'DELETE') {
        const customer = await verifyCustomer(request, env);
        if (!customer) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return handleClearCart(env, customer.customerId, corsHeaders);
      }

      // PayOS
      if (path === '/api/payos/create' && request.method === 'POST') {
        const rl = await checkRateLimit(env, clientIP, 'order_write');
        if (rl.limited) return rateLimitedResponse(corsHeaders, rl.resetIn);
        return handlePayosCreate(env, request, corsHeaders);
      }
      if (path === '/webhook/payos' && request.method === 'POST') {
        return handlePayosWebhook(env, request, corsHeaders);
      }

      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404
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

// Helper: 400 Bad Request
function badRequest(corsHeaders) {
  return new Response(JSON.stringify({ error: 'Invalid resource id' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
