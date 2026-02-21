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
window.selectedBaseCurrency = "WSDA";

/* =====================================================
   UTILITY: FORMAT LIQUIDITY (lama)
===================================================== */
function formatLiquidity(num) {
    if (num === null || num === undefined) return "-";
    if (num < 1_000) return num.toFixed(2);
    if (num < 1_000_000) return (num / 1_000).toFixed(2) + "K";
    if (num < 1_000_000_000) return (num / 1_000_000).toFixed(2) + "M";
    return (num / 1_000_000_000).toFixed(2) + "B";
}

/* =====================================================
   UTILITY: FORMAT LIQUIDITY SCALED (baru)
   Menggeser angka besar pool Sidra DEX ke ribuan/M/B
===================================================== */
function formatLiquidityScaled(num, scale = 1e12) {
    if (!num) return "-";
    const scaled = num / scale;

    if (scaled < 1_000) return scaled.toFixed(2);
    if (scaled < 1_000_000) return (scaled / 1_000).toFixed(2) + "K";
    if (scaled < 1_000_000_000) return (scaled / 1_000_000).toFixed(2) + "M";
    return (scaled / 1_000_000_000).toFixed(2) + "K";
}


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
   INIT BASE DROPDOWN - FINAL STABLE
===================================================== */

function initBaseDropdown() {

    const dropdown = document.getElementById("base-dropdown");
    const options  = document.getElementById("base-options");
    const label    = document.getElementById("base-label");
    const icon     = document.getElementById("base-icon");

    if (!dropdown || !options) return;

    options.innerHTML = "";

    const tokenMap = new Map();

    poolsList.forEach(pool => {

        const [t0, t1] = pool.symbol.toUpperCase().split("/");

        if (!tokenMap.has(t0)) tokenMap.set(t0, pool.icon0);
        if (!tokenMap.has(t1)) tokenMap.set(t1, pool.icon1);
    });

    tokenMap.forEach((tokenIcon, tokenSymbol) => {

        const item = document.createElement("div");
        item.className = "dropdown-item";

        item.innerHTML = `
            <img src="icons/${tokenIcon}" width="16"/>
            <span>${tokenSymbol === "WSDA" ? "SDA" : tokenSymbol}</span>
        `;

        item.addEventListener("click", (e) => {

            e.stopPropagation(); // 🔥 penting biar tidak reopen

            window.selectedBaseCurrency = tokenSymbol;

            label.textContent =
                tokenSymbol === "WSDA" ? "SDA" : tokenSymbol;

            icon.src = `icons/${tokenIcon}`;

            // CLOSE dropdown
            options.style.display = "none";

            if (typeof updateDashboard === "function") {
                updateDashboard();
            }
        });

        options.appendChild(item);
    });

    // default WSDA
    if (tokenMap.has("WSDA")) {
        label.textContent = "SDA";
        icon.src = `icons/${tokenMap.get("WSDA")}`;
        window.selectedBaseCurrency = "WSDA";
    }

    /* ==========================
       TOGGLE OPEN (ONLY HEADER)
    ========================== */

    const selectedBox = dropdown.querySelector(".dropdown-selected");

    selectedBox.addEventListener("click", (e) => {

        e.stopPropagation();

        const isOpen = options.style.display === "flex";

        options.style.display = isOpen ? "none" : "flex";
    });

    /* ==========================
       CLICK OUTSIDE CLOSE
    ========================== */

    document.addEventListener("click", (e) => {

        if (!dropdown.contains(e.target)) {
            options.style.display = "none";
        }
    });
}
/* =====================================================
   MAIN UPDATE DASHBOARD (ALL FILTER CENTRALIZED)
===================================================== */
async function updateDashboard() {

    const baseValue = window.selectedBaseCurrency || "WSDA";
    const poolValue = document.getElementById("pool-filter")?.value || "all";
    const sortValue = document.getElementById("pool-sort")?.value || "price-desc";

    const realBase = baseValue === "SDA" ? "WSDA" : baseValue;

    let filteredPools = [...poolsList];

    // FILTER BASE
    if (baseValue !== "ALL") {
        filteredPools = filteredPools.filter(pool => {
            const [t0, t1] = pool.symbol.toUpperCase().split("/");
            return t0 === realBase || t1 === realBase;
        });
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

    // SORT
    results.sort((a, b) => {
        const pa = Number(a.data?.price ?? 0);
        const pb = Number(b.data?.price ?? 0);
        const la = Number(a.data?.liquidity ?? 0);
        const lb = Number(b.data?.liquidity ?? 0);

        if (sortValue === "price-desc") return pb - pa;
        if (sortValue === "price-asc") return pa - pb;
        if (sortValue === "liquidity-desc") return lb - la;
        if (sortValue === "liquidity-asc") return la - lb;

        return 0;
    });

    const container = document.getElementById("dashboard");
    if (!container) return;

    results.forEach(({ pool, data }, index) => {

        if (!poolCards.has(pool.address)) {
            const card = createCard(pool, data, index);
            container.appendChild(card);
            poolCards.set(pool.address, card);
            return;
        }

        const card = poolCards.get(pool.address);

        const rank = card.querySelector(".rank-badge");
        if (rank) rank.textContent = "#" + (index + 1);

        if (!data.error) {

            const priceEl = card.querySelector(".price");
            const liqEl = card.querySelector(".liquidity");

            if (priceEl)
                priceEl.textContent =
                    Number(data.price || 0).toFixed(8) +
                    " " + (realBase === "WSDA" ? "SDA" : realBase);

            if (liqEl)
                liqEl.textContent =
                    SIDRAPULSE.formatLiquidity(data.liquidity);

            container.appendChild(card);
        }
    });

    // Hide non matched
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
function createCard(poolInfo, liveData, index = 0) {
    const div = document.createElement("div");
    div.className = "pool-card";

    if (!liveData || liveData.error) {
        div.innerHTML = `
    <div class="rank-badge">#${index + 1}</div>
    <div class="status-error">Error loading pool</div>
`;
        return div;
    }

    const tokenName = poolInfo.symbol.split("/")[0];
    const price = Number(liveData.price || 0).toFixed(8);
    const liquidity = formatLiquidityScaled(liveData.liquidity);
    const volume24h = liveData.volume24h || "$0";
    const tvl = liveData.tvl || "$0";

    div.innerHTML = `
    <div class="rank-badge">#${index + 1}</div>

    <div class="pool-header">
        <div class="token-info">
            <div class="pair-logos">
    <img src="icons/${poolInfo.icon0}" class="token-logo primary"/>
    <img src="icons/${poolInfo.icon1}" class="token-logo secondary"/>
</div>
            <div>
                <div class="token-name">${tokenName}</div>
                <div class="price">${price} SDA</div>
            </div>
        </div>
    </div>

    <div class="meta">
        <div>
            <div class="label">Liquidity</div>
            <div class="liquidity">${liquidity}</div>
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
            updateDashboard();
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
   EVENT LISTENERS - FINAL STABLE VERSION
===================================================== */

window.addEventListener("load", async () => {

    // 1️⃣ Load pools FIRST
    await loadPools();

    // 2️⃣ Init base dropdown AFTER pools loaded
    initBaseDropdown();

    // 3️⃣ Get elements
    const poolFilter = document.getElementById("pool-filter");
    const poolSort   = document.getElementById("pool-sort");
    const refreshBtn = document.getElementById("refresh-btn");
    const toggleBtn  = document.getElementById("toggle-refresh");

    // 4️⃣ First render
    await updateDashboard();

    /* ================= FILTER CHANGE ================= */

    poolFilter?.addEventListener("change", () => {
        updateDashboard();
    });

    poolSort?.addEventListener("change", () => {
        updateDashboard();
    });

    /* ================= MANUAL REFRESH ================= */

    refreshBtn?.addEventListener("click", () => {
        updateDashboard();
    });

    /* ================= PAUSE / RESUME ================= */

    toggleBtn?.addEventListener("click", () => {

        autoRefresh = !autoRefresh;

        const icon = toggleBtn.querySelector("i");

        if (!icon) return;

        if (autoRefresh) {
            icon.classList.remove("fa-play");
            icon.classList.add("fa-pause");
        } else {
            icon.classList.remove("fa-pause");
            icon.classList.add("fa-play");
        }
    });

    // 5️⃣ Start auto refresh (LAST)
    startAutoRefresh();
});