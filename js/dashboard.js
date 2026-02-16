/**
 * =====================================================
 * SIDRAPULSE DASHBOARD
 * Professional Version - Optimized & Modular
 * =====================================================
 */

const JSON_PATH = "data/pools.json";
const poolCards = new Map();
let poolsList = [];
let autoRefresh = true;
let refreshInterval = null;

/* =====================================================
   LOAD POOLS JSON
===================================================== */
async function loadPools() {
    try {
        const res = await fetch(JSON_PATH);
        const pools = await res.json();

        // Skip zero address
        poolsList = pools.filter(
            p => p.address !== "0x0000000000000000000000000000000000000000"
        );

        populateFilter();
        return poolsList;

    } catch (err) {
        console.error("Failed load pools.json", err);
        return [];
    }
}

/* =====================================================
   BASE ALIAS (SDA = WSDA)
===================================================== */
const BASE_ALIAS = {
    SDA: "WSDA",
    WSDA: "WSDA"
};


/* =====================================================
   POPULATE FILTER DROPDOWN
===================================================== */
function populateFilter() {
    const select = document.getElementById("pool-filter");
    if (!select) return;

    select.innerHTML = `<option value="all">Semua Pool</option>`;

    poolsList.forEach(pool => {
        const opt = document.createElement("option");
        opt.value = pool.address;
        opt.textContent = pool.symbol.replace("WSDA", "SDA"); 
        select.appendChild(opt);
    });
}


/* =====================================================
   MAIN UPDATE DASHBOARD (ALL FILTER CENTRALIZED)
===================================================== */
async function updateDashboard() {

    const baseValue = document.getElementById("base-currency")?.value || "ALL";
    const poolValue = document.getElementById("pool-filter")?.value || "all";
    const sortValue = document.getElementById("pool-sort")?.value || "price-desc";

    const realBase = BASE_ALIAS[baseValue] || baseValue;

    let filteredPools = [...poolsList];

    // FILTER BASE
    if (baseValue !== "ALL") {
        filteredPools = filteredPools.filter(pool =>
            pool.symbol.toUpperCase().includes(realBase)
        );
    }

    // FILTER POOL
    if (poolValue !== "all") {
        filteredPools = filteredPools.filter(pool =>
            pool.address === poolValue
        );
    }

    const results = await Promise.all(
        filteredPools.map(pool =>
            fetchPoolData(pool.address)
                .then(data => ({ pool, data }))
                .catch(() => ({ pool, data: { error: true } }))
        )
    );

    // SORT REAL NUMERIC (NO FORMAT HERE)
    results.sort((a, b) => {

        const pa = Number(a.data?.price ?? 0);
        const pb = Number(b.data?.price ?? 0);

        const la = Number(a.data?.liquidity ?? 0);
        const lb = Number(b.data?.liquidity ?? 0);

        if (sortValue === "price-desc") return pa - pb;
        if (sortValue === "price-asc") return pb - pa;
        if (sortValue === "liquidity-desc") return lb - la;
        if (sortValue === "liquidity-asc") return la - lb;

        return 0;
    });

    const container = document.getElementById("dashboard");

    results.forEach(({ pool, data }) => {

        if (!poolCards.has(pool.address)) {
            const card = createCard(pool, data);
            container.appendChild(card);
            poolCards.set(pool.address, card);
            return;
        }

        const card = poolCards.get(pool.address);

        if (!data.error) {

            card.querySelector(".price").textContent =
                Number(data.price).toFixed(8) + " SDA";

            card.querySelector(".liquidity").textContent =
                data.liquidity;

            container.appendChild(card); // reorder without recreate

        } else {
            card.innerHTML = `<div class="status-error">Error loading pool</div>`;
        }
    });

    // hide unmatched
    poolCards.forEach((card, address) => {
        if (!filteredPools.find(p => p.address === address)) {
            card.style.display = "none";
        } else {
            card.style.display = "block";
        }
    });
}

/* =====================================================
   CREATE POOL CARD (SIMPLIFIED - SINGLE TOKEN UI)
===================================================== */
function createCard(poolInfo, liveData) {

    const div = document.createElement("div");
    div.className = "pool-card";

    if (!liveData || liveData.error) {
        div.innerHTML = `<div class="status-error">Error loading pool</div>`;
        return div;
    }

    // Ambil token utama (sebelum /WSDA)
    const tokenName = poolInfo.symbol.split("/")[0];

    // Harga selalu tampil dalam SDA (UI only)
    const price = Number(liveData.price || 0).toFixed(8);

    const volume24h = liveData.volume24h || "$0";
    const tvl = liveData.tvl || "$0";

    div.innerHTML = `
        <div class="pool-header">

            <div class="token-info">
                <img src="icons/${poolInfo.icon0}" class="token-logo"/>
                <div>
                    <div class="token-name">${tokenName}</div>
                    <div class="price">${price} SDA</div>
                </div>
            </div>

        </div>

        <div class="meta">

            <div>
                <div class="label">Liquidity</div>
                <div class="liquidity">${liveData.liquidity}</div>
            </div>

            <div>
                <div class="label">24H Volume</div>
                <div>${volume24h}</div>
            </div>

            <div>
                <div class="label">TVL</div>
                <div>${tvl}</div>
            </div>

        </div>

        <div class="mini-chart">
            <div class="chart-line"></div>
        </div>
    `;

    return div;
}


/* =====================================================
   SEARCH FILTER BY SYMBOL
===================================================== */
function filterPoolsBySymbol(symbol) {
    const match = poolsList.find(p =>
        p.symbol.toLowerCase() === symbol.toLowerCase()
    );

    if (match) {
        updateDashboard(match.address);
    }
}

/* =====================================================
   AUTO REFRESH CONTROL
===================================================== */
function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);

    refreshInterval = setInterval(() => {
        if (autoRefresh) {
            const select = document.getElementById("pool-filter");
            const sort = document.getElementById("pool-sort");
            updateDashboard(select.value, sort.value);
        }
    }, 15000);
}

function stopAutoRefresh() {
    autoRefresh = false;
}

function resumeAutoRefresh() {
    autoRefresh = true;
}

/* =====================================================
   EVENT LISTENERS
===================================================== */
window.addEventListener("load", async () => {

    await loadPools();

    const select = document.getElementById("pool-filter");
    const sort = document.getElementById("pool-sort");

    await updateDashboard();

    if (select) {
        select.addEventListener("change", () =>
            updateDashboard(select.value, sort?.value)
        );
    }

    if (sort) {
        sort.addEventListener("change", () =>
            updateDashboard(select.value, sort.value)
        );
    }

    startAutoRefresh();
});

/* Manual Refresh */
document.addEventListener("manualRefresh", () => {
    const select = document.getElementById("pool-filter");
    const sort = document.getElementById("pool-sort");
    updateDashboard(select.value, sort.value);
});

/* Pause / Resume */
document.addEventListener("pauseAutoRefresh", stopAutoRefresh);
document.addEventListener("resumeAutoRefresh", resumeAutoRefresh);

/* Search */
document.addEventListener("searchPair", (e) => {
    filterPoolsBySymbol(e.detail);
});



["base-currency", "pool-filter", "pool-sort"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("change", updateDashboard);
    }
});
