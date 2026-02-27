/* =====================================================
   SIDRAPULSE PRICE ENGINE
   Stable + Cached + RPC Safe
===================================================== */

const POOL_CACHE = new Map();

/* =====================================================
   FETCH POOL DATA
===================================================== */

async function fetchPoolData(poolAddress) {

    try {

        return await SIDRAPULSE.withRetry(
            async (provider) => {

                const pool =
                    new ethers.Contract(
                        poolAddress,
                        POOL_ABI,
                        provider
                    );

                const [
                    slot0,
                    token0Addr,
                    token1Addr,
                    liquidityBN
                ] = await Promise.all([
                    pool.slot0(),
                    pool.token0(),
                    pool.token1(),
                    pool.liquidity()
                ]);

                const token0 =
                    new ethers.Contract(
                        token0Addr,
                        ERC20_ABI,
                        provider
                    );

                const token1 =
                    new ethers.Contract(
                        token1Addr,
                        ERC20_ABI,
                        provider
                    );

                const [
                    dec0,
                    dec1,
                    sym0,
                    sym1
                ] = await Promise.all([
                    token0.decimals(),
                    token1.decimals(),
                    token0.symbol(),
                    token1.symbol()
                ]);

                const price = calculatePrice(
                    slot0.sqrtPriceX96,
                    dec0,
                    dec1
                );

                const result = {
                    token0: sym0,
                    token1: sym1,
                    price,
                    liquidity: liquidityBN.toString()
                };

                // cache result
                POOL_CACHE.set(poolAddress, result);

                return result;
            }
        );

    } catch (err) {

        console.warn(
            "Pool fetch failed:",
            poolAddress
        );

        // fallback cache
        if (POOL_CACHE.has(poolAddress)) {
            return POOL_CACHE.get(poolAddress);
        }

        return { error: true };
    }
}

/* =====================================================
   SAFE PRICE CALCULATION
===================================================== */

function calculatePrice(sqrtPriceX96, dec0, dec1) {

    try {

        const sqrt = BigInt(sqrtPriceX96.toString());

        // square dulu
        const ratioX192 = sqrt * sqrt;

        // Q192 constant
        const Q192 = 2n ** 192n;

        // price raw
        let price = Number(ratioX192) / Number(Q192);

        // adjust decimals
        const decimalAdjust =
            Math.pow(10, dec0 - dec1);

        price = price * decimalAdjust;

        if (!isFinite(price) || price <= 0)
            return null;

        return price;

    } catch (e) {

        console.warn("Price calc error", e);
        return null;
    }
}
/* =====================================================
   EXPORT
===================================================== */

window.fetchPoolData = fetchPoolData;