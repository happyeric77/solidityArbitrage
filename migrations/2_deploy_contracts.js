const Arbitrage = artifacts.require("Arbitrage");
const Dai = artifacts.require("Dai");
const Weth = artifacts.require("Weth");
const Router = artifacts.require("Router");
const SwapTokens = artifacts.require("SwapTokens")

// kovan
module.exports = function (deployer) {
    deployer.deploy(Arbitrage, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506");
    deployer.deploy(Dai)
    deployer.deploy(Weth)
    deployer.deploy(Router)
    deployer.deploy(SwapTokens)
};

// //mainnet
// module.exports = function (deployer) {
//     deployer.deploy(Arbitrage, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
//     deployer.deploy(Dai)
//     deployer.deploy(Weth)
// };


// module.exports = function (deployer) {
//     deployer.deploy(Arbitrage, "0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
//     deployer.deploy(Dai)
//     deployer.deploy(Weth)
// };
