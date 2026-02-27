const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
    "function liquidity() view returns (uint128)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
];

const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const MULTICALL_ABI = [
  "function aggregate(tuple(address target, bytes callData)[] calls) public view returns (uint256 blockNumber, bytes[] returnData)"
];