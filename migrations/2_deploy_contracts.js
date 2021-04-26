const Arbitrage = artifacts.require("Arbitrage");
const path = require("path");
const dotenv = require('dotenv');
result = dotenv.config({ path: path.resolve("../.env") });
if (result.error) {
    console.log("Fail to load .env varilable: migrations.2_deploy_contracts")
    throw result.error
}

const TESTNET = process.env.TESTNET === "yes" ? true : false
// const Dai = artifacts.require("Dai");
// const Weth = artifacts.require("Weth");
// const Router = artifacts.require("Router");
// const SwapTokens = artifacts.require("SwapTokens")

// kovan
module.exports = function (deployer) {
    deployer.deploy(
        Arbitrage, 
        TESTNET ? process.env.UNISWAP_FACTORY_KOVAN : process.env.UNISWAP_FACTORY_MAIN, 
        TESTNET ? process.env.SUSHISWAP_ROUTER_KOVAN : process.env.SUSHISWAP_ROUTER_MAIN
    );
    // deployer.deploy(Dai)
    // deployer.deploy(Weth)
    // deployer.deploy(Router)
    // deployer.deploy(SwapTokens)
};