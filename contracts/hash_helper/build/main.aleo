program hash_helper.aleo;

function get_hash:
    input r0 as address.private;
    hash.psd2 r0 into r1 as field;
    output r1 as field.private;

function hash_field:
    input r0 as field.private;
    hash.psd2 r0 into r1 as field;
    output r1 as field.private;
