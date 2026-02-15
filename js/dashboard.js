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
   POPULATE FILTER DROPDOWN
===================================================== */
function populateFilter() {
    const select = document.getElementById("pool-filter");
    if (!select) return;

    select.innerHTML = `<option value="all">All Pools</option>`;

    poolsList.forEach(pool => {
        const opt = document.createElement("option");
        opt.value = pool.address;
        opt.textContent = pool.symbol;
        select.appendChild(opt);
    });
}

/* =====================================================
   CREATE POOL CARD
===================================================== */
function createCard(poolInfo, liveData) {
    const div = document.createElement("div");
    div.className = "pool-card";

    if (!liveData || liveData.error) {
        div.innerHTML = `<div class="status-error">Error loading pool</div>`;
        return div;
    }

    div.innerHTML = `
        <div class="pool-header">
            <div class="symbol">
                <img src="icons/${poolInfo.icon0}" />
                <span>${liveData.token0}</span>
                <span>/</span>
                <img src="icons/${poolInfo.icon1}" />
                <span>${liveData.token1}</span>
            </div>
            <div class="price">${Number(liveData.price).toFixed(8)}</div>
        </div>

        <div class="meta">
            <div>
                <div class="label">Liquidity</div>
                <div class="liquidity">${liveData.liquidity}</div>
            </div>
            <div>
                <div class="label">Token0</div>
                <div>${liveData.token0}</div>
            </div>
            <div>
                <div class="label">Token1</div>
                <div>${liveData.token1}</div>
            </div>
        </div>
    `;

    return div;
}

/* =====================================================
   FETCH & UPDATE DASHBOARD
===================================================== */
async function updateDashboard(selectedAddress = "all", sortMode = null) {
    const container = document.getElementById("dashboard");
    if (!container) return;

    // Fetch all pools in parallel (FAST)
    const results = await Promise.all(
        poolsList.map(pool =>
            fetchPoolData(pool.address)
                .then(data => ({ pool, data }))
                .catch(() => ({ pool, data: { error: true } }))
        )
    );

    let filtered = results.filter(({ pool }) =>
        selectedAddress === "all" || pool.address === selectedAddress
    );

    // Sorting
    if (sortMode) {
        filtered.sort((a, b) => {
            const pa = Number(a.data?.price || 0);
            const pb = Number(b.data?.price || 0);
            const la = Number(a.data?.liquidity || 0);
            const lb = Number(b.data?.liquidity || 0);

            switch (sortMode) {
                case "price-desc": return pb - pa;
                case "price-asc": return pa - pb;
                case "liquidity-desc": return lb - la;
                case "liquidity-asc": return la - lb;
                default: return 0;
            }
        });
    }

    filtered.forEach(({ pool, data }) => {

        if (poolCards.has(pool.address)) {
            const card = poolCards.get(pool.address);

            if (!data.error) {
                card.querySelector(".price").textContent =
                    Number(data.price).toFixed(8);

                card.querySelector(".liquidity").textContent =
                    data.liquidity;

                card.style.display = "block";
            } else {
                card.innerHTML = `<div class="status-error">Error loading pool</div>`;
            }

        } else {
            const card = createCard(pool, data);
            container.appendChild(card);
            poolCards.set(pool.address, card);
        }
    });

    // Hide non-selected cards
    poolCards.forEach((card, address) => {
        if (selectedAddress !== "all" && address !== selectedAddress) {
            card.style.display = "none";
        }
    });
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
