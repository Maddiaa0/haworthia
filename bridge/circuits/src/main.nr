mod util;

contract HawthoriaBridge {
    use crate::util::compute_message_hash;

    use dep::std::hash::sha256;

    #[aztec(private)]
    fn constructor(){}

    #[aztec(private)]
    // Using u120s as they are the largest that is allowed
    // TODO: move caller to be the address type
    fn fundPool(pool_id: u120, amount: u120, callerOnL1: Field) {
        // TODO: look at the uni portal as it is the one that interacts with two bridges and how all of that works
        // TODO: how do we know what token is being used
        
        // Compute the selector for the on chain message

        // 0xa67c92d1
        // let selector = compute_selector("fundPool(u120,u120,address)");

        let content = _get_fund_content_hash(pool_id as Field, amount as Field, callerOnL1);
        context.message_portal(content);
    }

    #[contract_library_method]
    fn _get_fund_content_hash(pool_id: Field, amount: Field, callerOnL1: Field) -> pub Field {
        let mut hash_bytes: [u8; 68] = [0; 68];
        let pool_id_bytes = pool_id.to_be_bytes(32);
        let amount_bytes = amount.to_be_bytes(32);

        // TODO: test using compute selector here;
        // 0xa67c92d1 , selector for compute_selector("fundPool(u120,u120,address)")
        hash_bytes[0] = 0xa6;
        hash_bytes[1] = 0x7c;
        hash_bytes[2] = 0x92;
        hash_bytes[3] = 0xd1;

        for i in 0..32 {
            hash_bytes[i + 4] = pool_id_bytes [i];
            hash_bytes[i + 36] = amount_bytes [i];
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

}