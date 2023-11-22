import {
    AccountWallet,
    AztecAddress,
    DebugLogger,
    EthAddress,
    Fr,
    computeAuthWitMessageHash,
    deployL1Contract,
    getSandboxAccountsWallets,
    PXE,
    createPXEClient,
    waitForSandbox,
    createDebugLogger,
  } from '@aztec/aztec.js';
  import {
    HawthoriaPortalAbi,
    HawthoriaPortalBytecode,
    GitcoinDeployHelperAbi,
    GitcoinDeployHelperBytecode,
  } from './contract/solidity.js';
  import { HawthoriaContract } from "./contract/Hawthoria.js";
  
  import { createPublicClient, createWalletClient, getContract, http } from 'viem';
  
  import { delay } from './utils.js';
  import { CrossChainTestHarness } from './cross_chain_test_harness.js';
  import { mnemonicToAccount } from 'viem/accounts';
  import { foundry } from 'viem/chains';

  const AnvilTestMnemonic = "test test test test test test test test test test test junk";
  const hdAccount = mnemonicToAccount(AnvilTestMnemonic);

  const PXE_URL = process.env['PXE_URL '] || 'http://localhost:8080';
  const ETH_URL = process.env['ETH_URL'] || 'http://localhost:8545';
  const ANVIL_WALLET = "2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
  const ANVIL_ADDRESS = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";

  
  describe('e2e_gitcoin', () => {
    let logger: DebugLogger;
    let teardown: () => Promise<void>;
    let pxe: PXE;
    let wallets: AccountWallet[];
  
    let user1Wallet: AccountWallet;
    let ownerAddress: AztecAddress;
  
    let tokenHarness: CrossChainTestHarness;
  
    let gitcoinPortal: any;
    let gitcoinL2Contract: HawthoriaContract;
  
    const DONATION_RECIPIENT = EthAddress.fromString('0xA15BB66138824a1c7167f5E85b957d04Dd34E468');
    let DONATEE: EthAddress;
    let underlyingERC20Address: EthAddress;
    let STRATEGY: EthAddress;
    let ALLO: EthAddress;
    let poolId: bigint;

    let registryAddress: EthAddress;
  
    beforeEach(async () => {
        logger = createDebugLogger('e2e_gitcoin');

      // Connect to a running sandbox
      // Make sure you have anvil & the aztec sandbox running
      // ( you can run the sandbox with yarn start:sandbox in another terminal )
      pxe = createPXEClient(PXE_URL);
      await waitForSandbox();
      wallets = await getSandboxAccountsWallets(pxe);

      // Get the registry address
      const nodeInfo = await pxe.getNodeInfo();
      registryAddress = nodeInfo.l1ContractAddresses.registryAddress;

      const viemWalletClient = createWalletClient({
        account: hdAccount,
        chain: foundry,
        transport: http(ETH_URL)
      });
      const viemPublicClient = createPublicClient({
        chain: foundry,
        transport: http(ETH_URL)
      });
  
      {
        logger('Deploying Gitcoin contracts and setup');
        // Gitcoin deploy helper.
        const gitcoinHelper = await deployL1Contract(
            viemWalletClient,
            viemPublicClient,
          GitcoinDeployHelperAbi,
          GitcoinDeployHelperBytecode,
          [DONATION_RECIPIENT.toString()],
        );
        const helper = getContract({
          address: gitcoinHelper.toString(),
          abi: GitcoinDeployHelperAbi,
            walletClient: viemWalletClient ,
            publicClient: viemPublicClient 
        });
  
        DONATEE = EthAddress.fromString(helper.address);
  
        const info = await helper.read.info() as any; // string, string, string, uint256
        underlyingERC20Address = EthAddress.fromString(info[0]);
        STRATEGY = EthAddress.fromString(info[1]);
        ALLO = EthAddress.fromString(info[2]);
        poolId = info[3];
      }
  
      tokenHarness = await CrossChainTestHarness.new(
        pxe,
        viemPublicClient,
        viemWalletClient,
        wallets[0],
        logger,
        underlyingERC20Address,
      );
  
      ownerAddress = tokenHarness.ownerAddress;
      user1Wallet = wallets[0];
      logger('Successfully deployed token contracts');
  
      // Deploy the github donation portal and stuff.
      {
        const gitcoinPortalAddress = await deployL1Contract(
          viemWalletClient,
          viemPublicClient,
          HawthoriaPortalAbi,
          HawthoriaPortalBytecode,
        );
        gitcoinPortal = getContract({
          address: gitcoinPortalAddress.toString(),
          abi: HawthoriaPortalAbi,
          walletClient: viemWalletClient,
          publicClient: viemPublicClient,
        });
  
        logger(`Deployed Gitcoin Portal at ${gitcoinPortalAddress}`);
  
        gitcoinL2Contract = await HawthoriaContract.deploy(user1Wallet)
          .send({ portalContract: gitcoinPortalAddress })
          .deployed();
        const args = [
          tokenHarness.tokenPortal.address.toString(),
          registryAddress.toString(),
          ALLO.toString(),
          gitcoinL2Contract.address.toString(),
        ];
        await gitcoinPortal.write.initialize(args, {} as any);
      }
    }, 100_000);
  
    // afterEach(async () => {
    //   await teardown();
    // });
  
    it('Donate funds on Allo from inside Aztec', async () => {
      // Get funds into rollup
      {
        // Mint funds and deposit into the rollup
        const bridgeAmount = 10n * 10n ** 18n;
        await tokenHarness.mintTokensOnL1(bridgeAmount);
  
        const [secretForL2MessageConsumption, secretHashForL2MessageConsumption] =
          await tokenHarness.generateClaimSecret();
        const [secretForRedeemingMintedNotes, secretHashForRedeemingMintedNotes] =
          await tokenHarness.generateClaimSecret();
  
        const messageKey = await tokenHarness.sendTokensToPortalPrivate(
          secretHashForRedeemingMintedNotes,
          bridgeAmount,
          secretHashForL2MessageConsumption,
        );
  
        await delay(5000); /// waiting 5 seconds.
  
        // Perform an unrelated transaction on L2 to progress the rollup. Here we mint public tokens.
        const unrelatedMintAmount = 99n;
        await tokenHarness.mintTokensPublicOnL2(unrelatedMintAmount);
        await tokenHarness.expectPublicBalanceOnL2(ownerAddress, unrelatedMintAmount);
  
        // Consume L1-> L2 message and mint private tokens on L2
        await tokenHarness.consumeMessageOnAztecAndMintSecretly(
          secretHashForRedeemingMintedNotes,
          bridgeAmount,
          messageKey,
          secretForL2MessageConsumption,
        );
  
        await tokenHarness.redeemShieldPrivatelyOnL2(bridgeAmount, secretForRedeemingMintedNotes);
      }
  
      // We need to setup an approval to burn the assets to exit.
      const nonce = Fr.random();
      const amount = 10n ** 18n;
      const burnMessageHash = await computeAuthWitMessageHash(
        gitcoinL2Contract.address,
        tokenHarness.l2Token.methods.unshield(ownerAddress, gitcoinL2Contract.address, amount, nonce).request(),
      );
      await user1Wallet.createAuthWitness(Fr.fromBuffer(burnMessageHash));
  
      // Then donate
      await gitcoinL2Contract.methods
        .donate(poolId, DONATEE, amount, tokenHarness.l2Token.address, tokenHarness.l2Bridge.address, nonce)
        .send()
        .wait();
  
      const claimBefore = await gitcoinPortal.read.getClaim([
        STRATEGY.toString(),
        underlyingERC20Address.toString(),
        DONATEE.toString(),
      ]);
  
      logger(`Pending claim ${claimBefore}`);
  
      await gitcoinPortal.write.donate([poolId, DONATEE.toString(), amount, false], {} as any);
  
      const claimAfter = await gitcoinPortal.read.getClaim([
        STRATEGY.toString(),
        underlyingERC20Address.toString(),
        DONATEE.toString(),
      ]);
  
      logger(`Pending claim ${claimAfter}`);
      expect(claimAfter).toEqual(claimBefore + amount);
    }, 60_000);
  });