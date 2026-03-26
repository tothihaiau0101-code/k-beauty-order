// utils.js - Shared utilities for K-Beauty Order API

/**
 * Return the request's Origin if it's in the allowlist, otherwise null.
 * @param {Request} request
 * @param {object} env
 * @returns {string|null}
 */
export function resolveAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  const CORS_ALLOWED_ORIGINS = [
    'https://k-beauty-order.pages.dev',
    'https://beapop.pages.dev',
    'https://036b49c2.k-beauty-order.pages.dev',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000',
  ];

  const extra = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const allowed = [...CORS_ALLOWED_ORIGINS, ...extra];
  if (allowed.includes(origin)) return origin;

  // Allow any ephemeral Cloudflare Pages preview endpoints
  if (origin.endsWith('.k-beauty-order.pages.dev') || origin.endsWith('.beapop.pages.dev')) {
     return origin;
  }

  return null;
}

/**
 * Build CORS headers
 * @param {string|null} allowedOrigin
 * @returns {object}
 */
export function buildCorsHeaders(allowedOrigin) {
  return {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, Authorization, X-Seed-Secret',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

// ── RATE LIMITING ────────────────────────────────────────────────────────────

const RATE_LIMIT_RULES = {
  auth_strict: { max: 5,   windowSecs: 60  },
  auth_normal: { max: 15,  windowSecs: 60  },
  order_write: { max: 10,  windowSecs: 60  },
  write:       { max: 30,  windowSecs: 60  },
  global:      { max: 200, windowSecs: 60  },
};

/**
 * Check and increment rate-limit counter.
 * @param {object} env
 * @param {string} ip
 * @param {string} category
 * @returns {Promise<{limited: boolean, remaining: number, resetIn: number}>}
 */
export async function checkRateLimit(env, ip, category) {
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
    return { limited: false, remaining: 999, resetIn: 60 };
  }
}

/**
 * Build a 429 Too Many Requests response.
 */
export function rateLimitedResponse(corsHeaders, resetIn) {
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

// ── CRYPTO HELPERS ──────────────────────────────────────────────────────────

/**
 * SHA256 hash (for password hashing only — NOT for JWT signatures)
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 for JWT signatures
 */
export async function hmacSha256Hex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password with salt
 */
export async function hashPassword(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = await sha256(password + salt);
  return salt + ':' + hash;
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const newHash = await sha256(password + salt);
  return newHash === hash;
}

/**
 * Base64URL encode
 */
export function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sign JWT token with expiry
 * Requires JWT_SECRET to be set in environment variables
 */
export async function signJWT(payload, env, expirySeconds = 604800) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured - set via wrangler secret put JWT_SECRET');
  }
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expirySeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sigHex = await hmacSha256Hex(signatureInput, secret);
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  return `${signatureInput}.${base64UrlEncode(sigBytes)}`;
}

/**
 * Verify JWT token
 * Requires JWT_SECRET to be set in environment variables
 */
export async function verifyJWT(token, env) {
  try {
    const secret = env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry
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

/**
 * Extract bearer token from request
 */
export function getBearerToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Safe resource ID from URL path segment
 */
export function safeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = decodeURIComponent(raw).trim();
  if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(clean)) return null;
  return clean;
}

/**
 * Calculate loyalty tier based on total spent
 */
export function calcTier(spent) {
  if (spent >= 10000000) return 'Platinum';
  if (spent >= 5000000)  return 'Gold';
  if (spent >= 1000000)  return 'Silver';
  return 'Bronze';
}

/**
 * Verify admin JWT token
 */
export async function verifyAdmin(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

/**
 * Verify customer JWT token
 */
export async function verifyCustomer(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = await verifyJWT(token, env);
  if (!payload || payload.role !== 'customer') return null;
  return payload;
}
