/* =====================================================
   SIDRAPULSE PRICE ENGINE
   Smart Cache + Low RPC Mode
===================================================== */

/* =============================
   CACHE SYSTEM
============================= */

const POOL_CACHE = new Map();   // cache live data
const TOKEN_CACHE = new Map();  // cache token info
const POOL_META = new Map();    // cache pool metadata


/* =====================================================
   GET POOL METADATA (ONLY ONCE)
===================================================== */

async function getPoolMeta(poolAddress, provider) {

    // sudah pernah fetch
    if (POOL_META.has(poolAddress)) {
        return POOL_META.get(poolAddress);
    }

    const pool =
        new ethers.Contract(poolAddress, POOL_ABI, provider);

    const [token0Addr, token1Addr] =
        await Promise.all([
            pool.token0(),
            pool.token1()
        ]);

    async function getToken(addr) {

        if (TOKEN_CACHE.has(addr))
            return TOKEN_CACHE.get(addr);

        const token =
            new ethers.Contract(addr, ERC20_ABI, provider);

        const [decimals, symbol] =
            await Promise.all([
                token.decimals(),
                token.symbol()
            ]);

        const data = {
            address: addr,
            decimals,
            symbol
        };

        TOKEN_CACHE.set(addr, data);
        return data;
    }

    const token0 = await getToken(token0Addr);
    const token1 = await getToken(token1Addr);

    const meta = { token0, token1 };

    POOL_META.set(poolAddress, meta);

    return meta;
}


async function fetchPoolsMulticall(poolAddresses) {

    return SIDRAPULSE.withRetry(async (provider) => {

        const multicall =
            new ethers.Contract(
                SIDRAPULSE.CONFIG.MULTICALL_ADDRESS,
                MULTICALL_ABI,
                provider
            );

        const iface =
            new ethers.utils.Interface(POOL_ABI);

        const calls = [];

        poolAddresses.forEach(addr => {

            calls.push({
                target: addr,
                callData:
                    iface.encodeFunctionData("slot0")
            });

            calls.push({
                target: addr,
                callData:
                    iface.encodeFunctionData("liquidity")
            });
        });

        const [, returnData] =
            await multicall.aggregate(calls);

        return returnData;
    });
}
/* =====================================================
   FETCH POOL DATA (LOW RPC + AUTO RECOVERY)
===================================================== */

async function fetchPoolData(poolAddress) {

    try {

        const result =
            await SIDRAPULSE.withRetry(
                async (provider) => {

                    const pool =
                        new ethers.Contract(
                            poolAddress,
                            POOL_ABI,
                            provider
                        );

                    // metadata hanya sekali
                    const meta =
                        await getPoolMeta(
                            poolAddress,
                            provider
                        );

                    // ambil live data
                    const [slot0, liquidityBN] =
                        await Promise.all([
                            pool.slot0(),
                            pool.liquidity()
                        ]);

                    const price =
                        calculatePrice(
                            slot0.sqrtPriceX96,
                            meta.token0.decimals,
                            meta.token1.decimals
                        );

                    if (!price) throw new Error("invalid price");

                    const data = {
                        token0: meta.token0.symbol,
                        token1: meta.token1.symbol,
                        price,
                        liquidity: liquidityBN.toString(),
                        updated: Date.now()
                    };

                    // ✅ simpan hanya data VALID
                    POOL_CACHE.set(poolAddress, data);

                    return data;
                }
            );

        return result;

    } catch (err) {

        console.warn("Pool temporary fail:", poolAddress);

        // ✅ pakai data lama (DEX style)
        if (POOL_CACHE.has(poolAddress)) {

            const cached =
                POOL_CACHE.get(poolAddress);

            return {
                ...cached,
                stale: true // tanda data lama
            };
        }

        // ✅ jangan kirim error permanen
        return null;
    }
}
/* =====================================================
   SAFE PRICE CALCULATION
===================================================== */

function calculatePrice(sqrtPriceX96, dec0, dec1) {

    try {

        const sqrt = BigInt(sqrtPriceX96.toString());

        const numerator =
            sqrt * sqrt * (10n ** BigInt(dec0));

        const denominator =
            (2n ** 192n) * (10n ** BigInt(dec1));

        const price =
            Number(numerator) /
            Number(denominator);

        if (!isFinite(price) || price <= 0)
            return null;

        return Number(price.toFixed(8));

    } catch {
        return null;
    }
}

/* =====================================================
   EXPORT GLOBAL
===================================================== */

window.fetchPoolData = fetchPoolData;

window.fetchPoolsMulticall = fetchPoolsMulticall;
window.getPoolMeta = getPoolMeta;