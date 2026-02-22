/**
 * ==========================================
 * DUAL SEARCH SYSTEM
 * 1. Pair Search  Filter dropdown
 * 2. Token Search  Scroll to ranking
 * ==========================================
 */

document.addEventListener("DOMContentLoaded", async () => {

    const pairSearch       = document.getElementById("pair-search");
    const pairSuggest      = document.getElementById("pair-suggestions");
    const tokenSearch      = document.getElementById("token-search");
    const tokenSuggest     = document.getElementById("token-suggestions");
    const poolFilter       = document.getElementById("pool-filter");

    let poolsData = [];

    try {
        const res = await fetch("data/pools.json");
        poolsData = await res.json();
    } catch (err) {
        console.error("Failed load pools.json", err);
    }

    /* ======================================
       1 PAIR SEARCH (INSIDE FILTER)
    ====================================== */
    pairSearch?.addEventListener("input", function () {

        const keyword = this.value.toLowerCase();
        pairSuggest.innerHTML = "";

        if (!keyword) {
            pairSuggest.style.display = "none";
            return;
        }

        const filtered = poolsData.filter(pool =>
            pool.symbol.toLowerCase().includes(keyword)
        );

        filtered.slice(0, 6).forEach(pool => {

            const li = document.createElement("li");
            li.textContent = pool.symbol;

            li.addEventListener("click", () => {

                pairSearch.value = pool.symbol;
                pairSuggest.style.display = "none";

                if (poolFilter) {
                    poolFilter.value = pool.address;
                }

                if (typeof updateDashboard === "function") {
                    updateDashboard();
                }
            });

            pairSuggest.appendChild(li);
        });

        pairSuggest.style.display = filtered.length ? "block" : "none";
    });

    /* ======================================
       2 TOKEN SEARCH (SCROLL TO RANKING)
    ====================================== */
    tokenSearch?.addEventListener("input", function () {

        const keyword = this.value.toLowerCase();
        tokenSuggest.innerHTML = "";

        if (!keyword) {
            tokenSuggest.style.display = "none";
            return;
        }

        // ambil token unik
        const tokens = new Set();

        poolsData.forEach(pool => {
            const [t0, t1] = pool.symbol.split("/");
            tokens.add(t0);
            tokens.add(t1);
        });

        const filteredTokens = [...tokens].filter(t =>
            t.toLowerCase().includes(keyword)
        );

        filteredTokens.slice(0, 6).forEach(token => {

            const li = document.createElement("li");
            li.textContent = token;

            li.addEventListener("click", () => {

                tokenSearch.value = token;
                tokenSuggest.style.display = "none";

                scrollToToken(token);
            });

            tokenSuggest.appendChild(li);
        });

        tokenSuggest.style.display = filteredTokens.length ? "block" : "none";
    });

});