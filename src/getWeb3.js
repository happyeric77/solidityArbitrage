import Web3 from "web3";
const HDWalletProvider = require("@truffle/hdwallet-provider");
path = require("path")
const dotenv = require('dotenv');
result = dotenv.config({ path: path.resolve("./.env") });
if (result.error) {
    console.log("Fail to load .env varilable: tokenMonitor.js")
    throw result.error
}

const getWeb3 = () =>
    new Promise(async (resolve, reject) => {
        // Wait for loading completion to avoid race conditions with web3 injection timing.        
        // Modern dapp browsers...
        if (window.ethereum) {
            const web3 = new Web3(window.ethereum);
            try {
                // Request account access if needed
                await window.ethereum.enable();
                // Acccounts now exposed
                resolve(web3);
            } catch (error) {
                reject(error);
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            // Use Mist/MetaMask's provider.
            const web3 = window.web3;
            console.log("Injected web3 detected.");
            resolve(web3);
        }
        // Fallback to localhost; use dev console port by default...

        else {
            // const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
            const provider = new HDWalletProvider(process.env.MNEMONIC, "https://kovan.infura.io/v3/" + process.env.INFURA_API_KEY, 1)
            const web3 = new Web3(provider);
            // console.log("No web3 instance injected, using Local web3.");
            console.log("Use HDWallet")
            resolve(web3);

        }        
    });

export default getWeb3;
