import { Fr, GrumpkinScalar } from '@aztec/foundation/fields';
import { createAztecRpcClient, AztecRPC, AccountWallet, TxStatus, getSchnorrAccount, getSandboxAccountsWallets, CheatCodes } from '@aztec/aztec.js';
import { HawthoriaBridgeContract, HawthoriaBridgeContractAbi } from './contract/HawthoriaBridge.js';
import { getContract } from 'viem';
import { ethers } from 'ethers';
import { AlloAbi, ERC20Abi, ERC20Bytecode, QVStrategyAbi, QVStrategyBytecode, RegistryAbi, TokenPortalAbi, TokenPortalBytecode } from './contract/solidity.js';
import { TokenContract } from './contract/token.js';
import { AbiCoder } from 'ethers';
import { TokenBridgeContract } from './contract/token_bridge.js';
import { AztecRPCServer } from '@aztec/aztec-rpc';


const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080';
const ETH_URL = process.env['ETH_URL'] || 'http://localhost:8545';
const ANVIL_WALLET = "2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
const ANVIL_ADDRESS = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";

const ALLO = "0x79536CC062EE8FAFA7A19a5fa07783BD7F792206";
const ALLO_REGISTRY = "0xAEc621EC8D9dE4B524f4864791171045d6BBBe27";

const deployContract = async () => {
    const rpc = await createAztecRpcClient(SANDBOX_URL);
    const accounts = await rpc.getRegisteredAccounts();
    await console.log(accounts);

    const deployerWallet = accounts[0];
    const salt = Fr.random();

    const tx = HawthoriaBridgeContract.deploy(rpc).send({ contractAddressSalt: salt });
    console.log(`Tx sent with hash ${await tx.getTxHash()}`);

    await tx.isMined({ interval: 0.1 });
    const receiptAfterMined = await tx.getReceipt();
    console.log(`Status: ${receiptAfterMined.status}`);
    console.log(`Contract address: ${receiptAfterMined.contractAddress}`);
};



