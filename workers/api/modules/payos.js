// payos.js - PayOS payment handlers for K-Beauty Order API

import { hmacSha256Hex } from './utils.js';

/**
 * POST /api/payos/create - Create PayOS payment link
 */
export async function handlePayosCreate(env, request, corsHeaders) {
  try {
    const data = await request.json();
    const amount = parseInt(data.amount);
    const description = (data.description || data.orderId || '').slice(0, 25);
    const orderId = data.orderId;

    if (!orderId || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'invalid data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const orderCode = parseInt(orderId.replace(/\D/g, '').slice(-9)) || (Math.floor(Date.now() / 1000) % 1000000000);

    try {
      await env.DB.prepare('UPDATE orders SET payosOrderCode = ? WHERE id = ?').bind(orderCode, orderId).run();
    } catch(e) {}

    const bodyObj = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      returnUrl: `https://k-beauty-order.pages.dev/order-form.html?payment=success&orderId=${orderId}`,
      cancelUrl: `https://k-beauty-order.pages.dev/order-form.html?payment=cancel&orderId=${orderId}`
    };

    const keys = ['amount', 'cancelUrl', 'description', 'orderCode', 'returnUrl'];
    const signStr = keys.map(k => `${k}=${bodyObj[k]}`).join('&');
    const secretKey = env.PAYOS_CHECKSUM_KEY || 'a4669a5b140d1eec4a0a99958fc9ffe9f13b17febf98f5e1cb1b3696c1f5c215';
    bodyObj.signature = await hmacSha256Hex(signStr, secretKey);

    const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': env.PAYOS_CLIENT_ID || 'fc629595-4d68-4cea-951c-37002f6072dd',
        'x-api-key': env.PAYOS_API_KEY || 'ab05c764-aee8-4e05-bd8a-28ee819f2561'
      },
      body: JSON.stringify(bodyObj)
    });

    const pres = await res.json();
    if (pres.code === "00" && pres.data) {
      return new Response(JSON.stringify({
        checkoutUrl: pres.data.checkoutUrl,
        orderCode: orderCode
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'PayOS err', details: pres }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /webhook/payos - PayOS webhook handler
 */
export async function handlePayosWebhook(env, request, corsHeaders) {
  try {
    const data = await request.json();
    if (data.code === "00" && data.data && data.data.orderCode) {
      const order = await env.DB.prepare('SELECT id FROM orders WHERE payosOrderCode = ?').bind(data.data.orderCode).first();
      if (order) {
        await env.DB.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").bind(order.id).run();
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
