# Arbitrage 

Track arbitrage opportunity on both sushiswap and uniswap price and implement arbitrage smart contract

## Setup and activate nodejs and solidity environment :
For Unix based systems please execute the following command to create venv and install requirements.

1. Make sure nodejs is installed
2. Call following commands in bash shell

```
npm install
```

### Pre-requisites


* Modify the env file to .env and fill the empty information.
```
MNEMONIC="Your wallet mnemonic seed"
INFURA_API_KEY="Your infura project ID"
PYTHON="Your python env dir"
```
The python environment need to has pandas installed.


### How to Use

* Deploy the arbitrage contract onto testnet and start testing on kovan testnet
```
$ truffle migrate --reset --network kovan
```
* Fill the contract address into below section in .env:

```
ARBI_KOVAN=
```
* Run Monitor script to start monitoring opportunity on testnet

```
$ node ./utils/tokenMonitor.js
```

As long as there is a arbitrage implement, the history recorde will in .utils/outputData/performanceSummery.xlsx

* switch the TESTNET option in .env file to no and deploy the contract onto mainnet
```
$ truffle migrate --reset --network main
```
* Fill the contract address into below section in .env:
```
ARBI_MAIN=
```

* Run Monitor script to start monitoring opportunity on testnet
```
$ node ./utils/tokenMonitor.js
```
As long as there is a arbitrage implement, the history recorde will in .utils/outputData/performanceSummery.xlsx
