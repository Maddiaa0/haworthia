import { AztecAddress, ContractBase, ContractFunctionInteraction, ContractMethod, DeployMethod, FieldLike, Wallet } from '@aztec/aztec.js';
import { AztecRPC, PublicKey } from '@aztec/types';
import { ContractAbi } from '@aztec/foundation/abi';
export declare const HawthoriaBridgeContractAbi: ContractAbi;
/**
 * Type-safe interface for contract HawthoriaBridge;
 */
export declare class HawthoriaBridgeContract extends ContractBase {
    private constructor();
    /**
     * Creates a contract instance.
     * @param address - The deployed contract's address.
     * @param wallet - The wallet to use when interacting with the contract.
     * @returns A promise that resolves to a new Contract instance.
     */
    static at(
    /** The deployed contract's address. */
    address: AztecAddress, 
    /** The wallet. */
    wallet: Wallet): Promise<HawthoriaBridgeContract>;
    /**
     * Creates a tx to deploy a new instance of this contract.
     */
    static deploy(rpc: AztecRPC): DeployMethod<HawthoriaBridgeContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified public key to derive the address.
     */
    static deployWithPublicKey(rpc: AztecRPC, publicKey: PublicKey): DeployMethod<HawthoriaBridgeContract>;
    /**
     * Returns this contract's ABI.
     */
    static get abi(): ContractAbi;
    /** Type-safe wrappers for the public methods exposed by the contract. */
    methods: {
        /** _approve_bridge_and_exit_input_asset_to_L1(token_bridge: struct, amount: field) */
        _approve_bridge_and_exit_input_asset_to_L1: ((token_bridge: {
            address: FieldLike;
        }, amount: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** fundPool(pool_id: integer, amount: integer, asset_bridge: struct, asset: field, callerOnL1: struct) */
        fundPool: ((pool_id: (bigint | number), amount: (bigint | number), asset_bridge: {
            address: FieldLike;
        }, asset: FieldLike, callerOnL1: {
            address: FieldLike;
        }) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** is_valid_public(message_hash: field) */
        is_valid_public: ((message_hash: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
    };
}
//# sourceMappingURL=HawthoriaBridge.d.ts.map