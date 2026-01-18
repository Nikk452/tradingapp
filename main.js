class Main {
    static main() {
        let loggedin = !!localStorage.getItem("loggedin")?true:false;
        let appInstance = new app();
        let loginscreen = document.getElementById("loginscreen");
        loginscreen.style.display = loggedin ? "none" : "flex";
        if(!loggedin) {
            let loginform = document.getElementById("loginform");
            loginform.addEventListener("submit", function(event) {
                event.preventDefault();
                let username = document.getElementById("username").value;
                let password = document.getElementById("password").value;
                console.log("Username: " + username);
                console.log("Password: " + password);
                if(username === "admin1" && password === "admin1") {
                    appInstance.start();
                } else {
                    document.getElementById("loginerror").innerText = "Invalid credentials. Please try again.";  
                }
            });
        }
        else {
            appInstance.start();
        }
    }
}

Main.main();

function deletelocalstorage() {
        console.log("Clearing local storage and reloading the page.");
        localStorage.clear();
        location.reload();
    }