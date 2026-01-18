class app {
    start() {
        console.log("App started");
        document.getElementById("loginscreen").style.display = "none";
        document.getElementById("app").style.display = "block"; 
        localStorage.setItem("loggedin", "true");
        localStorage.setItem("username", username);
        loggedin = true;
        document.getElementById("username").textContent = "Welcome, " + localStorage.getItem("username");
    }

    stop() {
        console.log("App stopped");
    }
}   