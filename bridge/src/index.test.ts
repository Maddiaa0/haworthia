import { Fr } from '@aztec/foundation/fields';
import { createAztecRpcClient, AztecRPC, AccountWallet, getSandboxAccountsWallets, TxStatus } from '@aztec/aztec.js';
import { HawthoriaBridgeContract, HawthoriaBridgeContractAbi } from './contract/HawthoriaBridge.js';
import { getContract } from 'viem';
import { ethers } from 'ethers';
import { AlloAbi, ERC20Abi, ERC20Bytecode, TokenPortalAbi, TokenPortalBytecode } from './contract/solidity.js';
import { TokenContract } from './contract/token.js';

const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080';
const ETH_URL = process.env['ETH_URL'] || 'http://localhost:8545';
const ANVIL_WALLET = "2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";

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

    let provider: ethers.JsonRpcProvider;
    let wallet: ethers.Wallet;

    let portal: ethers.Contract;
    let hawthoria: ethers.Contract;

    let allo: ethers.Contract;
    let ethToken: ethers.Contract;
    let aztecToken: TokenContract;

    beforeEach(async () => {
        rpc = createAztecRpcClient(SANDBOX_URL);
        [account] = await getSandboxAccountsWallets(rpc);

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

        allo = new ethers.Contract("0x79536CC062EE8FAFA7A19a5fa07783BD7F792206", AlloAbi, wallet);


        // Deploy the token contracts
        // l2
        const tokenDeployReceipt = await TokenContract.deploy(account).send().wait();
        if (tokenDeployReceipt .status !== TxStatus.MINED) throw new Error(`Deploy token tx status is ${tokenDeployReceipt.status}`);
        aztecToken = await TokenContract.at(tokenDeployReceipt.contractAddress!, account);
       
        // l1
        let erc20Deployer = new ethers.ContractFactory(ERC20Abi, ERC20Bytecode, wallet);
        const erc20Deployed = await (await erc20Deployer.deploy()).waitForDeployment();
        const erc20Address = await (await erc20Deployed).getAddress();
        ethToken = new ethers.Contract(erc20Address, ERC20Abi, wallet);

        // Create a pool on allo


        await deployContract();
    }, 40_000);

    it("E2E", async () => {

        // Deploy an allo pool
        {
            allo.


        }        


    });


    afterAll(() => {})
})
