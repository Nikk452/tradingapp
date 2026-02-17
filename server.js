const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const PORT = process.env.PORT || 3000;
function signBinanceRequest(params, secret) {
  const qs = new URLSearchParams(params).toString();
  const signature = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  return { ...params, signature };
}
async function verifyBinance(key, secret) {
  try {
    const timestamp = Date.now();
    const qs = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(qs).digest('hex');
    const url = `https://api.binance.com/api/v3/account?${qs}&signature=${signature}`;
    const res = await fetch(url, { headers: { 'X-MBX-APIKEY': key } });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, status: res.status, error: text };
    }
    const data = await res.json();
    return { success: true, accountType: data.accountType || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function getAccountInfo(key, secret) {
  try {
    const timestamp = Date.now();
    const params = { timestamp };
    const qs = new URLSearchParams(params).toString();
    const signature = crypto.createHmac('sha256', secret).update(qs).digest('hex');
    const url = `https://api.binance.com/api/v3/account?${qs}&signature=${signature}`;
    const res = await fetch(url, { headers: { 'X-MBX-APIKEY': key } });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text };
    }
    const data = await res.json();
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function placeOrder(key, secret, symbol, side, type, quantity, price = null) {
  try {
    const timestamp = Date.now();
    const params = { symbol, side, type, quantity: parseFloat(quantity).toString(), timestamp };
    if (type === 'LIMIT' && price) {
      params.price = parseFloat(price).toString();
      params.timeInForce = 'GTC';
    }
    const qs = new URLSearchParams(params).toString();
    const signature = crypto.createHmac('sha256', secret).update(qs).digest('hex');
    const url = `https://api.binance.com/api/v3/order?${qs}&signature=${signature}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': key }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, msg: data.msg || 'Order failed', code: data.code };
    }
    return { success: true, ...data };
  } catch (err) {
    return { success: false, msg: err.message };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === '/verify-api') {
    const key = url.searchParams.get('key');
    const secret = url.searchParams.get('secret');
    if (!key || !secret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing key or secret' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await verifyBinance(key, secret);
    return res.end(JSON.stringify(result));
  }

  if (url.pathname === '/account') {
    const key = url.searchParams.get('key');
    const secret = url.searchParams.get('secret');
    if (!key || !secret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing key or secret' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await getAccountInfo(key, secret);
    return res.end(JSON.stringify(result));
  }

  if (url.pathname === '/place-order') {
    const key = url.searchParams.get('key');
    const secret = url.searchParams.get('secret');
    const symbol = url.searchParams.get('symbol');
    const side = url.searchParams.get('side');
    const type = url.searchParams.get('type');
    const quantity = url.searchParams.get('quantity');
    const price = url.searchParams.get('price');

    if (!key || !secret || !symbol || !side || !type || !quantity) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, msg: 'Missing required parameters' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await placeOrder(key, secret, symbol, side, type, quantity, price);
    return res.end(JSON.stringify(result));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
  console.log('Shutting down server');
  server.close(() => process.exit(0));
});
