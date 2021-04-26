
const Arbitrage = artifacts.require("Arbitrage.sol")
const path = require("path");
const expect = require("./setupTest")

const dotenv = require('dotenv');
result = dotenv.config({ path: "./.env" });
if (result.error) {
    console.log("Fail to load .env varilable: test.MyToken.test.js")
    throw result.error
}

const BN = web3.utils.BN

const TESTNET = process.env.TESTNET === "yes" ? true : false

contract ("My contract test", async accounts=>{
    let arbitrageInstance
    it("Should be able to have contract address", async ()=>{
        arbitrageInstance = await Arbitrage.deployed()
        expect(arbitrageInstance.address).to.not.equal("")
        expect(arbitrageInstance.address).to.not.equal(0x0)
        expect(arbitrageInstance.address).to.not.equal(null)
        expect(arbitrageInstance.address).to.not.equal(undefined)
    })

    it("Should be able to do arbitrage by owner", async () =>{
        let owner = await arbitrageInstance.owner()
        console.log(`Owner is ${owner}`)
        console.log(`Caller is ${accounts[0]}`)
        return expect(arbitrageInstance.startArbitrage(
            TESTNET ? process.env.DAI_KOVAN : process.env.DAI_MAIN, 
            TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN, 
            web3.utils.toWei("1"), 
            0
        )).to.be.fulfilled
    })

    it("Should not be able to do arbitrage others", async () =>{
        let owner = await arbitrageInstance.owner()
        console.log(`Owner is ${owner}`)
        console.log(`Caller is ${accounts[1]}`)
        return expect(arbitrageInstance.startArbitrage(
            TESTNET ? process.env.DAI_KOVAN : process.env.DAI_MAIN,
            TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN,
            web3.utils.toWei("1"), 
            0, 
            {from: accounts[1]}
        )).to.be.rejected
    })

    it("Should be able to get reserves from uniswap", async () => {
        let reserves = await arbitrageInstance.getCurrentUniReserves(
            TESTNET ? process.env.DAI_KOVAN : process.env.DAI_MAIN,
            TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN,
        )        
        expect(reserves.reserve0).to.not.equal(new BN(0))
        expect(reserves.reserve1).to.not.equal(new BN(0))
    })

    // it("Should be able to get reserves from sushiswap", async () => {
    //     let sushiReserves = await arbitrageInstance.getCurrentSushiReserves(
    //         TESTNET ? process.env.DAI_KOVAN : process.env.DAI_MAIN,
    //         TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN,
    //     )
    //     // console.log(sushiReserves.reserve0.toString())
    //     console.log(sushiReserves)

    //     expect(arbitrageInstance.getCurrentSushiReserves(
    //         TESTNET ? process.env.DAI_KOVAN : process.env.DAI_MAIN,
    //         TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN,
    //     ) ).to.be.fulfilled
    // })
})