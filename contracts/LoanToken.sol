// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract LoanToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("LoanToken", "LTK") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external  {
        _mint(to, amount);
    }
}
