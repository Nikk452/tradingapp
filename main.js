let chart;
let dragging = false;
let loggedin = localStorage.getItem("loggedin") === "true";
let user;
let loginscreen = document.getElementById("loginscreen");
let loginform = document.getElementById("loginform");

const left = document.getElementById('left');
const splitter = document.getElementById('splitter');
const container = document.getElementById('container');

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

function init() {
    console.log("App started");
    document.getElementById("loginscreen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("accountname").innerText = "Welcome, " + localStorage.getItem("username");
    buttonsInit();
    chartInit();
}

function chartInit() {
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Sample Data',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
        }
    });
    let candledata = [10, 20, 15, 25, 30, 28, 35, 40, 45, 50, 55, 60, 65, 40, 30, 20, 10, 50];
    chart.data.datasets[0].data = candledata;
    chart.data.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    chart.update();
}

function buttonsInit(){
    document.getElementById("logoutbutton").addEventListener("click", logout);
    clearCredsBtn.addEventListener('click', clearStoredCredentials);
    splitter.addEventListener('mousedown', e => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
    document.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.cursor = '';
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
    } else {
        updateStorageStatus(false);
    }
}

// Save credentials to localStorage
function saveCredentials(key, secret) {
    localStorage.setItem(STORAGE_KEYS.apiKey, key);
    localStorage.setItem(STORAGE_KEYS.apiSecret, secret);
    updateStorageStatus(true);
}

// Clear stored credentials
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

// Update the saved credentials indicator
function updateStorageStatus(isSaved) {
  if (storageStatus) {
    if (isSaved) {
        storageStatus.textContent = '💾 Credentials saved locally';
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
    
    // Call local backend server to verify credentials
    const response = await fetch(`http://localhost:3000/verify-api?key=${encodeURIComponent(key)}&secret=${encodeURIComponent(secret)}`);
    
    const data = await response.json();
    
    if (data.success) {
      apiConnected = true;
      apiStatusBadge.textContent = 'Connected ✓';
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

connectBtn.addEventListener('click', async () => {
  apiKey = apiKeyInput.value.trim();
  apiSecret = apiSecretInput.value.trim();
  
  if (!apiKey || !apiSecret) {
    apiStatusBadge.textContent = 'Error: Missing credentials';
    apiStatusBadge.className = 'status-badge status-disconnected';
    return;
  }
  
  // Verify API credentials with actual request
  const success = await verifyBinanceAPI(apiKey, apiSecret);
  
  // If verification successful, save credentials
  if (success) {
    saveCredentials(apiKey, apiSecret);
  }
});

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