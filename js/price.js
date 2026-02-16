/**
 * =====================================================
 * SIDRAPULSE PRICE ENGINE - STABLE VERSION
 * =====================================================
 * - Retry system
 * - Timeout protection
 * - Last good value cache
 * - Safe BigInt calculation
 * - No more random 0 price
 * =====================================================
 */

const POOL_CACHE = new Map();
const REQUEST_TIMEOUT = 10000; // 10s timeout
const MAX_RETRY = 2;

/* ================================================
   Utility: Timeout Promise
================================================ */
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), ms)
        )
    ]);
}

/* ================================================
   Fetch Pool Data (Stable + Retry)
================================================ */
async function fetchPoolData(poolAddress, retry = 0) {

    try {

        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

        const [slot0, token0Addr, token1Addr, liquidityBN] =
            await withTimeout(
                Promise.all([
                    pool.slot0(),
                    pool.token0(),
                    pool.token1(),
                    pool.liquidity()
                ]),
                REQUEST_TIMEOUT
            );

        const token0 = new ethers.Contract(token0Addr, ERC20_ABI, provider);
        const token1 = new ethers.Contract(token1Addr, ERC20_ABI, provider);

        const [dec0, dec1, sym0, sym1] =
            await withTimeout(
                Promise.all([
                    token0.decimals(),
                    token1.decimals(),
                    token0.symbol(),
                    token1.symbol()
                ]),
                REQUEST_TIMEOUT
            );

        const price = calculatePrice(slot0[0], dec0, dec1);

        const result = {
            token0: sym0 || "Token0",
            token1: sym1 || "Token1",
            price: price,
            liquidity: Number(liquidityBN.toString())
        };

        // Save last good result
        POOL_CACHE.set(poolAddress, result);

        return result;

    } catch (err) {

        console.warn("Pool fetch error:", poolAddress, err.message);

        // Retry if possible
        if (retry < MAX_RETRY) {
            console.log("Retrying...", retry + 1);
            return fetchPoolData(poolAddress, retry + 1);
        }

        // If failed, return last known good data
        if (POOL_CACHE.has(poolAddress)) {
            console.warn("Using cached value for:", poolAddress);
            return POOL_CACHE.get(poolAddress);
        }

        // Absolute fallback (rare)
        return {
            token0: "Token0",
            token1: "Token1",
            price: null,
            liquidity: null,
            error: true
        };
    }
}

/* ================================================
   Calculate Price (Safe BigInt)
================================================ */
function calculatePrice(sqrtPriceX96, dec0, dec1) {
    try {
        const sqrtBN = BigInt(sqrtPriceX96.toString());

        const numerator = sqrtBN * sqrtBN * BigInt(10 ** dec0);
        const denominator = 2n ** 192n;

        const priceBN = numerator / denominator;

        const price = Number(priceBN) / 10 ** dec1;

        return Number(price.toFixed(8));

    } catch (e) {
        console.error("Price calculation error:", e);
        return null;
    }
}

window.fetchPoolData = fetchPoolData;
