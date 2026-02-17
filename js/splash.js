(function () {
    const splash = document.getElementById("splash-screen");

    // Jika hanya refresh → jangan tampilkan
    if (sessionStorage.getItem("sidrapulse_loaded")) {
        splash.style.display = "none";
        return;
    }

    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    progressBar.style.strokeDasharray = circumference;

    let progress = 0;

    const interval = setInterval(() => {
        progress += 2;

        if (progress > 100) progress = 100;

        const offset = circumference - (progress / 100) * circumference;
        progressBar.style.strokeDashoffset = offset;
        progressText.textContent = progress + "%";

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                splash.classList.add("hidden");
                sessionStorage.setItem("sidrapulse_loaded", "true");
            }, 500);
        }
    }, 40);
})();
