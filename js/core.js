/* =====================================================
   SIDRAPULSE CORE ENGINE
   Centralized App Config + Provider + Utils
===================================================== */

window.SIDRAPULSE = (() => {

    const CONFIG = {
        RPC_URL: "https://node.sidrachain.com/",
        REQUEST_TIMEOUT: 10000,
        MAX_RETRY: 2,
        AUTO_REFRESH_INTERVAL: 15000,
        LIQUIDITY_SCALE: 1e12
    };

    /* =============================
       PROVIDER (Singleton)
    ============================== */
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);

    /* =============================
       TIMEOUT WRAPPER
    ============================== */
    function withTimeout(promise, ms = CONFIG.REQUEST_TIMEOUT) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), ms)
            )
        ]);
    }

    /* =============================
       RETRY WRAPPER
    ============================== */
    async function withRetry(fn, retry = 0) {
        try {
            return await fn();
        } catch (err) {
            if (retry < CONFIG.MAX_RETRY) {
                return withRetry(fn, retry + 1);
            }
            throw err;
        }
    }

    /* =============================
       SAFE BIGINT POWER
    ============================== */
    function pow10(dec) {
        return 10n ** BigInt(dec);
    }

    /* =============================
       FORMAT LIQUIDITY
    ============================== */
    function formatLiquidity(num) {

        if (!num) return "-";

        const scaled = Number(num) / CONFIG.LIQUIDITY_SCALE;

        if (scaled < 1_000_000_000) return scaled.toFixed(2);
        if (scaled < 1_000_000_000_000) return (scaled / 1_000_000_000).toFixed(2) + "K";
        if (scaled < 1_000_000_000_000_000) return (scaled / 1_000_000_000_000).toFixed(2) + "M";
        return (scaled / 1_000_000_000_000_000_000_000).toFixed(2) + "B";
    }

    return {
        CONFIG,
        provider,
        withTimeout,
        withRetry,
        pow10,
        formatLiquidity
    };

})();
