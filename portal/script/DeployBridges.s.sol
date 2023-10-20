// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";


import {TokenPortal} from "src/bridge/TokenPortal.sol";
import {HawthoriaPortal } from "src/HawPortal.sol";
// import {ERC20} from "@oz/tokens/ERC20/ERC20.sol";


contract DeployBridges is Script {
    
    // Allo is already deployed on testnets which HELPS ME GREATLY
    address constant ALLO = 0x79536CC062EE8FAFA7A19a5fa07783BD7F792206;

    address constant AZTEC_REGISTRY = 0x79536CC062EE8FAFA7A19a5fa07783BD7F792206;
    bytes32 constant L2_TOKEN_ADDRESS = hex"";


    function setUp() public {}

    function deploy() public returns (TokenPortal tokenPortal, HawthoriaPortal hawthoriaPortal) {
        vm.broadcast();

        // Token to use
        // address erc20 = new ERC20("our_token", "token");

        // Deploy the aztec token bridges
        // toknPortal = new TokenPortal();



    }

    // function initialise() {
    //     // Initialise the token contract once we have the chain deployed
    //     tokenPortal.initialize(AZTEC_REGISTRY, erc20, L2_TOKEN_ADDRESS);

    // }
}
