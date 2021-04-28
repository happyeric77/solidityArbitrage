const arbitrageJson = require("../src/contracts/Arbitrage.json")
const erc20Json = require("../src/contracts/Dai.json")
const routerJson = require("../src/contracts/Router.json")
const Web3 = require("web3")
const { ChainId, Fetcher: sushiFetcher} = require("@sushiswap/sdk");
const { Fetcher: uniFetcher} = require("@uniswap/sdk");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require('fs')
path = require("path")
const dotenv = require('dotenv');
result = dotenv.config({ path: path.resolve("./.env") });
if (result.error) {
    console.log("Fail to load .env varilable: tokenMonitor.js")
    throw result.error
}

const TESTNET = process.env.TESTNET === "yes" ? true : false

const app = {
    web3: null,
    accounts: null,
    uniRouter: null,
    sushiRouter: null,
    arbitrage: null,
    token0: [/*token instance:*/null, /*best profit loan amount:*/null, /*possible loan amount range*/[0.0001, null], /*token address*/process.env.DAI_MAIN],
    token1: [/*token instance:*/null, /*best profit loan amount:*/null, /*possible loan amount range*/[0.0001, null], /*token address*/process.env.WETH_MAIN],
    reservesInUni: null,
    reservesInSushi: null,
    weth: null,
    maxSlippage: 0.15, 
    gasPrice: null,
    gasLimit: null,
    estimateGasUsed: 192278,
    gasUsed: null,
    transactionFee: null,
    loanToken: null,
    wethProfit: null,
    arbiTx: null,
    txGoneTrough: null,
    isProfitable: false,
    init: async () => {
        await app.getWeb3()
        await app.loadContractInstances(app.token0[3], app.token1[3])
        
        setInterval(async()=>{
            app.isProfitable = false
            await app.decideLoanSellDirection()            
            await app.getBestProfitTokenAmount()
            await app.fetchGasInfo()
            try{
                app.isProfitable = await app.assertProfit()
            } catch(err) {
                app.isProfitable = false
                console.log(`Fail to check beacuse no profit (app.init), reason: \n${err} `)                
            } 
            app.summerize() 
        }, 30000)        
    },
    loadContractInstances: async (token0, token1) => {
        app.uniRouter = await new app.web3.eth.Contract(
            routerJson.abi, 
            TESTNET ? process.env.UNISWAP_ROUTER_KOVAN : process.env.UNISWAP_ROUTER_MAIN
        )
        app.sushiRouter = await new app.web3.eth.Contract(
            routerJson.abi, 
            TESTNET ? process.env.SUSHISWAP_ROUTER_KOVAN : process.env.SUSHISWAP_ROUTER_MAIN
        )
        app.token1[0] = await new app.web3.eth.Contract(erc20Json.abi, token1)
        app.token0[0] = await new app.web3.eth.Contract(erc20Json.abi, token0) 
        app.weth = await new app.web3.eth.Contract(
            erc20Json.abi, 
            TESTNET ? process.env.WETH_KOVAN : process.env.WETH_MAIN
        )
    },
    getWeb3: async () => {
        const provider = await new HDWalletProvider(
            process.env.MNEMONIC, 
            TESTNET ? "https://kovan.infura.io/v3/" + process.env.INFURA_API_KEY : "https://mainnet.infura.io/v3/" + process.env.INFURA_API_KEY, 
            0
        )
        
        app.web3 = new Web3(provider);
        app.accounts = await app.web3.eth.getAccounts()
        console.log("Your wallet data sucessfully loaded! Ready to go ......")
    },
    fetchGasInfo: async () => {
        app.gasPrice = await app.web3.eth.getGasPrice()
        const transactionFeeInWei = app.estimateGasUsed * app.gasPrice
        app.transactionFee = app.web3.utils.fromWei(transactionFeeInWei.toString())        
    },
    assertProfit: async () =>{
        let amountOut
        let amountRequiredToRefund

        switch (app.loanToken) {
            case app.token0[0]:               
                amountOut = await app.sushiRouter.methods.getAmountsOut(app.web3.utils.toWei(app.token0[1]), [app.token0[0]._address, app.token1[0]._address]).call()
                amountRequiredToRefund = await app.uniRouter.methods.getAmountsIn(app.web3.utils.toWei(app.token0[1]), [app.token1[0]._address, app.token0[0]._address]).call()
                break
            case app.token1[0]:
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
    summerize: async () => {
        let nowTime = Date(Date.now())
        let txFeeInWei = app.estimateGasUsed * app.gasPrice
        let txFee = app.web3.utils.fromWei(txFeeInWei.toString())
        const summery = {
            isProfitable: app.isProfitable,
            loanToken: app.loanToken._address,
            swapToToken: app.loanToken._address === app.token0[0]._address? app.token1[0]._address : app.token0[0]._address,
            maxSlippage: app.maxSlippage,
            loanAmount: app.loanToken[1],
            timestamp: nowTime.toString(),
            estimateGasUsed: app.estimateGasUsed,
            gasPrice: app.gasPrice,
            txFee: txFee,
            profitInWei: app.wethProfit,
            netProfitInWeth: app.wethProfit-txFee,
        }
        console.log(`Profitable : ${summery.isProfitable}`)
        console.log(`Tx Fee: ${summery.txFee}`)
        console.log(`gross Profit (WETH): ${summery.profitInWeth}`) 
        console.log(`net Profit (WETH): ${summery.netProfitInWeth}`)  
        console.log("-------------------------------------------------------------")
        await app.saveDataJson(summery)
    },
    saveDataJson: async (dataRaw) => {
        let historyRaw = await fs.readFileSync(
            TESTNET ? path.resolve("./utils/srcData/detailTrackingyKovan.json") : path.resolve("./utils/srcData/detailTracking.json")
        )
        let history = JSON.parse(historyRaw)
        history.push(dataRaw)
        const data = JSON.stringify(history)
        await fs.writeFileSync(
            TESTNET ? path.resolve("./utils/srcData/detailTrackingyKovan.json") : path.resolve("./utils/srcData/detailTracking.json"), 
            data
        )
        console.log("--------------detailTracking File updated-----------------")
    },
    getBestProfitTokenAmount: async () => {
        let amountOut
        let amountRequiredToRefund
        let possibleProfitSet = []

        for (var i=0; i<=4; i++) {
            var loanAmount = 0
            switch (app.loanToken) {
                case app.token0[0]:
                    loanAmount = app.token0[2][0] + (app.token0[2][1]-app.token0[2][0])* i / 4
                    amountOut = await app.sushiRouter.methods.getAmountsOut(app.web3.utils.toWei(loanAmount.toString()), [app.token0[0]._address, app.token1[0]._address]).call()
                    amountRequiredToRefund = await app.uniRouter.methods.getAmountsIn(app.web3.utils.toWei(loanAmount.toString()), [app.token1[0]._address, app.token0[0]._address]).call()
                    
                    break
                case app.token1[0]:
                    loanAmount = app.token1[2][0] + (app.token1[2][1]-app.token1[2][0])* i / 4
                    amountOut = await app.sushiRouter.methods.getAmountsOut(app.web3.utils.toWei(loanAmount.toString()), [app.token1[0]._address, app.token0[0]._address]).call()
                    amountRequiredToRefund = await app.uniRouter.methods.getAmountsIn(app.web3.utils.toWei(loanAmount.toString()), [app.token0[0]._address, app.token1[0]._address]).call()
                    
                    break
            }
            amountOut = amountOut[1]
            amountRequiredToRefund = amountRequiredToRefund[0]
            const profitInWei = amountOut - amountRequiredToRefund
            possibleProfitSet.push({loanAmount: loanAmount, profit: profitInWei})
        }
        console.log(possibleProfitSet)  
        const profitSet = possibleProfitSet.map(ele=>ele.profit)
        const bestLoanAmount = possibleProfitSet.filter(ele=>{
            return ele.profit == Math.max(...profitSet)
        })
        console.log(`Best loan amount: ${bestLoanAmount[0].loanAmount}`)
        switch (app.loanToken) {
            case app.token0[0]:
                app.token0[1] = bestLoanAmount[0].loanAmount.toString()
                break
            case app.token1[0]:
                app.token1[1] = bestLoanAmount[0].loanAmount.toString()
                break
        }
    },
    decideLoanSellDirection: async () => {
        const network = TESTNET ? ChainId.KOVAN : ChainId.MAINNET
        let sushitoken0data = await sushiFetcher.fetchTokenData(network, app.token0[0]._address)
        let sushitoken1data = await sushiFetcher.fetchTokenData(network, app.token1[0]._address)
        const sushipair = await sushiFetcher.fetchPairData(sushitoken0data, sushitoken1data)
        let sushiReserve0 = Number(sushipair.reserve0.toExact())
        let sushiReserve1 = Number(sushipair.reserve1.toExact())

        let unitoken0data = await uniFetcher.fetchTokenData(network, app.token0[0]._address)
        let unitoken1data = await uniFetcher.fetchTokenData(network, app.token1[0]._address)
        const unipair = await uniFetcher.fetchPairData(unitoken0data, unitoken1data)
        let uniReserve0 = Number(unipair.reserve0.toExact())
        let uniReserve1 = Number(unipair.reserve1.toExact())
        app.reservesInUni = [uniReserve0, uniReserve1]
        app.reservesInSushi = [sushiReserve0, sushiReserve1]

        let noSlippagePriceUni = uniReserve1/uniReserve0
        let noSlippagePriceSushi = sushiReserve1/sushiReserve0
        console.log(`reserves (uni[token0, token1]): ${app.reservesInUni}`)
        console.log(`reserves (sushi[token0, token1]): ${app.reservesInSushi}`)
        
        console.log(`Price in Uniswap (token0->token1): ${noSlippagePriceUni}`)
        console.log(`Price in Sushiswap (token0->token1): ${noSlippagePriceSushi}`)

        if (noSlippagePriceUni < noSlippagePriceSushi ) {
            app.loanToken = app.token0[0]
            console.log(`loan token 0 (${app.token0[0]._address}),\nswap to token 1 (${app.token1[0]._address}) `)
            app.getAmountByExactSlippage(0)
        } else {
            app.loanToken = app.token1[0]
            console.log(`loan token 1 (${app.token1[0]._address}),\nswap to token 0 (${app.token0[0]._address}) `)
            app.getAmountByExactSlippage(1)
        }   
    },
    getAmountByExactSlippage: (loanToken) =>{
        let maxAmountInUni = (app.reservesInUni[loanToken] / (1 - app.maxSlippage)) - app.reservesInUni[loanToken]
        let maxAmountInSushi = (app.reservesInSushi[loanToken] / (1 - app.maxSlippage)) - app.reservesInSushi[loanToken]
        console.log(`Swap amount in Uni (${app.maxSlippage} slippage: ${maxAmountInUni})`)
        console.log(`Swap amount in Sushi (${app.maxSlippage} slippage: ${maxAmountInSushi})`)
        switch (loanToken) {
            case 0: app.token0[2][1] = Math.min(maxAmountInSushi, maxAmountInUni); break;
            case 1: app.token1[2][1] = Math.min(maxAmountInSushi, maxAmountInUni); break;
            default: throw "Error in app.getAmountByExactSlippage"
        }
    }
}

app.init()



