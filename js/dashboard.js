/**
 * =====================================================
 * SIDRAPULSE DASHBOARD
 * Professional Version - Optimized & Modular
 * =====================================================
 */

/* =====================================================
   SIDRAPULSE DATA CONFIG
   (RPC handled by core.js)
===================================================== */

//  RPC sekarang dihandle oleh core.js
// jangan buat RPC rotator lagi di dashboard

const JSON_PATH = "data/pools.json";

const poolCards = new Map();
let poolsList = [];

let autoRefresh = false; // default pause

// BASE GLOBAL
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
   SET BASE CURRENCY (GLOBAL SYNC SAFE)
===================================================== */
function setBaseCurrency(tokenSymbol) {

    const dropdown = document.getElementById("base-dropdown");
    const label    = document.getElementById("base-label");
    const icon     = document.getElementById("base-icon");

    if (!dropdown || !label || !icon) return;

    const realSymbol = tokenSymbol === "SDA" ? "WSDA" : tokenSymbol;

    window.selectedBaseCurrency = realSymbol;

    // cari icon dari poolsList
    let foundIcon = null;

    for (const pool of poolsList) {
        const [t0, t1] = pool.symbol.toUpperCase().split("/");
        if (t0 === realSymbol) foundIcon = pool.icon0;
        if (t1 === realSymbol) foundIcon = pool.icon1;
    }

    label.textContent = realSymbol === "WSDA" ? "SDA" : realSymbol;

    if (foundIcon) {
        icon.src = `icons/${foundIcon}`;
    }
}
/* =====================================================
   POPULATE FILTER DROPDOWN
===================================================== */
function populateFilter() {
    const select = document.getElementById("pool-filter");
    if (!select) return;

    select.innerHTML = `<option value="all">Semua Pair</option>`;

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

    e.stopPropagation();

    const realSymbol = tokenSymbol === "SDA" ? "WSDA" : tokenSymbol;

    window.selectedBaseCurrency = realSymbol;

    label.textContent =
        realSymbol === "WSDA" ? "SDA" : realSymbol;

    icon.src = `icons/${tokenIcon}`;

    options.style.display = "none";

    // 🔥 ALWAYS RESET FILTER
    const poolFilter = document.getElementById("pool-filter");
    if (poolFilter) {
        poolFilter.value = "all";
    }

    updateDashboard();
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
    
    

// ==========================================
// FILTER BASE (RENDER SEMUA POOL YANG MENGANDUNG BASE)
// ==========================================

if (realBase) {

    filteredPools = filteredPools.filter((pool) => {

        const [t0, t1] = pool.symbol.toUpperCase().split("/");

        // tampilkan semua pool yg mengandung base
        return (
            t0 === realBase ||
            t1 === realBase
        );

    });

}

// ==========================================
// FILTER POOL DROPDOWN
// ==========================================

if (poolValue !== "all") {
    filteredPools = filteredPools.filter(pool =>
        pool.address === poolValue
    );
}

// ==========================================
// FETCH DATA
// ==========================================

const results = await fetchPoolsSmart(filteredPools);

// ==========================================
// SORT (PAKAI FINAL PRICE YANG SUDAH DIKONVERSI)
// ==========================================

results.sort((a, b) => {

    const computePrice = (item) => {

        if (!item.data || item.data.error) return 0;

        let price = Number(item.data.price || 0);

        const [raw0, raw1] = item.pool.symbol.split("/");
        const t0 = raw0.toUpperCase();
        const t1 = raw1.toUpperCase();

        // jika base ada di token0 → invert
        if (realBase === t0 && price !== 0) {
            price = 1 / price;
        }

        return price;
    };

    const pa = computePrice(a);
    const pb = computePrice(b);

    const la = Number(a.data?.liquidity ?? 0);
    const lb = Number(b.data?.liquidity ?? 0);

    if (sortValue === "price-desc") return pb - pa;
    if (sortValue === "price-asc") return pa - pb;
    if (sortValue === "liquidity-desc") return lb - la;
    if (sortValue === "liquidity-asc") return la - lb;

    return 0;
});

// ==========================================
// RENDER (SAFE & BALANCED)
// ==========================================

const container = document.getElementById("dashboard");
if (!container) return;

results.forEach(({ pool, data }, index) => {

    // ==============================
    // CREATE CARD IF NOT EXISTS
    // ==============================
    if (!poolCards.has(pool.address)) {
        const card = createCard(pool, data || {}, index);
        container.appendChild(card);
        poolCards.set(pool.address, card);
    }

    const card = poolCards.get(pool.address);
    if (!card) return;

    // ==============================
    // UPDATE RANK
    // ==============================
    const rank = card.querySelector(".rank-badge");
    if (rank) rank.textContent = "#" + (index + 1);

    // ==============================
    // SAFE DATA CHECK
    // ==============================
    if (!data || data.error) {
        card.style.display = "block";
        return;
    }

    // ==============================
    // PREPARE DATA
    // ==============================
    let finalPrice = Number(data.price) || 0;
    let liquidity  = Number(data.liquidity) || 0;

    let [raw0, raw1] = pool.symbol.split("/");
    let t0 = raw0.toUpperCase();
    let t1 = raw1.toUpperCase();

    let icon0 = pool.icon0;
    let icon1 = pool.icon1;

    let displayLeft  = raw0;
    let displayRight = raw1;

    // ==============================
    // SWAP LOGIC
    // ==============================
    if (realBase === t0) {

        displayLeft  = raw1;
        displayRight = raw0;

        [icon0, icon1] = [icon1, icon0];

        if (finalPrice !== 0) {
            finalPrice = 1 / finalPrice;
        }
    }

    // ==============================
    // UPDATE ELEMENTS
    // ==============================
    const nameEl  = card.querySelector(".token-name");
    const imgEls  = card.querySelectorAll(".token-logo");
    const priceEl = card.querySelector(".price");
    const liqEl   = card.querySelector(".liquidity");

    if (nameEl) {
        nameEl.textContent =
            displayLeft.replace("WSDA", "SDA") +
            " / " +
            displayRight.replace("WSDA", "SDA");
    }

    if (imgEls.length === 2) {
        imgEls[0].src = `icons/${icon0}`;
        imgEls[1].src = `icons/${icon1}`;
    }

    if (priceEl) {
        priceEl.textContent =
            finalPrice.toFixed(8) +
            " " +
            (realBase === "WSDA" ? "SDA" : realBase);
    }

    if (liqEl) {
        liqEl.textContent = formatLiquidityScaled(liquidity);
    }

    card.style.display = "block";
});


// ==========================================
// HIDE NON MATCHED
// ==========================================

poolCards.forEach((card, address) => {
    const exists = filteredPools.some(p => p.address === address);
    if (!exists) {
        card.style.display = "none";
    }
});

} 

