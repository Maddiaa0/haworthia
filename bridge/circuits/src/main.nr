mod util;
mod external_interfaces;

contract HawthoriaBridge {
    use crate::util::compute_message_hash;

    use dep::std::hash::sha256;

    use dep::aztec::auth::IS_VALID_SELECTOR;

    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        state_vars::{map::Map, public_state::PublicState},
        types::address::{AztecAddress, EthereumAddress},
        types::type_serialization::bool_serialization::{
            BoolSerializationMethods, BOOL_SERIALIZED_LEN,
        },
        types::type_serialization::field_serialization::{
            FieldSerializationMethods, FIELD_SERIALIZED_LEN,
        },
        oracle::{
            compute_selector::compute_selector,
            context::get_portal_address,
        }
    };

    // use dep::token_bridge::TokenBridge;
    use crate::external_interfaces::{TokenBridge, Token};

    // MAYBE COULD REMOVE THESE
    // NOTE: Storage here is just to keep track of public donation approval flows
    struct Storage {
        // like with account contracts, stores the approval message on a slot and tracks if they are active
        approved_action: Map<PublicState<bool, BOOL_SERIALIZED_LEN>>,
        // tracks the nonce used to create the approval message for burning funds
        // gets incremented each time after use to prevent replay attacks
        nonce_for_burn_approval: PublicState<Field, FIELD_SERIALIZED_LEN>,
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                approved_action: Map::new(
                    context,
                    1,
                    |context, slot| {
                        PublicState::new(context, slot, BoolSerializationMethods)
                    },
                ),
                nonce_for_burn_approval: PublicState::new(context, 2, FieldSerializationMethods),
            }
        }
    }

    #[aztec(private)]
    fn constructor(){}

    #[aztec(private)]
    // Using u120s as they are the largest that is allowed
    // TODO: move caller to be the address type
    fn fundPool(pool_id: u120, amount: u120, asset_bridge: AztecAddress, asset: Field, callerOnL1: EthereumAddress) {
        
        // Compute the selector for the on chain message

        // 0x40a29edd
        // let selector = compute_selector("fundPool(uint256,uint256,uint256,address,address)");

        let asset_bridge_portal = get_portal_address(asset_bridge.address);
        assert(asset_bridge_portal != 0, "asset bridge portal is 0 (it dunny exist lad)");

        let content = _get_fund_content_hash(asset_bridge_portal, pool_id as Field, amount as Field, asset, callerOnL1.address);
        context.message_portal(content);
    }

    // This helper method approves the bridge to burn this contract's funds and exits the input asset to L1
    // Assumes contract already has funds
    // Note that private can't read public return values so created an internal public that handles everything
    // this method is used for both private and public swaps.
    #[aztec(public)]
    internal fn _approve_bridge_and_exit_input_asset_to_L1(
        token_bridge: AztecAddress, 
        amount: Field,
    ) {
        let token = TokenBridge::at(token_bridge.address).token(context);
        
        // approve bridge to burn this contract's funds (required when exiting on L1, as it burns funds on L2):
        let nonce_for_burn_approval = storage.nonce_for_burn_approval.read();
        let selector = compute_selector("burn_public((Field),Field,Field)");
        let message_hash = compute_message_hash([token_bridge.address, token, selector, context.this_address(), amount, nonce_for_burn_approval]);
        storage.approved_action.at(message_hash).write(true);

        // increment nonce_for_burn_approval so it won't be used again
        storage.nonce_for_burn_approval.write(nonce_for_burn_approval + 1);

        // Exit to Hawthoria Portal !
        TokenBridge::at(token_bridge.address).exit_to_l1_public(
            context,
            context.this_portal_address(),
            amount,
            context.this_portal_address(),
            nonce_for_burn_approval,
        );
    }

    #[contract_library_method]
    fn _get_fund_content_hash(asset_bridge_portal: Field, pool_id: Field, amount: Field, asset: Field, callerOnL1: Field) -> pub Field {
        let mut hash_bytes: [u8; 164] = [0;  164];
        let asset_bridge_portal_bytes = asset_bridge_portal.to_be_bytes(32);
        let pool_id_bytes = pool_id.to_be_bytes(32);
        let amount_bytes = amount.to_be_bytes(32);
        let asset_bytes = asset.to_be_bytes(32);
        let callerOnL1_bytes = callerOnL1.to_be_bytes(32);

        // TODO: test using compute selector here;
        //  0x40a29edd , selector for compute_selector("fundPool(u120,u120,address)")
        hash_bytes[0] = 0x40;
        hash_bytes[1] = 0xa2;
        hash_bytes[2] = 0x9e;
        hash_bytes[3] = 0xdd;

        for i in 0..32 {
            hash_bytes[i + 4] = asset_bridge_portal_bytes[i];
            hash_bytes[i + 36] = pool_id_bytes[i];
            hash_bytes[i + 68] = amount_bytes[i];
            hash_bytes[i + 100] = asset_bytes[i];
            hash_bytes[i + 132] = callerOnL1_bytes[i];
        }
        let content_sha256 = sha256(hash_bytes);

        // Convert the content_sha256 to a field element
        let mut v = 1;
        let mut high = 0 as Field;
        let mut low = 0 as Field;

        for i in 0..16 {
            high = high + (content_sha256[15 - i] as Field) * v;
            low = low + (content_sha256[16 + 15 - i] as Field) * v;
            v = v * 256;
        }

        // Abuse that a % p + b % p = (a + b) % p and that low < p
        let content = low + high * v;
        content
    }

    // Since the token bridge burns funds on behalf of this contract, this contract has to tell the token contract if the signature is valid
    // implementation is similar to how account contracts validate public approvals.
    // if valid, it returns the IS_VALID selector which is expected by token contract
    #[aztec(public)]
    fn is_valid_public(message_hash: Field) -> Field {
        let value = storage.approved_action.at(message_hash).read();
        if (value){
            IS_VALID_SELECTOR
        } else {
            0
        }
    }

}