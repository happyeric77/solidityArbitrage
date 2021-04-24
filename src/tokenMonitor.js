const arbitrageJson = require("./contracts/Arbitrage.json")
const erc20Json = require("./contracts/Dai.json")
const routerJson = require("./contracts/Router.json")
const Web3 = require("web3")
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require('fs')
path = require("path")
const dotenv = require('dotenv');
result = dotenv.config({ path: path.resolve("./.env") });
if (result.error) {
    console.log("Fail to load .env varilable: tokenMonitor.js")
    throw result.error
}

const app = {
    web3: null,
    accounts: null,
    uniRouter: null,
    sushiRouter: null,
    arbitrage: null,
    // token definition: [tokenContractInstance, loan amount]
    token0: [null, "100"],
    token1: [null, "0.1"],
    weth: null,
    gasPrice: null,
    gasLimit: null,
    gasUsed: null,
    transactionFee: null,
    loanToken: null,
    wethProfit: null,
    arbiTx: null,
    txGoneTrough: null,
    init: async () => {
        
        await app.getWeb3()
        await app.loadContractInstances()
        
        let isProfitable
        setInterval(async()=>{
            try{
                await app.fetchGasInfo()
                isProfitable = await app.assertProfit()
            } catch(err) {
                isProfitable = false
                console.log(`Fail to check, reason: \n${err} `)                
            }           
            if (isProfitable) {app.startArbitrage()}
        }, 30000)        
    },
    loadContractInstances: async () => {
        app.uniRouter = await new app.web3.eth.Contract(routerJson.abi, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")
        app.sushiRouter = await new app.web3.eth.Contract(routerJson.abi, "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506")
        app.arbitrage = await new app.web3.eth.Contract(arbitrageJson.abi, "0x5f1f1BcEF9d283b234487643d996C1C41a87491D")
        app.token0[0] = await new app.web3.eth.Contract(erc20Json.abi, "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa")
        app.token1[0] = await new app.web3.eth.Contract(erc20Json.abi, "0xd0a1e359811322d97991e03f863a0c30c2cf029c")
        app.weth = await new app.web3.eth.Contract(erc20Json.abi, "0xd0a1e359811322d97991e03f863a0c30c2cf029c")
        
    },
    getWeb3: async () => {
        const provider = await new HDWalletProvider(process.env.MNEMONIC, "https://kovan.infura.io/v3/" + process.env.INFURA_API_KEY, 1)
        
        app.web3 = new Web3(provider);
        app.accounts = await app.web3.eth.getAccounts()
        console.log("Your wallet data sucessfully loaded! Ready to go ......")
    },
    fetchGasInfo: async () => {
        app.gasPrice = await app.web3.eth.getGasPrice()
        // TODO: Change loan amount from hard coded constant to changable (How to get max. possbile withdrawable)
        try {
            try {
                app.gasLimit = await app.arbitrage.methods.startArbitrage(app.token0[0]._address, app.token1[0]._address, app.web3.utils.toWei(app.token0[1]), 0).estimateGas()
                app.loanToken = app.token0[0]
                console.log("loan token 0, swap to token 1 ")
            } catch {
                app.gasLimit = await app.arbitrage.methods.startArbitrage(app.token0[0]._address, app.token1[0]._address, 0, app.web3.utils.toWei(app.token1[1])).estimateGas()
                app.loanToken = app.token1[0]
                console.log("loan token 1, swap to token 0 ")
            }            
        } catch(err) {
            console.log(`Error: app.fetchGasInfo.stargArbitrage. Price gap migt be to small Detail: ${err}`)
        }
        const transactionFeeInWei = app.gasLimit * app.gasPrice
        app.transactionFee = app.web3.utils.fromWei(transactionFeeInWei.toString())
    },
    assertProfit: async () =>{
        let amountOut
        let amountRequiredToRefund

        switch (app.loanToken) {
            case app.token0[0]:
                console.log("loan-token is token0")
                
                amountOut = await app.sushiRouter.methods.getAmountsOut(app.web3.utils.toWei(app.token0[1]), [app.token0[0]._address, app.token1[0]._address]).call()
                amountRequiredToRefund = await app.uniRouter.methods.getAmountsIn(app.web3.utils.toWei(app.token0[1]), [app.token1[0]._address, app.token0[0]._address]).call()
                break
            case app.token1[0]:
                console.log("loan-token is token1")
                amountOut = await app.sushiRouter.methods.getAmountsOut(app.web3.utils.toWei(app.token1[1]), [app.token1[0]._address, app.token0[0]._address]).call()
                amountRequiredToRefund = await app.uniRouter.methods.getAmountsIn(app.web3.utils.toWei(app.token1[1]), [app.token0[0]._address, app.token1[0]._address]).call()
                break
        }
        amountOut = amountOut[1]
        amountRequiredToRefund = amountRequiredToRefund[0]
        const profitInWei = amountOut - amountRequiredToRefund
        const profit = app.web3.utils.fromWei(profitInWei.toString())
        
        const targetToken = app.loanToken == app.token0[0] ? app.token1[0] : app.token0[0]
        
        let wethProfitInWei
        if (targetToken._address === app.weth._address) {
            wethProfitInWei = profitInWei
            app.wethProfit = profit
        } else {
            wethProfitInWei = await app.uniRouter.methods.getAmountsOut(app.web3.utils.toWei(profit), [targetToken._address, app.weth._address]).call()
            app.wethProfit = app.web3.utils.fromWei(wethProfitInWei[1].toString())
        }
        const netProfit = app.wethProfit-app.transactionFee
        const profitable = netProfit > 0 ? true : false
        const profitMessage = netProfit > 0 ? "\n***********************\n** Yes! Go arbitrage **\n***********************" : "NO, keep scanning\n----------------------------------"
        console.log(`Profit (target token): ${profit}`)
        console.log(`Profit (weth): ${app.wethProfit} `)
        console.log(`Max transaction Fee: ${app.transactionFee}`)
        console.log(`Net Profit (weth): ${netProfit}`)
        console.log(`Profitable: ${profitMessage}`)
        return profitable
    },
    startArbitrage: async () =>{
        console.log("StartArbitrage...")
        switch (app.loanToken) {
            case app.token0[0]:
                await app.runArbitrage(app.web3.utils.toWei(app.token0[1]), 0)
                break
            case app.token1[0]:
                await app.runArbitrage(0, app.web3.utils.toWei(app.token1[1]))
                break
        }
        await app.summerize()
    },
    runArbitrage: async (pos1, pos2) => {
        try {
            tx = await app.arbitrage.methods.startArbitrage(app.token0[0]._address, app.token1[0]._address, pos1, pos2).send({
                from: app.accounts[0],
                gas: app.gasLimit,
                gasPrice: app.gasPrice
            })
            console.log("Arbigrate done successfully, congraduration!")
            
            app.gasUsed = tx.gasUsed
            app.arbiTx = tx.transactionHash
            app.txGoneTrough = true
            
        } catch (err) {
            console.log(err.receipt)
            console.log("Arbitrage implement fail")

            app.gasUsed = err.receipt.gasUsed
            app.arbiTx = err.receipt.transactionHash
            app.txGoneTrough = false
        } 
    },
    summerize: async () => {
        let nowTime = Date(Date.now())
        let txFeeInWei = app.gasUsed * app.gasPrice
        let txFee = app.web3.utils.fromWei(txFeeInWei.toString())
        const summery = {
            txSucceeded: app.txGoneTrough,
            timestamp: nowTime.toString(),
            txHash: app.arbiTx,
            txFee: txFee,
            profitInWeth: app.txGoneTrough ? app.wethProfit : -(txFee),
        }
        console.log(`Tx succeeded: ${summery.txSucceeded}`)
        console.log(`Tx Hash ${summery.txHash}`)
        console.log(`Tx Fee: ${summery.txFee}`)
        console.log(`Profit (WETH): ${summery.profitInWeth}`)  
        console.log("-------------------------------------------------------------")

        await app.saveDataJson(summery)
    },
    saveDataJson: async (dataRaw) => {
        let historyRaw = await fs.readFileSync("arbitrageHistory.json")
        let history = JSON.parse(historyRaw)
        history.push(dataRaw)
        const data = JSON.stringify(history)
        await fs.writeFileSync("arbitrageHistory.json", data)
        console.log("--------------ArbitrageData updated-----------------")
    }
}

app.init()