function scrollToToken(tokenSymbol) {

    const cards = document.querySelectorAll(".pool-card");

    for (const card of cards) {

        const nameEl = card.querySelector(".token-name");
        if (!nameEl) continue;

        if (nameEl.textContent.toUpperCase().includes(tokenSymbol.toUpperCase())) {

            card.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            card.classList.add("highlight");

            setTimeout(() => {
                card.classList.remove("highlight");
            }, 1500);

            break;
        }
    }
}
/* =====================================================
   CREATE POOL CARD (SIMPLIFIED - SINGLE TOKEN UI)
===================================================== */
function createCard(poolInfo, liveData, index = 0) {

    const realBase = (window.selectedBaseCurrency || "WSDA").toUpperCase();

    const div = document.createElement("div");
    div.className = "pool-card";

    if (!liveData || liveData.error) {
        div.innerHTML = `
            <div class="rank-badge">#${index + 1}</div>
            <div class="status-error">Error loading pool</div>
        `;
        return div;
    }

    let [raw0, raw1] = poolInfo.symbol.split("/");

    let t0 = raw0.toUpperCase();
    let t1 = raw1.toUpperCase();

    let icon0 = poolInfo.icon0;
    let icon1 = poolInfo.icon1;

    let displayLeft = raw0;
    let displayRight = raw1;

    let finalPrice = Number(liveData.price || 0);

    // =====================================
    // SWAP LOGIC (CASE SAFE)
    // =====================================

    if (realBase === t0) {

        // swap visual
        displayLeft = raw1;
        displayRight = raw0;

        [icon0, icon1] = [icon1, icon0];

        // invert price
        if (finalPrice !== 0) {
            finalPrice = 1 / finalPrice;
        }

    }
    else if (realBase === t1) {
        // sudah benar, tidak perlu swap
        displayLeft = raw0;
        displayRight = raw1;
    }

    const price = finalPrice.toFixed(8);
    const liquidity = formatLiquidityScaled(liveData.liquidity);

    div.innerHTML = `
        <div class="rank-badge">#${index + 1}</div>

        <div class="pool-header">
            <div class="token-info">
                <div class="pair-logos">
                    <img src="icons/${icon0}" class="token-logo primary"/>
                    <img src="icons/${icon1}" class="token-logo secondary"/>
                </div>
                <div>
                    <div class="token-name">
                        ${displayLeft.replace("WSDA","SDA")} / ${displayRight.replace("WSDA","SDA")}
                    </div>
                    <div class="price">
                        ${price} ${realBase === "WSDA" ? "SDA" : realBase}
                    </div>
                </div>
            </div>
        </div>

        <div class="meta">
            <div>
                <div class="label">Liquidity</div>
                <div class="liquidity">${liquidity}</div>
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
   AUTO REFRESH CONTROL (SAFE VERSION)
===================================================== */

let refreshInterval = null;

function startAutoRefresh() {

    // cegah interval dobel
    if (refreshInterval) return;

    autoRefresh = true;

    refreshInterval = setInterval(() => {

        if (!autoRefresh) return;

        updateDashboard();

    }, 15000); // 15 detik
}

function stopAutoRefresh() {

    autoRefresh = false;

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function resumeAutoRefresh() {
    startAutoRefresh();
}

/* =====================================================
   SMART FETCH QUEUE
===================================================== */

async function fetchPoolsSmart(pools, batchSize = 5) {

    const results = [];

    for (let i = 0; i < pools.length; i += batchSize) {

        const batch = pools.slice(i, i + batchSize);

        const res = await Promise.all(
            batch.map(pool =>
                fetchPoolData(pool.address)
                    .then(data => ({ pool, data }))
                    .catch(() => ({ pool, data:{error:true} }))
            )
        );

        results.push(...res);

        // jeda anti RPC limit
        await new Promise(r => setTimeout(r, 700));
    }

    return results;
}

let lastRefreshTime = 0;

function smartRefreshAllowed() {

    const now = Date.now();

    // minimal jarak refresh
    if (now - lastRefreshTime < 12000) {
        return false;
    }

    lastRefreshTime = now;
    return true;
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

refreshBtn?.addEventListener("click", async () => {

    const icon = refreshBtn.querySelector("i");

    // mulai muter
    icon.classList.add("spin");

    try {
        if (typeof updateDashboard === "function") {
            await updateDashboard(); // pastikan ini async
        }
    } catch (err) {
        console.error("Refresh error:", err);
    }

    // berhenti muter
    icon.classList.remove("spin");

});
    const toggleBtn  = document.getElementById("toggle-refresh");

    // 4️⃣ First render
    await updateDashboard();

    /* ================= FILTER CHANGE ================= */

    poolFilter?.addEventListener("change", (e) => {

    const selectedAddress = e.target.value;

    if (selectedAddress === "all") {
        updateDashboard();
        return;
    }

    const selectedPool = poolsList.find(p => p.address === selectedAddress);

    if (!selectedPool) {
        updateDashboard();
        return;
    }

    const [t0, t1] = selectedPool.symbol.toUpperCase().split("/");

    // PRIORITAS:
    // Jika salah satu token adalah WSDA  jadikan base
    if (t0 === "WSDA" || t1 === "WSDA") {
        setBaseCurrency("WSDA");
    } else {
        // fallback: pakai token kedua sebagai base
        setBaseCurrency(t1);
    }

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

    /* ================= PAUSE / RESUME ================= */

toggleBtn?.addEventListener("click", () => {

    autoRefresh = !autoRefresh;

    const icon = toggleBtn.querySelector("i");
    if (!icon) return;

    if (autoRefresh) {

        icon.classList.remove("fa-play");
        icon.classList.add("fa-pause");

        startAutoRefresh(); // ✅ mulai hanya saat play

    } else {

        icon.classList.remove("fa-pause");
        icon.classList.add("fa-play");

        stopAutoRefresh(); // ✅ benar-benar stop
    }
});
}); // ✅ close window load