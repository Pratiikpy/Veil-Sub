#!/bin/bash
# VeilSub v20 Testnet Execution Script
# Execute transitions to populate on-chain data for judges
# Account: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk

PRIVATE_KEY="APrivateKey1zkp3LU14jqxb315ATMVLRrT8yQzikkhAiSC4Shi1dCkiKxU"
PROGRAM="veilsub_v20.aleo"
API="https://api.explorer.provable.com/v1/testnet/transaction/broadcast"

echo "=== VeilSub v20 Testnet Execution ==="
echo "Program: $PROGRAM"
echo ""

# 1. Register as creator (base price: 1000 microcredits)
echo "[1/13] register_creator(1000u64)..."
snarkos developer execute $PROGRAM register_creator \
  1000u64 \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 2. Create custom tier 1 (Supporter - 500 microcredits)
echo "[2/13] create_custom_tier(1, 500, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  1u8 500u64 1234field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 3. Create custom tier 2 (Premium - 2000 microcredits)
echo "[3/13] create_custom_tier(2, 2000, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  2u8 2000u64 5678field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 4. Create custom tier 3 (VIP - 5000 microcredits)
echo "[4/13] create_custom_tier(3, 5000, name_hash)..."
snarkos developer execute $PROGRAM create_custom_tier \
  3u8 5000u64 9012field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 5. Publish content #1 (tier 1)
echo "[5/13] publish_content(content_1, tier_1)..."
snarkos developer execute $PROGRAM publish_content \
  100field 1u8 111111field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 6. Publish content #2 (tier 2)
echo "[6/13] publish_content(content_2, tier_2)..."
snarkos developer execute $PROGRAM publish_content \
  200field 2u8 222222field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 7. Publish encrypted content #3 (tier 1)
echo "[7/13] publish_encrypted_content(content_3, tier_1, encryption)..."
snarkos developer execute $PROGRAM publish_encrypted_content \
  300field 1u8 333333field 444444field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 8. Update content #1 (change tier to 2)
echo "[8/13] update_content(content_1, new_tier_2)..."
snarkos developer execute $PROGRAM update_content \
  100field 2u8 555555field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 9. Delete content #2
echo "[9/13] delete_content(content_2, reason)..."
snarkos developer execute $PROGRAM delete_content \
  200field 666666field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 10. Commit tip
echo "[10/13] commit_tip(creator, 500, salt)..."
snarkos developer execute $PROGRAM commit_tip \
  aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk \
  500u64 777777field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

# 11. Update tier price (tier 1 -> 750)
echo "[11/13] update_tier_price(tier_1_record, 750)..."
# NOTE: This requires a SubscriptionTier record from step 2
# Must be executed with the actual record output

# 12. Deprecate tier (tier 3)
echo "[12/13] deprecate_tier(tier_3_record)..."
# NOTE: This requires a SubscriptionTier record from step 4

# 13. Publish content #4 (tier 1)
echo "[13/13] publish_content(content_4, tier_1)..."
snarkos developer execute $PROGRAM publish_content \
  400field 1u8 888888field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --wait --timeout 300

echo ""
echo "=== Execution complete ==="
echo "Check on-chain: https://testnet.aleoscan.io/program?id=$PROGRAM"
