program hash_helper.aleo {

    @noupgrade
    async constructor() {}

    transition get_hash(addr: address) -> field {
        return Poseidon2::hash_to_field(addr);
    }

    transition hash_field(value: field) -> field {
        return Poseidon2::hash_to_field(value);
    }
}
