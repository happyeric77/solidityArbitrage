pragma solidity ^0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

contract Arbitrage {
    address public factory;
    uint deadline = now + 10 days;
    IUniswapV2Router02 public sushiRouter;
    
    event pathSwapInfo(address from, address to, uint tokenAmount);
    event tokenSwapInfo(address from, address to, uint tokenAmount);
    event amountInInfo(uint first, uint second);
    event testObject(address addr, uint payback);

    constructor(address _factory, address _sushiRouter) public {
        factory = _factory;  
        sushiRouter = IUniswapV2Router02(_sushiRouter);
    }

    function startArbitrage(address token0, address token1, uint amount0, uint amount1) external {
        address pairAddress = IUniswapV2Factory(factory).getPair(token0, token1);
        require(pairAddress != address(0), 'This pool does not exist');
        IUniswapV2Pair(pairAddress).swap(
            amount0, 
            amount1, 
            address(this), 
            bytes('not empty')
        );
    }

    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external {

        address[] memory path = new address[](2);
        uint amountToken = _amount0 == 0 ? _amount1 : _amount0;
        
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();

        require(msg.sender == UniswapV2Library.pairFor(factory, token0, token1), 'Unauthorized'); 
        require(_amount0 == 0 || _amount1 == 0);

        path[0] = _amount0 == 0 ? token1 : token0;
        path[1] = _amount0 == 0 ? token0 : token1;

        // Define token from:
        IERC20 token = IERC20(_amount0 == 0 ? token1 : token0);

        // Define token to:
        IERC20 targetToken = IERC20(_amount0 == 0 ? token0 : token1);
        
        token.approve(address(sushiRouter), amountToken);
        
        uint allowed = token.allowance(address(this), address(sushiRouter));

        // STEP1 : GET Input Amount of token
            //Calculate needed input by given output amount (0.01 dai)
        address[] memory reversePath = new address[](2);
        reversePath[0] = path[1];
        reversePath[1] = path[0];
        uint amountRequired = UniswapV2Library.getAmountsIn(
            factory, 
            amountToken, 
            reversePath
        )[0];

        // STEP2: SWAP TOKEN to target token
        uint amountReceived = sushiRouter.swapExactTokensForTokens(
            amountToken, 
            amountRequired,
            path, 
            address(this), 
            deadline
        )[1];
        
        // The fee for flashSwap is .003 / .997 ≈ 0.3009027% (https://uniswap.org/docs/v2/smart-contract-integration/using-flash-swaps/)
        // uint payback = amountToken*100301/100000;
        // token.transfer(msg.sender, payback);

        // comaring with flashloan, flashswap seems need not to pay fee bacuase it is included in swap fee.
        targetToken.transfer(msg.sender, amountRequired);
        // targetToken.transfer(msg.sender, amountRequired*100301/100000);
        

        targetToken.transfer(tx.origin, amountReceived-amountRequired);

        emit pathSwapInfo(address(token), address(targetToken), amountToken);
        emit tokenSwapInfo(address(path[0]), address(path[1]), amountToken);
        emit amountInInfo(amountRequired, allowed);
        emit testObject(address(this), amountReceived-amountRequired);
    }
}