let dragging = false;
let loggedin = localStorage.getItem("loggedin") === "true";
let user;
let loginscreen = document.getElementById("loginscreen");
let loginform = document.getElementById("loginform");

const left = document.getElementById('left');
const splitter = document.getElementById('splitter');
const container = document.getElementById('container');
const canvas = document.getElementById('chart');
const apiKeyInput = document.getElementById('apiKey');
const apiSecretInput = document.getElementById('apiSecret');
const connectBtn = document.getElementById('connectBtn');
const clearCredsBtn = document.getElementById('clearCredsBtn');
const apiStatusBadge = document.getElementById('apiStatus');
const storageStatus = document.getElementById('savedStorageStatus');

const symbolInput = document.getElementById('symbol');
const updateSymbolBtn = document.getElementById('updateSymbolBtn');
const intervalSelect = document.getElementById('interval');
const chartTypeSelect = document.getElementById('chartType');

const wsStatusBadge = document.getElementById('wsStatus');
const wsPriceDisplay = document.getElementById('wsPrice');
let panning = false;
let panStart = 0;
let ws = null;
let currentSymbol = 'BTCUSDT';
let currentInterval = '1m';
let apiKey = '';
let apiSecret = '';
let apiConnected = false;

const STORAGE_KEYS = {
  apiKey: 'binance_api_key',
  apiSecret: 'binance_api_secret',
  loggedin: 'loggedin',
  user: 'username'
};
let candleData = [];
let currentChartType = 'candlestick';
let allHistoricalData = [];
let isLoadingMoreData = false;

const ctx = document.getElementById('chart').getContext('2d');

