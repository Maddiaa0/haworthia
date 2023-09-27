import { Fr } from '@aztec/foundation/fields';
import { createAztecRpcClient, AztecRPC, AccountWallet, getSandboxAccountsWallets } from '@aztec/aztec.js';
import { HawthoriaBridgeContract, HawthoriaBridgeContractAbi } from './contract/HawthoriaBridge.js';

const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080';

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

    beforeEach(async () => {
        rpc = createAztecRpcClient(SANDBOX_URL);
        [account] = await getSandboxAccountsWallets(rpc);

        await deployContract();
    });

    it("Should deploy everything", async () => {});


    afterAll(() => {})
})
