// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { IAllo } from "./external/IAllo.sol";

contract HawthoriaPortal {

    // We want to create a portal interaction for performing any portal interactions

    // We want the messages to be sent from aztec land, but they need to trigger a function call on this side
    // That means that we need to have some kind of tip that can be redeemed by consuming the message?

    // We can borrow the uniswap logic to batch everyone's donations together on the ethereum side

    address public alloAddress;

    constructor(address _alloAddress) {
        alloAddress = _alloAddress;
    }

    
    function fundPool(uint256 _poolId, uint256 _amount) public {
        // Perform the aztec bridge boilerplate
        


        // Perform the bridge functions
        IAllo(alloAddress).fundPool(_poolId, _amount);
    }
}
