let chart;

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
    document.getElementById("logoutbutton").addEventListener("click", () => {
        logout();
    });
}

function logout(){
    console.log("Logging out, clearing local storage");
    localStorage.clear();
    location.reload();
}

let loggedin = !!localStorage.getItem("loggedin")?true:false;
let loginscreen = document.getElementById("loginscreen");
loginscreen.style.display = loggedin ? "none" : "flex";
if(!loggedin) {
    let loginform = document.getElementById("loginform");
    loginform.addEventListener("submit", function(event) {
        event.preventDefault();
        let username = document.getElementById("username").value;
        let password = document.getElementById("password").value;
        if(username === "admin1" && password === "admin1") {
            localStorage.setItem("loggedin", "true");
            localStorage.setItem("username", username);
            init();
        } else {
            document.getElementById("loginerror").innerText = "Invalid credentials. Please try again.";
        }
    });
} else {
    init();
}