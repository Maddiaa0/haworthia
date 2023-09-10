mod pool;

contract Hawthoria {
    // use dep::safe_math::SafeU120;

    // Aztec library methods
    use dep::std::option::Option;
    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        oracle::compute_selector::compute_selector,
        state_vars::{
            map::Map,
            public_state::PublicState,
        },
        types::type_serialisation::{
            field_serialisation::{FieldSerialisationMethods, FIELD_SERIALISED_LEN},
            TypeSerialisationInterface,
        },
    };

    // Local imports
    use crate::pool::{Pool, PoolSerializationMethods,  POOL_SERIALIZED_LENGTH};

    struct Storage {
        pool_index: PublicState<Field, 1>,
        treasury: PublicState<Field, 1>,
        
        // The registry contract
        registry: PublicState<Field, 1>,

        pools: Map<PublicState<Pool, POOL_SERIALIZED_LENGTH>>,
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                pool_index: PublicState::new(
                    context,
                    1,
                    FieldSerialisationMethods,
                ),
                treasury: PublicState::new(
                    context,
                    2,
                    FieldSerialisationMethods,
                ),
                registry: PublicState::new(
                    context,
                    3,
                    FieldSerialisationMethods,
                ),
                pools: Map::new(
                    context,
                    4,
                    |context, slot| {
                        PublicState::new(
                            context,
                            slot,
                            PoolSerializationMethods
                        )
                    },
                 )
            }
        }
    }


    #[aztec(private)]
    fn constructor() { }

    

    // Create Pool
    // - a pool can creted by proving that a contract that has been deployed does exist 
    // - We have to check that the contract is in the contract tree, 
    //   and that it has the correct code hash

    // Once the code hash is proven to exist, we need to be able to prove tht 
    // there is a getter for an immutable note that has the manager set to this contract address
    

    // On a second look it seems that the pool isnt even a new contract, 
    // but just a struct in software, nice
    
    // This is still relevant when making a strategy that is clonable
    

    // Not sure if all of this profile id stuff will be relevant,
    // Think about how to structure the private and public parts of the protocol 
    // after this little initial mvp
    // Need to think how this initialise another contract flow will go
    #[aztec(private)]
    fn createPool(
        strategy: Field,
        token: Field,
        poolId: Field, // TODO: see below method on alternative solutions
    ) {

        let pool: Pool = Pool {
            strategy,
            token
        };

        // TODO: initialize the strategy
        // TODO: check the strat has this hawthoria set

        // Not sure how the pool can be craeted privately


        


    }

    // Creating a pool index
    // There is no way to increment the pool index globally, 
    // We could claim it globally then let somebody claim it with a 
    // secret hash
    
    // Or we could just let people pick a nonce, then emit it


    // Viewing key problem for private pools
    // - we want the pool to be private, but when people deposit we want them to be able to 
    // - give us notes to use.
    // -> Issue: they cannot send us notes without knowing our decryption keys
    // -> Solution: we need to be able to provide a random encryption key that is NOT related to our address 

    // -> Then we can claim it all later, as we know the state, we can store an extra key in the rpc server 
    //      for us to look at later 


}