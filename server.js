const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
  console.log('Shutting down server');
  server.close(() => process.exit(0));
});