describe("Hawthoria Bridge", () => {

    let rpc: AztecRPC;
    let account: AccountWallet;
    let kill: () => Promise<void>;

    let provider: ethers.JsonRpcProvider;
    let wallet: ethers.Wallet;

    let portal: ethers.Contract;
    let hawthoria: ethers.Contract;

    let allo: ethers.Contract;
    let registry: ethers.Contract;
    let ethToken: ethers.Contract;

    let aztecToken: TokenContract;
    let aztecTokenBridge: TokenBridgeContract;
    let cc: CheatCodes;


    beforeEach(async () => {
        rpc = createAztecRpcClient(SANDBOX_URL);
        [account] = await getSandboxAccountsWallets(rpc);
        cc = await CheatCodes.create(ETH_URL, rpc);

        // const { node, rpcServer, l1Contracts, stop }  = await createSandbox();
        // rpc= rpcServer;
        // kill = stop;
        // ({rpcServer: rpc, stop}) = await createSandbox();
        let key = GrumpkinScalar.random();
        account = await getSchnorrAccount(rpc, key, key).waitDeploy();

        provider = new ethers.JsonRpcProvider(ETH_URL);
        wallet = new ethers.Wallet(ANVIL_WALLET, provider);

        let portalDeployer = new ethers.ContractFactory(TokenPortalAbi, TokenPortalBytecode, wallet);
        let hawthoriaDeployer = new ethers.ContractFactory(TokenPortalAbi, TokenPortalBytecode, wallet);

        const portalDeployed = await (await portalDeployer.deploy()).waitForDeployment();
        const hawDeployed = await (await hawthoriaDeployer.deploy()).waitForDeployment();

        const portalAddress = await (await portalDeployed).getAddress();
        const hawthoriaAddress = await (await hawDeployed).getAddress();

        portal = new ethers.Contract(portalAddress, TokenPortalAbi, wallet);
        hawthoria = new ethers.Contract(hawthoriaAddress, TokenPortalAbi, wallet);

        allo = new ethers.Contract(ALLO, AlloAbi, wallet);
        registry = new ethers.Contract(ALLO_REGISTRY, RegistryAbi, wallet);
        


        // Deploy the token contracts
        // l2
        console.log("Deploying token on l2");
        const tokenDeployReceipt = await TokenContract.deploy(account).send().wait();
        if (tokenDeployReceipt .status !== TxStatus.MINED) throw new Error(`Deploy token tx status is ${tokenDeployReceipt.status}`);
        aztecToken = await TokenContract.at(tokenDeployReceipt.contractAddress!, account);
        console.log("Deployed token on l2 @ ", aztecToken.address);

        // Deploy bridge on l2
        console.log("Deploying bridge on l2");
        const bridgeDeployReceipt = await TokenBridgeContract.deploy(account).send().wait();
        if (bridgeDeployReceipt  .status !== TxStatus.MINED) throw new Error(`Deploy token tx status is ${bridgeDeployReceipt .status}`);
        aztecTokenBridge = await TokenBridgeContract.at(bridgeDeployReceipt.contractAddress!, account);
        console.log("Deployed bridge on l2 @ ", aztecTokenBridge.address);

       
        // l1
        console.log("Deploying ERC20");
        let erc20Deployer = new ethers.ContractFactory(ERC20Abi, ERC20Bytecode, wallet);
        const erc20Deployed = await (await erc20Deployer.deploy("MOCK","MOCK")).waitForDeployment();
        const erc20Address = await erc20Deployed.getAddress();
        ethToken = new ethers.Contract(erc20Address, ERC20Abi, wallet);
        console.log("Deployed ERC20 @ ", erc20Address);

        // Create a profile on allo
        const profileNonce = Fr.random().toBigInt(); // todo; make random
        const name = "maddiaa";
        const metadata = {
            protocol: 1,
            pointer: "abcd" // IPFS hash
        };
        const address = ANVIL_ADDRESS;
        const members = [address];
        console.log("Registring on allo");

        const [profileId] = await registry.createProfile.staticCallResult(profileNonce, name, metadata, address, members);
        console.log(profileId);
        const profileTx = await (await registry.createProfile.send(profileNonce, name, metadata, address, members)).wait();

        console.log("Confirming owner of profile");
        const isOwner = await registry.isOwnerOfProfile(profileId, address);
        console.log(isOwner);

        // Get logs from a tx
        console.log("Registered on allo w/ profileId: ", profileTx);

        // Create a pool using te profile ID
        console.log("Deploying allo strategy");
        let stratDeployer = new ethers.ContractFactory(QVStrategyAbi, QVStrategyBytecode, wallet);
        const stratName = Math.random().toString(36).substring(7);
        const stratDeployed = await (await stratDeployer.deploy(ALLO, stratName)).waitForDeployment();
        const stratAddress = await (await stratDeployed).getAddress();
        let strat = new ethers.Contract(stratAddress, QVStrategyAbi, wallet);
        console.log("deployed allo strategy @ ", stratAddress);

        // Create a pool using the profile ID and strategy

        // make a clonable strat
        console.log("Adding strat to clonable strats");
        const [alloAdmin] = await allo.owner.staticCallResult();
        console.log("Allo admin: ", alloAdmin);
        cc.eth.startImpersonating(alloAdmin);
        const addTx = await allo.addToCloneableStrategies(stratAddress);
        await addTx.wait();
        cc.eth.stopImpersonating(alloAdmin);
        const isClonable = await allo.isCloneableStrategy(stratAddress, {from: alloAdmin});
        console.log("Is clonable: ", isClonable);

        // data to pass to allo initialize
        function getTimestamp(secondsOffset: number): number {
            const date = new Date();
            date.setSeconds(date.getSeconds() + secondsOffset);
            return Math.floor(date.getTime() / 1000);
        }
        
        const registrationStartTime: number = getTimestamp(0); // now
        const registrationEndTime: number = getTimestamp(7 * 24 * 60 * 60); // one week from now
        const allocationStartTime: number = getTimestamp(14 * 24 * 60 * 60); // two weeks from now
        const allocationEndTime: number = getTimestamp(30 * 24 * 60 * 60); // one month from now
        const initializeParams = {
            registryGating: false,
            metadataRequired: true,
            reviewThreshold: 2,
            registrationStartTime,
            registrationEndTime,
            allocationStartTime,
            allocationEndTime, 
        };
        const abiTypes = [
            "bool",    // registryGating
            "bool",    // metadataRequired
            "uint256", // reviewThreshold
            "uint64",  // registrationStartTime
            "uint64",  // registrationEndTime
            "uint64",  // allocationStartTime
            "uint64"   // allocationEndTime
        ];

        // Abi Encode the initialize params to send with pool creation tx
        // Create an instance of AbiCoder
        const abiCoder = new ethers.AbiCoder();

        // Use the encode method to ABI-encode your struct
        const encodedData = abiCoder.encode(abiTypes, [...Object.values(initializeParams)]);
        console.log(encodedData);

        // Create pool
        const fundAmount = 0;
        const poolId = await allo.createPool.staticCallResult(
            profileId,      // bytes32
            stratAddress,   // address,
            encodedData,    // strategy init data
            erc20Address,   // token address across the aztec bridge
            fundAmount,     // deposit amount
            metadata,       // pool metadata
            [ANVIL_ADDRESS] // list of managers
        );
        const poolDeploymentTx = await allo.createPool(
            profileId,      // bytes32
            stratAddress,   // address,
            encodedData,    // strategy init data
            erc20Address,   // token address across the aztec bridge
            fundAmount,     // deposit amount
            metadata,       // pool metadata
            [ANVIL_ADDRESS] // list of managers
        );
        await poolDeploymentTx.wait();

        console.log("poolid: ", poolId);


        // Try and fund the same 

            


    }, 60_000);

    it("E2E", async () => {
        // Deploy an allo pool
        {
            // allo.


        }        


    });


    // afterAll(() => kill)
    afterAll(() => {})
})
