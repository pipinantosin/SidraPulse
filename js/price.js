/* =====================================================
   SIDRAPULSE PRICE ENGINE (Refactored)
===================================================== */

const POOL_CACHE = new Map();

async function fetchPoolData(poolAddress) {

    const { provider, withTimeout, withRetry, pow10 } = SIDRAPULSE;

    try {

        return await withRetry(async () => {

            const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

            const [slot0, token0Addr, token1Addr, liquidityBN] =
                await withTimeout(
                    Promise.all([
                        pool.slot0(),
                        pool.token0(),
                        pool.token1(),
                        pool.liquidity()
                    ])
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
                    ])
                );

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

            POOL_CACHE.set(poolAddress, result);

            return result;
        });

    } catch (err) {

        if (POOL_CACHE.has(poolAddress)) {
            return POOL_CACHE.get(poolAddress);
        }

        return { error: true };
    }
}

/* =============================
   SAFE PRICE CALCULATION
============================= */
function calculatePrice(sqrtPriceX96, dec0, dec1) {

    try {

        const sqrt = BigInt(sqrtPriceX96.toString());

        const numerator =
            sqrt * sqrt * SIDRAPULSE.pow10(dec0);

        const denominator = 2n ** 192n;

        const priceBN = numerator / denominator;

        const price =
            Number(priceBN) /
            Number(SIDRAPULSE.pow10(dec1));

        return Number(price.toFixed(8));

    } catch {
        return null;
    }
}

window.fetchPoolData = fetchPoolData;
