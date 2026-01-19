class App {
    chart;
    init() {
        console.log("App started");
        document.getElementById("loginscreen").style.display = "none";
        document.getElementById("app").style.display = "flex"; 
        document.getElementById("accountname").innerText = "Welcome, " + localStorage.getItem("username");
        this.buttonsInit();
        this.chartInit();
    }
    chartInit() {
        const ctx = document.getElementById('chart').getContext('2d');
        this.chart = new Chart(ctx, {
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
                scales: {
                    x: {
                        display: true,  
                        title: {
                            display: true,
                            text: 'X-Axis'
                        }
                    },
                    y: {
                        display: true,      
                        title: {
                            display: true,
                            text: 'Y-Axis'  
                        }
                    }
                }
            }
        });
    }

    buttonsInit(){
        document.getElementById("logoutbutton").addEventListener("click", () => {
            this.logout();
        });
        
    }

    logout(){
        console.log("Logging out, clearing local storage");
        localStorage.clear();
        location.reload();
    }
}

let appInstance = new App();
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
                appInstance.init();
        } else {
                document.getElementById("loginerror").innerText = "Invalid credentials. Please try again.";  
            }
        });
    }
else {
        appInstance.init();
    }