const chartConfig = {
  type: 'candlestick',
  data: {
    datasets: [{
      label: currentSymbol,
      data: candleData,
      color: {up: '#26a69a', down: '#ef5350'}
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {display: false},
      tooltip: {
        callbacks: {
          title: function(context) {
            if (!context || !context[0]) return '';
            const v = context[0].parsed && context[0].parsed.x ? context[0].parsed.x : context[0].parsed;
            return formatTime(v);
          },
          label: function(context) {
            const p = context.parsed;
            if (p && p.c !== undefined) return `Close: ${p.c}`;
            if (p && p.y !== undefined) return `Value: ${p.y}`;
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {color: '#fff'}
      },
      x: {
        type: 'linear',
        ticks: {
          color: '#fff',
          callback: function(value) {
            try { return formatTime(value); } catch (e) { return value; }
          }
        }
      }
    }
  }
};

function formatTime(ts) {
    try {
        const d = new Date(Number(ts));
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (e) {
        return String(ts);
    }
}

let chart = new Chart(ctx, chartConfig);
let viewMinX = null;
let viewMaxX = null;

function init() {
    console.log("Trading App started");
    loginscreen.style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("accountname").innerText = "Welcome, " + localStorage.getItem("username");
    buttons();
    loadHistoricalData()
    connectWebSocket();
}

function buttons(){
    document.getElementById("logoutbutton").addEventListener("click", logout);
    clearCredsBtn.addEventListener('click', clearStoredCredentials);
    splitter.addEventListener('mousedown', e => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            panning = true;
            panStart = e.clientX;
            canvas.style.cursor = 'grabbing';
        }
    });
    document.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.cursor = '';
        if (panning) {
            panning = false;
            canvas.style.cursor = 'grab';
        }
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const rect = container.getBoundingClientRect();
        let newLeftPx = e.clientX - rect.left;
        const min = 80;
        const max = rect.width - 120;
        if (newLeftPx < min) newLeftPx = min;
        if (newLeftPx > max) newLeftPx = max;
        left.style.width = newLeftPx + 'px';
    });
    canvas.parentElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!chart.scales.x || candleData.length === 0) return;
        const fullMin = candleData[0].x;
        const fullMax = candleData[candleData.length - 1].x;
        const currentMin = viewMinX !== null ? viewMinX : fullMin;
        const currentMax = viewMaxX !== null ? viewMaxX : fullMax;
        const range = currentMax - currentMin;
        const zoomFactor = 0.1;
        const minDataPoints = 2;
        const minRange = minDataPoints * 60000;
        const center = (currentMin + currentMax) / 2;
        if (e.deltaY < 0) {
            const newRange = range * (1 - zoomFactor);
            if (newRange >= minRange) {
                viewMinX = center - newRange / 2;
                viewMaxX = center + newRange / 2;
                chart.options.scales.x.min = viewMinX;
                chart.options.scales.x.max = viewMaxX;
                chart.update('none');
            }
        } else {
            const newRange = range * (1 + zoomFactor);
            const maxRange = fullMax - fullMin;
            if (newRange <= maxRange) {
                viewMinX = center - newRange / 2;
                viewMaxX = center + newRange / 2;
                chart.options.scales.x.min = viewMinX;
                chart.options.scales.x.max = viewMaxX;
                chart.update('none');
            } else {
                viewMinX = null;
                viewMaxX = null;
                chart.options.scales.x.min = undefined;
                chart.options.scales.x.max = undefined;
                chart.update('none');
            }
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!panning || !chart.scales.x || candleData.length === 0) {
            canvas.style.cursor = 'grab';
            return;
        }
        const fullMin = candleData[0].x;
        const fullMax = candleData[candleData.length - 1].x;
        const currentMin = viewMinX !== null ? viewMinX : fullMin;
        const currentMax = viewMaxX !== null ? viewMaxX : fullMax;
        const range = currentMax - currentMin;
        const pixelsPerMillisecond = canvas.width / range;
        const diff = e.clientX - panStart;
        const timeShift = -diff / pixelsPerMillisecond;
        let newMin = currentMin + timeShift;
        let newMax = currentMax + timeShift;
        viewMinX = newMin;
        viewMaxX = newMax;
        chart.options.scales.x.min = viewMinX;
        chart.options.scales.x.max = viewMaxX;
        chart.update('none');
        panStart = e.clientX;
    });
    canvas.addEventListener('dblclick', () => {
        viewMinX = null;
        viewMaxX = null;
        chart.options.scales.x.min = undefined;
        chart.options.scales.x.max = undefined;
        chart.update('none');
    });
    connectBtn.addEventListener('click', () => {
        connectAPI()
    })
    updateSymbolBtn.addEventListener('click', () => {
        const newSymbol = symbolInput.value.toUpperCase().trim();
        if (!newSymbol) {
            console.error('Symbol cannot be empty');
            return;
        }
        currentSymbol = newSymbol;
        console.log('Updated symbol to:', currentSymbol);
        loadHistoricalData();
        connectWebSocket();
    });

    intervalSelect.addEventListener('change', (e) => {
        currentInterval = e.target.value;
        console.log('Updated interval to:', currentInterval);
        loadHistoricalData();
        connectWebSocket();
    });

    chartTypeSelect.addEventListener('change', (e) => {
        currentChartType = e.target.value;
        updateChartType();
    });
}

async function connectAPI() {
    apiKey = apiKeyInput.value.trim();
    apiSecret = apiSecretInput.value.trim();
    if (!apiKey || !apiSecret) {
        apiStatusBadge.textContent = 'Error: Missing credentials';
        apiStatusBadge.className = 'status-badge status-disconnected';
        return;
    }
    const success = await verifyBinanceAPI(apiKey, apiSecret);
    if (success) {
        saveCredentials(apiKey, apiSecret);
    }
}

function logout(){
    console.log("Logging out, clearing local storage");
    clearStoredCredentials()
    location.reload();
}

function loadStoredCredentials() {
    const storedKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    const storedSecret = localStorage.getItem(STORAGE_KEYS.apiSecret);
    if (storedKey && storedSecret) {
        apiKeyInput.value = storedKey;
        apiSecretInput.value = storedSecret;
        apiKey = storedKey;
        apiSecret = storedSecret;
        updateStorageStatus(true);
        console.log('Loaded stored API credentials');
        connectAPI();
    } else {
        updateStorageStatus(false);
    }
}

