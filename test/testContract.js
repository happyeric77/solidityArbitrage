
const Contract = artifacts.require("./path/to/contract.sol")
const path = require("path");
const expect = require("./setupTest")

const dotenv = require('dotenv');
result = dotenv.config({ path: "./.env" });
if (result.error) {
    console.log("Fail to load .env varilable: test.MyToken.test.js")
    throw result.error
}

const BN = web3.utils.BN

contract ("My contract test", accounts=>{
    it("contract test passed", async ()=>{
        const contractInstance = await Contract.deployed()

        it("Should be able to have contract address", async ()=>{
            const contractInstance = await Contract.deployed()
            expect(contractInstance.address).to.not.equal("")
            expect(contractInstance.address).to.not.equal(0x0)
            expect(colorInstance.address).to.not.equal(null)
            expect(colorInstance.address).to.not.equal(undefined)
        })

        it("Test others", async ()=>{
            /* 
            ** get env var by dotenv (create a .env file in ./ dir)
            *///--> ex. this.myToken = Token.new(process.env.INITIAL_TOKEN)

            /* 
            ** Use Chai to do assert 
            *///--> ex. expect(await instance.balanceOf(accounts[0])).to.be.a.bignumber.equal(totalSupply);
        })
        
    })
})