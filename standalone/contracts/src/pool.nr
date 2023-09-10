use dep::aztec::types::type_serialisation::TypeSerialisationInterface;

struct Pool {
    // The address of the strageth
    strategy: Field,
    // token
    token: Field,

    // There are then roles for access control, lets still think about that
}


// Serialisation Boilerplate TODO: can this also be injected at compile time?
global POOL_SERIALIZED_LENGTH: Field = 2;

fn deserializePool(fields: [Field; POOL_SERIALIZED_LENGTH]) -> Pool {
    Pool {
        strategy: fields[0],
        token: fields[1]
    }
}

fn serializePool(pool: Pool) -> [Field; POOL_SERIALIZED_LENGTH] {
    [pool.strategy, pool.token]
}

impl Pool {
    fn serialize(self: Self) -> [Field; POOL_SERIALIZED_LENGTH] {
        serializePool(self)
    }
}

global PoolSerializationMethods = TypeSerialisationInterface {
    deserialise: deserializePool,
    serialise: serializePool
};