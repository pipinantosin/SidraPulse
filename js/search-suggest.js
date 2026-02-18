/**
 * ==========================================
 * SEARCH SUGGEST + ICON HANDLER (FIXED)
 * SidraPulse
 * ==========================================
 */

document.addEventListener("DOMContentLoaded", async () => {

    const searchInput   = document.getElementById("pair-search");
    const suggestionsEl = document.getElementById("search-suggestions");
    const refreshBtn    = document.getElementById("refresh-btn");
    const toggleBtn     = document.getElementById("toggle-refresh");
    const poolFilter    = document.getElementById("pool-filter");

    let poolsData = [];

    /* ======================================
       LOAD POOLS JSON
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
            pool.name?.toLowerCase().includes(keyword)
        );

        filtered.slice(0, 6).forEach(pool => {

            const li = document.createElement("li");
            li.textContent = pool.symbol;

            li.addEventListener("click", () => {

                // Isi input
                searchInput.value = pool.symbol;
                suggestionsEl.style.display = "none";

                // 🔥 SET DROPDOWN FILTER KE POOL YANG DIPILIH
                if (poolFilter) {
                    poolFilter.value = pool.address;
                }

                // 🔥 LANGSUNG UPDATE DASHBOARD
                if (typeof updateDashboard === "function") {
                    updateDashboard();
                }

            });

            suggestionsEl.appendChild(li);
        });

        suggestionsEl.style.display = filtered.length ? "block" : "none";
    });

    /* ======================================
       HIDE SUGGESTION IF CLICK OUTSIDE
    ====================================== */
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target)) {
            suggestionsEl.style.display = "none";
        }
    });

    /* ======================================
       REFRESH BUTTON
    ====================================== */
    refreshBtn?.addEventListener("click", () => {

        const icon = refreshBtn.querySelector("i");
        icon.classList.add("spin");

        if (typeof updateDashboard === "function") {
            updateDashboard();
        }

        setTimeout(() => {
            icon.classList.remove("spin");
        }, 1000);
    });

    /* ======================================
       TOGGLE AUTO REFRESH
    ====================================== */
    toggleBtn?.addEventListener("click", () => {

        const icon = toggleBtn.querySelector("i");

        if (icon.classList.contains("fa-pause")) {
            SIDRAPULSE.stopAutoRefresh();
            icon.classList.remove("fa-pause");
            icon.classList.add("fa-play");
            toggleBtn.title = "Resume Auto Refresh";
        } else {
            SIDRAPULSE.restartAutoRefresh();
            icon.classList.remove("fa-play");
            icon.classList.add("fa-pause");
            toggleBtn.title = "Pause Auto Refresh";
        }

    });

});
