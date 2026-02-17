# Trading App

A real-time cryptocurrency trading dashboard with live charting and spot trading via Binance API.

## Features

- **Live Charts** — Real-time candlestick/line charts with WebSocket price updates
- **Spot Trading** — Buy/sell crypto directly from the dashboard
- **Wallet Management** — View and track your Binance account balances
- **Secure API** — Backend-proxied API calls with HMAC-SHA256 signing
- **Dark UI** — Modern dark theme with responsive layout
- **Symbol/Interval Control** — Switch between trading pairs and timeframes instantly

## Requirements
- Node.js 14+
- Binance API key + secret with **Spot & Margin Trading** enabled
- Modern web browser

## Setup
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server:**
   ```bash
   node server.js
   # Server runs on http://localhost:3000 by default
   # Set PORT=8000 node server.js to use a different port
   ```

3. **Open the app:**
   - Open `index.html` in your browser (or serve it via a local web server)

4. **Connect Binance API:**
   - Log in with your api credentials ` key / secret `
   - (Keys must have **Spot & Margin Trading** enabled and IP whitelist configured)

## Usage

- **View Chart** — Select symbol and interval, scroll/pan to explore
- **Check Balance** — Click "Refresh Balances" to see your wallet
- **Place Order** — Select side (BUY/SELL), type (MARKET/LIMIT), amount, price, then click "Place Order"
- **Use Max** — Auto-fills the maximum amount you can buy/sell

## API Endpoints (Backend)

- `GET /verify-api?key=...&secret=...` — Verify API credentials
- `GET /account?key=...&secret=...` — Fetch account balances
- `GET /place-order?key=...&secret=...&symbol=...&side=...&type=...&quantity=...` — Place an order

## Files
- `index.html` — UI structure
- `main.js` — Frontend logic (charting, trading, WebSocket)
- `styles.css` — Dark theme styling
- `server.js` — Backend (API proxy, signing, verification)

## Security Notes
- Never commit API keys to version control
- Keep keys in environment variables or local storage only
- Use IP whitelist on Binance for extra protection

## Troubleshooting
- **"Invalid API-key" error** — Check IP whitelist on Binance API Management
- **WebSocket disconnects** — Normal; auto-reconnects when symbol/interval changes
- **Can't place orders** — Verify "Spot & Margin Trading" is enabled on your Binance key
