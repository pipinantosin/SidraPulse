async function fetchPoolData(poolAddress){
    try{
        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

        const [slot0, token0Addr, token1Addr, liquidityBN] = await Promise.all([
            pool.slot0(),
            pool.token0(),
            pool.token1(),
            pool.liquidity()
        ]);

        const token0 = new ethers.Contract(token0Addr, ERC20_ABI, provider);
        const token1 = new ethers.Contract(token1Addr, ERC20_ABI, provider);

        const [dec0, dec1, sym0, sym1] = await Promise.all([
            token0.decimals(),
            token1.decimals(),
            token0.symbol(),
            token1.symbol()
        ]);

        const price = calculatePrice(slot0[0], dec0, dec1);

        return {
            token0: sym0 || "Token0",
            token1: sym1 || "Token1",
            price: Number(price.toPrecision(6)),
            liquidity: Number(liquidityBN.toString())
        };

    }catch(err){
        console.warn("Pool fetch error", poolAddress, err);
        return {
            token0: "Token0",
            token1: "Token1",
            price: 0,
            liquidity: 0
        };
    }
}

function calculatePrice(sqrtPriceX96, dec0, dec1){
    try{
        const sqrtBN = BigInt(sqrtPriceX96.toString());
        const priceBN = (sqrtBN * sqrtBN * BigInt(10 ** dec0)) / (2n ** 192n);
        return Number(priceBN) / 10 ** dec1;
    }catch(e){
        return 0;
    }
}

window.fetchPoolData = fetchPoolData;
