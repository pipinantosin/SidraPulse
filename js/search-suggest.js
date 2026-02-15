/**
 * ==========================================
 * SEARCH SUGGEST + ICON ANIMATION HANDLER
 * SidraPulse
 * ==========================================
 */

document.addEventListener("DOMContentLoaded", async () => {

    const searchInput = document.getElementById("pair-search");
    const suggestionsEl = document.getElementById("search-suggestions");
    const refreshBtn = document.getElementById("refresh-btn");
    const toggleBtn = document.getElementById("toggle-refresh");

    let poolsData = [];
    let autoRefreshActive = true;

    /* ======================================
       LOAD POOLS FROM JSON
    ====================================== */
    try {
        const res = await fetch("data/pools.json");
        poolsData = await res.json();
    } catch (err) {
        console.error("Failed load pools.json", err);
    }

    /* ======================================
       SEARCH AUTOCOMPLETE
    ====================================== */
    searchInput.addEventListener("input", function () {
        const keyword = this.value.toLowerCase();
        suggestionsEl.innerHTML = "";

        if (!keyword) {
            suggestionsEl.style.display = "none";
            return;
        }

        const filtered = poolsData.filter(pool =>
            pool.symbol.toLowerCase().includes(keyword) ||
            pool.name.toLowerCase().includes(keyword)
        );

        filtered.slice(0, 6).forEach(pool => {
            const li = document.createElement("li");
            li.textContent = pool.symbol;
            li.addEventListener("click", () => {
                searchInput.value = pool.symbol;
                suggestionsEl.style.display = "none";

                // Trigger filter in dashboard (optional custom event)
                document.dispatchEvent(new CustomEvent("searchPair", {
                    detail: pool.symbol
                }));
            });
            suggestionsEl.appendChild(li);
        });

        suggestionsEl.style.display = filtered.length ? "block" : "none";
    });

    // Hide suggestion if click outside
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target)) {
            suggestionsEl.style.display = "none";
        }
    });

    /* ======================================
       REFRESH BUTTON ANIMATION
    ====================================== */
    refreshBtn.addEventListener("click", () => {
        const icon = refreshBtn.querySelector("i");
        icon.classList.add("spin");

        // Trigger refresh event
        document.dispatchEvent(new Event("manualRefresh"));

        // Stop spin after 1.2s
        setTimeout(() => {
            icon.classList.remove("spin");
        }, 1200);
    });

    /* ======================================
       TOGGLE AUTO REFRESH ICON SWITCH
    ====================================== */
    toggleBtn.addEventListener("click", () => {
        const icon = toggleBtn.querySelector("i");

        autoRefreshActive = !autoRefreshActive;

        if (autoRefreshActive) {
            icon.classList.remove("fa-play");
            icon.classList.add("fa-pause");
            toggleBtn.title = "Pause Auto Refresh";
            document.dispatchEvent(new Event("resumeAutoRefresh"));
        } else {
            icon.classList.remove("fa-pause");
            icon.classList.add("fa-play");
            toggleBtn.title = "Resume Auto Refresh";
            document.dispatchEvent(new Event("pauseAutoRefresh"));
        }
    });

});
