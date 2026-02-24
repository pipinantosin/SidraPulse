/**
 * ==========================================
 * SIDRAPULSE - WALLET BALANCE VIEWER
 * ==========================================
 */

const provider = new ethers.providers.JsonRpcProvider(
    "https://node.sidrachain.com/"
);

const ERC20_MIN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const checkBtn = document.getElementById("check-balance-btn");
const resultBox = document.getElementById("balance-result");

/* =================================================
   WALLET STORAGE
================================================= */

let savedWallets =
    JSON.parse(localStorage.getItem("savedWallets")) || [];

function saveWalletStorage() {
    localStorage.setItem(
        "savedWallets",
        JSON.stringify(savedWallets)
    );
}

function addWallet(address) {
    if (savedWallets.includes(address)) return;
    savedWallets.push(address);
    saveWalletStorage();
    renderWalletList();
}

function removeWallet(address) {
    savedWallets = savedWallets.filter(a => a !== address);
    saveWalletStorage();
    renderWalletList();
}

function renderWalletList() {
    const list = document.getElementById("wallet-list");
    if (!list) return;

    list.innerHTML = "";

    savedWallets.forEach(addr => {
        const div = document.createElement("div");
        div.style.marginBottom = "6px";

        div.innerHTML = `
            <span style="cursor:pointer;color:#4da6ff"
                onclick="selectWallet('${addr}')">
                ${addr.slice(0,6)}...${addr.slice(-4)}
            </span>
            <button onclick="removeWallet('${addr}')">
                X
            </button>
        `;

        list.appendChild(div);
    });
}

function selectWallet(address) {
    document.getElementById("check-address").value = address;
}

/* =================================================
   CHECK BALANCE
================================================= */

checkBtn?.addEventListener("click", async () => {

    const address =
        document.getElementById("check-address").value.trim();

    if (!ethers.utils.isAddress(address)) {
        resultBox.innerHTML =
            "<span style='color:red'>Invalid address</span>";
        return;
    }

    addWallet(address);
    resultBox.innerHTML = "Loading...";

    try {

        // 1️⃣ Native SDA
        const nativeBalance =
            await provider.getBalance(address);

        const formattedNative =
            ethers.utils.formatEther(nativeBalance);

        let html = `
            <div style="margin-bottom:10px">
                <strong>SDA:</strong>
                ${Number(formattedNative).toFixed(4)}
            </div>
        `;

        // 2️⃣ ERC20 Tokens
        if (typeof TOKENS !== "undefined") {

            for (const token of TOKENS) {

                try {

                    const contract =
                        new ethers.Contract(
                            token.address,
                            ERC20_MIN_ABI,
                            provider
                        );

                    const [balance, decimals, symbol] =
                        await Promise.all([
                            contract.balanceOf(address),
                            contract.decimals(),
                            contract.symbol()
                        ]);

                    const formatted =
                        Number(
                            ethers.utils.formatUnits(
                                balance,
                                decimals
                            )
                        );

                    if (formatted > 0) {
                        html += `
                            <div style="margin-bottom:6px">
                                <strong>${symbol}:</strong>
                                ${formatted.toFixed(4)}
                            </div>
                        `;
                    }

                } catch (err) {
                    console.warn("Token error:", token.symbol);
                }
            }
        }

        resultBox.innerHTML = html;

    } catch (err) {
        console.error(err);
        resultBox.innerHTML =
            "<span style='color:red'>Failed fetch</span>";
    }

});

/* =================================================
   AUTO LOAD
================================================= */

document.addEventListener("DOMContentLoaded", () => {

    renderWalletList();

    if (savedWallets.length > 0) {
        document.getElementById("check-address").value =
            savedWallets[savedWallets.length - 1];
    }

});

document.addEventListener("DOMContentLoaded", () => {

    renderWalletList();

    if (savedWallets.length > 0) {
        document.getElementById("check-address").value =
            savedWallets[savedWallets.length - 1];
    }

});

/* ==============================
   AUTO ADJUST FLOATING SPACING
============================== */

const panel = document.getElementById("wallet-panel");

function adjustBottomSpacing() {
    if (!panel) return;
    const height = panel.offsetHeight;
    document.body.style.paddingBottom = height + 40 + "px";
}

window.addEventListener("load", adjustBottomSpacing);
window.addEventListener("resize", adjustBottomSpacing);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(reg => console.log("SW registered"))
      .catch(err => console.log("SW failed", err));
  });
}