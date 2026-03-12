#!/bin/bash
# VeilSub v27 Testnet Execution Script
# Execute transitions to populate on-chain data for judges
# Account: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk

PRIVATE_KEY="${PRIVATE_KEY:?Set PRIVATE_KEY env var before running}"
PROGRAM="veilsub_v27.aleo"
API="https://api.explorer.provable.com/v1/testnet/transaction/broadcast"
QUERY="https://api.explorer.provable.com/v1"
FEE=10000000

echo "=== VeilSub v26 Testnet Execution ==="
echo "Program: $PROGRAM"
echo "Privacy: ZERO addresses in finalize"
echo ""

# 1. Register as creator (base price: 1000 microcredits)
echo "[1/15] register_creator(1000u64)..."
snarkos developer execute $PROGRAM register_creator \
  1000u64 \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

echo "Waiting 30s for confirmation..."
sleep 30

# 2. Create custom tier 1 (Supporter - 500 microcredits)
echo "[2/15] create_custom_tier(1, 500, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  1u8 500u64 1234field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 3. Create custom tier 2 (Premium - 2000 microcredits)
echo "[3/15] create_custom_tier(2, 2000, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  2u8 2000u64 5678field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 4. Create custom tier 3 (VIP - 5000 microcredits)
echo "[4/15] create_custom_tier(3, 5000, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  3u8 5000u64 9012field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 5. Publish content #1 (tier 1)
echo "[5/15] publish_content(content_1, tier_1)..."
snarkos developer execute $PROGRAM publish_content \
  100field 1u8 111111field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 6. Publish content #2 (tier 2)
echo "[6/15] publish_content(content_2, tier_2)..."
snarkos developer execute $PROGRAM publish_content \
  200field 2u8 222222field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 7. Publish encrypted content #3 (tier 1)
echo "[7/15] publish_encrypted_content(content_3, tier_1, encryption)..."
snarkos developer execute $PROGRAM publish_encrypted_content \
  300field 1u8 333333field 444444field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 8. Update content #1 (change tier to 2)
echo "[8/15] update_content(content_1, new_tier_2)..."
snarkos developer execute $PROGRAM update_content \
  100field 2u8 555555field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 9. Delete content #2
echo "[9/15] delete_content(content_2, reason)..."
snarkos developer execute $PROGRAM delete_content \
  200field 666666field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 10. Commit tip (phase 1 of commit-reveal tipping)
echo "[10/15] commit_tip(creator, 500, salt)..."
snarkos developer execute $PROGRAM commit_tip \
  aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk \
  500u64 777777field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 11. Publish content #4 (tier 1)
echo "[11/15] publish_content(content_4, tier_1)..."
snarkos developer execute $PROGRAM publish_content \
  400field 1u8 888888field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 12. Publish content #5 (tier 3 - VIP)
echo "[12/15] publish_content(content_5, tier_3)..."
snarkos developer execute $PROGRAM publish_content \
  500field 3u8 999999field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 13. Withdraw platform fees (demonstrates business model)
echo "[13/15] withdraw_platform_fees(100)..."
snarkos developer execute $PROGRAM withdraw_platform_fees \
  100u64 \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 14. Withdraw creator revenue
echo "[14/15] withdraw_creator_rev(50)..."
snarkos developer execute $PROGRAM withdraw_creator_rev \
  50u64 \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 15. Publish content #6 (tier 2)
echo "[15/17] publish_content(content_6, tier_2)..."
snarkos developer execute $PROGRAM publish_content \
  600field 2u8 101010field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 16. Prove subscriber threshold (v25 — privacy-preserving reputation proof)
echo "[16/17] prove_subscriber_threshold(threshold=1)..."
snarkos developer execute $PROGRAM prove_subscriber_threshold \
  1u64 \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 17. Subscribe trial (v26 — ephemeral trial pass at 20% of tier price)
# Note: requires a second account to subscribe to the creator registered above
# echo "[17/17] subscribe_trial(creator, tier_1)..."
# snarkos developer execute $PROGRAM subscribe_trial \
#   aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk \
#   1u8 12345field 999999u32 \
#   --private-key "$SUBSCRIBER_PRIVATE_KEY" \
#   --broadcast "$API" \
#   --query "$QUERY" \
#   --network 1 \
#   --priority-fee $FEE

echo ""
echo "=== Execution complete ==="
echo "Check on-chain: https://testnet.aleoscan.io/program?id=$PROGRAM"
