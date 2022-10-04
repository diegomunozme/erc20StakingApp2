pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Chainlink is ERC20 {
    constructor() ERC20("WrappedEther", "WETH") {
        _mint(msg.sender, 5000 * 10**18);
    }
}