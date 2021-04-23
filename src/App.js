
import { useEffect, useRef } from "react";
import getWeb3 from "./getWeb3";

function App() {
  const web3 = useRef();
  const accounts = useRef();

  useEffect(()=>{
    try {
      (async () =>{
        web3.current = await getWeb3();
        const networkId = await web3.current.eth.net.getId();
        accounts.current = await web3.current.eth.getAccounts();
        // Create contract ex:
        // myContract.current = new web3.current.eth.Contract(
        //   myContractJson.abi,
        //   myContractJson.networks[networkId] && myContractJson.networks[networkId].address
        // );

      })() 
    } catch (err) {
      console.log(err)
    }
  },[])


  return (
    <div className="App">
      React-Truffle Boilerplate
    </div>
  );
}

export default App;