function saveCredentials(key, secret) {
    localStorage.setItem(STORAGE_KEYS.apiKey, key);
    localStorage.setItem(STORAGE_KEYS.apiSecret, secret);
    updateStorageStatus(true);
}

function clearStoredCredentials() {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
    localStorage.removeItem(STORAGE_KEYS.apiSecret);
    localStorage.removeItem(STORAGE_KEYS.loggedin);
    localStorage.removeItem(STORAGE_KEYS.user);
    apiKeyInput.value = '';
    apiSecretInput.value = '';
    apiKey = '';
    apiSecret = '';
    apiConnected = false;
    apiStatusBadge.textContent = 'Disconnected';
    apiStatusBadge.className = 'status-badge status-disconnected';
    updateStorageStatus(false);
    console.log('Cleared stored credentials');
}

function updateStorageStatus(isSaved) {
  if (storageStatus) {
    if (isSaved) {
        storageStatus.textContent = 'Credentials saved locally';
        storageStatus.className = 'saved-indicator saved';
        clearCredsBtn.style.display = 'inline-block';
    } else {
        storageStatus.textContent = '(Not saved)';
        storageStatus.className = 'saved-indicator not-saved';
        clearCredsBtn.style.display = 'none';
    }
  }
}

async function verifyBinanceAPI(key, secret) {
  try {
    apiStatusBadge.textContent = 'Connecting...';
    apiStatusBadge.className = 'status-badge status-loading';
    const response = await fetch(`http://localhost:3000/verify-api?key=${encodeURIComponent(key)}&secret=${encodeURIComponent(secret)}`);
    const data = await response.json();
    if (data.success) {
      apiConnected = true;
      apiStatusBadge.textContent = 'Connected';
      apiStatusBadge.className = 'status-badge status-connected';
      console.log('API Connection Verified! Account:', data.accountType);
      return true;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    apiConnected = false;
    apiStatusBadge.textContent = `Error: ${error.message}`;
    apiStatusBadge.className = 'status-badge status-disconnected';
    console.error('API Connection Failed:', error);
    return false;
  }
}

async function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        closeWebSocket();
    }
    const stream = `${currentSymbol.toLowerCase()}@kline_${currentInterval}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;
    try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            console.log('WebSocket connected for', stream);
            console.log('ws state', ws?.readyState)
            wsStatusBadge.textContent = 'Connected';
            wsStatusBadge.className = 'status-badge status-connected';
        };
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const kline = message.k;
            wsPriceDisplay.textContent = `$${parseFloat(kline.c).toFixed(2)}`;
            if (kline.x <= Date.now()) {
                const candle = {
                x: kline.t,
                o: parseFloat(kline.o),
                h: parseFloat(kline.h),
                l: parseFloat(kline.l),
                c: parseFloat(kline.c)
            };
            const existingIndex = candleData.findIndex(c => c.x === candle.x);
            if (existingIndex >= 0) {
                candleData[existingIndex] = candle;
                allHistoricalData[allHistoricalData.findIndex(c => c.x === candle.x)] = candle;
            } else {
                candleData.push(candle);
                allHistoricalData.push(candle);
            }
            updateChartData();
            }
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            wsStatusBadge.textContent = 'Error';
            wsStatusBadge.className = 'status-badge status-disconnected';
        };
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            console.log('ws state', ws?.readyState)
            wsStatusBadge.textContent = 'Disconnected';
            wsStatusBadge.className = 'status-badge status-disconnected';
        };
    } catch (error) {
        console.error('Error creating WebSocket:', error);
        wsStatusBadge.textContent = 'Failed';
        wsStatusBadge.className = 'status-badge status-disconnected';
    }
}

function closeWebSocket() {
  if (!ws) return Promise.resolve();
  return new Promise(resolve => {
    const socket = ws;
    const onClose = () => {
      socket.removeEventListener('close', onClose);
      if (ws === socket) ws = null;
      resolve();
    };
    socket.addEventListener('close', onClose);
    try { socket.close(); } catch (e) { onClose(); }
  });
}

async function fetchBinanceKlines(beforeTime = null) {
    try {
        const limit = 100;
        let url = `https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=${currentInterval}&limit=${limit}`;
    
        if (beforeTime) {
            url += `&endTime=${beforeTime - 1}`;
        }
    
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
        const data = await response.json();
        return data.map(kline => ({
            x: kline[0], // timestamp
            o: parseFloat(kline[1]), // open
            h: parseFloat(kline[2]), // high
            l: parseFloat(kline[3]), // low
            c: parseFloat(kline[4])  // close
        }));
    } catch (error) {
        console.error('Error fetching Binance klines:', error);
        return [];
    }
}

async function fetchMoreHistoricalData() {
    if (isLoadingMoreData || allHistoricalData.length === 0) return;
    
    isLoadingMoreData = true;
    const earliestTime = allHistoricalData[0].x;
    const newData = await fetchBinanceKlines(earliestTime);
    
    if (newData.length > 0) {
        allHistoricalData = [...newData, ...allHistoricalData];
        console.log('Loaded more historical data. Total candles:', allHistoricalData.length);
    }
    
    isLoadingMoreData = false;
}

function getVisibleCandles() {
  if (allHistoricalData.length === 0) return [];
  
  if (viewMinX === null || viewMaxX === null) {
    return allHistoricalData;
  }
  const viewRange = viewMaxX - viewMinX;
  const bufferTime = viewRange * 0.5;
  
  const filterMin = viewMinX - bufferTime;
  const filterMax = viewMaxX + bufferTime;
  
  if (allHistoricalData.length > 0 && viewMinX < allHistoricalData[0].x) {
    fetchMoreHistoricalData();
  }
  
  return allHistoricalData.filter(candle => 
    candle.x >= filterMin && candle.x <= filterMax
  );
}

function convertToLineData(candleData) {
    return candleData.map(candle => ({
        x: candle.x,
        y: candle.c
    }));
}

function updateChartData() {
    const visibleData = getVisibleCandles();
    let data;
    if (currentChartType === 'candlestick') {
        data = visibleData;
    } else {
        data = convertToLineData(visibleData);
    }
    chart.data.datasets[0].label = currentSymbol;
    chart.data.datasets[0].data = data;
    chart.update();
}

function updateChartType() {
    chart.destroy();
    const visibleData = getVisibleCandles();
    let data;
    if (currentChartType === 'candlestick') {
        data = visibleData;
    } else {
        data = convertToLineData(visibleData);
    }
    const newConfig = {
        type: currentChartType,
        data: {
            datasets: [{
                label: currentSymbol,
                data: data,
                color: {up: '#26a69a', down: '#ef5350'},
                borderColor: currentChartType === 'candlestick' ? undefined : '#26a69a',
                borderWidth: currentChartType === 'candlestick' ? 0 : 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {display: false}
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {color: '#fff'}
                },
                x: {
                    type: 'linear',
                    ticks: {color: '#fff'}
                }
            }
        }
    };
    chart = new Chart(ctx, newConfig);
    viewMinX = null;
    viewMaxX = null;
}

async function loadHistoricalData() {
    const data = await fetchBinanceKlines();
    allHistoricalData = data;
    candleData = data;
    updateChartData();
}

window.addEventListener('DOMContentLoaded', loadStoredCredentials);
loginscreen.style.display = loggedin ? "none" : "flex";
if(!loggedin) {
    loginform.addEventListener("submit", function(event) {
        event.preventDefault();
        let username = document.getElementById("username").value;
        let password = document.getElementById("password").value;
        if(username === "admin1" && password === "admin1") {
            localStorage.setItem(STORAGE_KEYS.loggedin, "true");
            localStorage.setItem(STORAGE_KEYS.user, username);
            init();
        } else {
            document.getElementById("loginerror").innerText = "Invalid credentials. Please try again.";
        }
    });
} else {
    init();
}