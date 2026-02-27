/* =====================================================
   SIDRAPULSE CORE ENGINE
   STABLE RPC ROTATOR (FINAL)
===================================================== */

(function () {

if (typeof ethers === "undefined") {
    console.error("ethers.js belum load");
    return;
}

/* =====================================
   CONFIG
===================================== */

const CONFIG = {
    RPC_LIST: [
        "https://node.sidrachain.com",
        "https://rpc1.sidrachain.com",
        "https://rpc2.sidrachain.com",
        "https://rpc3.sidrachain.com"
    ],

    MULTICALL_ADDRESS:
        "0xcA11bde05977b3631167028862bE2a173976CA11",

    ROTATE_EVERY: 40,
    MAX_RETRY: 4,
    TIMEOUT: 12000,
    COOLDOWN: 30000,
};

/* =====================================
   PROVIDER CACHE
===================================== */

const providers = [];
const cooldown = {};

let rpcIndex = 0;
let rpcHit = 0;

/* =====================================
   INIT PROVIDERS (ONLY ONCE)
===================================== */

CONFIG.RPC_LIST.forEach((url, i) => {

    try {

        providers[i] =
            new ethers.providers.StaticJsonRpcProvider(
                url,
                { name: "sidra", chainId: 97453 }
            );

        console.log("RPC ready:", url);

    } catch (e) {

        console.warn("RPC init fail:", url);
        cooldown[i] = Date.now();
    }

});

/* =====================================
   GET ACTIVE PROVIDER
===================================== */

function getProvider() {

    rpcHit++;

    if (rpcHit % CONFIG.ROTATE_EVERY === 0) {
        rpcIndex =
            (rpcIndex + 1) % providers.length;
    }

    for (let i = 0; i < providers.length; i++) {

        const idx =
            (rpcIndex + i) % providers.length;

        if (!providers[idx]) continue;

        const lastFail = cooldown[idx];

        if (
            lastFail &&
            Date.now() - lastFail < CONFIG.COOLDOWN
        ) continue;

        rpcIndex = idx;
        return providers[idx];
    }

    throw new Error("All RPC cooldown");
}

/* =====================================
   TIMEOUT WRAPPER
===================================== */

function withTimeout(promise) {

    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error("timeout")),
                CONFIG.TIMEOUT
            )
        )
    ]);
}

/* =====================================
   RETRY + AUTO SWITCH
===================================== */

async function withRetry(fn, retry = 0) {

    try {

        const provider = getProvider();

        return await withTimeout(
            fn(provider)
        );

    } catch (err) {

        const msg =
            (err.message || "").toLowerCase();

        if (
            msg.includes("fetch") ||
            msg.includes("timeout") ||
            msg.includes("network") ||
            msg.includes("429")
        ) {

            cooldown[rpcIndex] = Date.now();

            rpcIndex =
                (rpcIndex + 1) % providers.length;

            console.warn(
                "RPC failed → switching",
                rpcIndex
            );
        }

        if (retry < CONFIG.MAX_RETRY) {

            await new Promise(r =>
                setTimeout(r, 900)
            );

            return withRetry(fn, retry + 1);
        }

        throw err;
    }
}

/* =====================================
   EXPORT GLOBAL
===================================== */

window.SIDRAPULSE = {
    getProvider,
    withRetry,
    CONFIG
};

console.log("SIDRAPULSE CORE READY");

})();