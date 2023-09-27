// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { IAllo } from "./external/IAllo.sol";
import { DataStructures } from "./aztec/DataStructures.sol";
import { IRegistry } from "./aztec/IRegistry.sol";

import {TokenPortal} from "src/bridge/TokenPortal.sol";

import {Hash} from "@aztec/Hash.sol";
import {IERC20} from "@oz/token/ERC20/IERC20.sol";

contract HawthoriaPortal {

    // We want to create a portal interaction for performing any portal interactions

    // We want the messages to be sent from aztec land, but they need to trigger a function call on this side
    // That means that we need to have some kind of tip that can be redeemed by consuming the message?

    // We can borrow the uniswap logic to batch everyone's donations together on the ethereum side

    address public alloAddress;
    IRegistry public aztecRegistryAddress;

    constructor(address _alloAddress, address _registryAddress) {
        alloAddress = _alloAddress;
        aztecRegistryAddress = IRegistry(_registryAddress);
    }

    
    function fundPool(uint256 _poolId, address tokenPortal, address _asset, uint256 _amount) public {
        // Get the l2 token address from the portal
        bytes32 l2TokenAddress = TokenPortal(tokenPortal).l2TokenAddress();

        // Perform the aztec bridge boilerplate
        DataStructures.L2ToL1Msg memory message = DataStructures.L2ToL1Msg({
          sender: DataStructures.L2Actor(l2TokenAddress, 1),
          recipient: DataStructures.L1Actor(address(this), block.chainid),
          content: Hash.sha256ToField(
            abi.encodeWithSignature(
              "fundPool(uint256,uint256,address,address)",
              _poolId,
              _amount,
              _asset,
              // _withCaller ? msg.sender : address(0)
              address(0) // Currently anyone can call it
            )
          )
        });

        bytes32 entryKey = aztecRegistryAddress.getOutbox().consume(message);

        // Withdraw the input asset from the portal
        TokenPortal(_asset).withdraw(_amount, address(this), true);

        // Allow allo to spend the input token
        // TODO: deal with raw eth
        IERC20(_asset).approve(address(alloAddress), _amount);
        IAllo(alloAddress).fundPool(_poolId, _amount);
    }
}
