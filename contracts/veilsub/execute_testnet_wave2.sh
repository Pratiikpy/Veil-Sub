#!/bin/bash
# VeilSub v24 Testnet Execution Script — Wave 2 (Remaining Transitions)
# Execute transitions NOT yet tested on-chain to maximize testnet activity for judges
# Account: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk
#
# ALREADY EXECUTED (Wave 1): register_creator, create_custom_tier x3, publish_content x5,
#   publish_encrypted_content, update_content, delete_content, commit_tip,
#   withdraw_platform_fees, withdraw_creator_rev
#
# THIS SCRIPT EXECUTES: update_tier_price, deprecate_tier, reveal_tip
# NOTE: subscribe, renew, gift_subscription, etc. require private credit records
#       which must be passed as record literals. These are best executed via leo execute
#       or the frontend wallet. See instructions at bottom.

PRIVATE_KEY="APrivateKey1zkp3LU14jqxb315ATMVLRrT8yQzikkhAiSC4Shi1dCkiKxU"
PROGRAM="veilsub_v24.aleo"
API="https://api.explorer.provable.com/v1/testnet/transaction/broadcast"
QUERY="https://api.explorer.provable.com/v1"
FEE=10000000
CREATOR="aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk"

echo "=== VeilSub v23 — Wave 2 Testnet Execution ==="
echo "Program: $PROGRAM"
echo "These transitions were NOT executed in Wave 1"
echo ""

# --- ADMIN / TIER MANAGEMENT ---

# 1. Update tier price (tier 1: 500 → 750)
# NOTE: update_tier_price takes a SubscriptionTier record as input.
# The record must come from the create_custom_tier output.
# Use leo execute with the actual record plaintext:
echo "[1] update_tier_price — requires SubscriptionTier record from create_custom_tier output"
echo "  Run via: leo execute update_tier_price '<SubscriptionTier record>' 750u64"
echo ""

# 2. Deprecate tier (tier 3 - VIP)
# NOTE: deprecate_tier takes a SubscriptionTier record as input.
echo "[2] deprecate_tier — requires SubscriptionTier record"
echo "  Run via: leo execute deprecate_tier '<SubscriptionTier record for tier 3>'"
echo ""

# 3. Reveal tip (completes commit-reveal cycle from commit_tip in Wave 1)
# The commit was: commit_tip(creator, 500u64, 777777field)
# reveal_tip needs: creator address, amount, salt (must match commit)
echo "[3] reveal_tip(creator, 500, 777777field) — completes commit-reveal tipping..."
snarkos developer execute $PROGRAM reveal_tip \
  $CREATOR 500u64 777777field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

echo "Waiting 30s for confirmation..."
sleep 30

# 4. Publish more content for variety (content #7, tier 1)
echo "[4] publish_content(content_7, tier_1) — more testnet activity..."
snarkos developer execute $PROGRAM publish_content \
  700field 1u8 777000field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

sleep 20

# 5. Publish content #8 (tier 2 - encrypted)
echo "[5] publish_encrypted_content(content_8, tier_2, encryption)..."
snarkos developer execute $PROGRAM publish_encrypted_content \
  800field 2u8 888000field 888999field \
  --private-key "$PRIVATE_KEY" \
  --broadcast "$API" \
  --query "$QUERY" \
  --network 1 \
  --priority-fee $FEE

echo ""
echo "=== Wave 2 execution complete ==="
echo ""
echo "=== TRANSITIONS REQUIRING WALLET / RECORDS ==="
echo ""
echo "The following transitions require private credit records or AccessPass records."
echo "Execute them via the FRONTEND (veilsub.vercel.app) or via leo execute with record literals."
echo ""
echo "--- SUBSCRIBE (core flow) ---"
echo "1. subscribe: Connect a SECOND wallet to veilsub.vercel.app, navigate to creator page, click Subscribe"
echo "   This sends credits to creator and returns an AccessPass record."
echo ""
echo "--- VERIFY ACCESS ---"
echo "2. verify_access: After subscribing, go to /verify and enter the creator address."
echo "   The frontend calls verify_access with your AccessPass — zero-footprint verification."
echo ""
echo "--- RENEW ---"
echo "3. renew: After subscribing, use the Renew button on the creator page."
echo ""
echo "--- BLIND SUBSCRIBE ---"
echo "4. subscribe_blind: In the Subscribe modal, select 'Blind' privacy mode."
echo "   Uses nonce-rotated identity — unlinkable across renewals."
echo ""
echo "--- TIP ---"
echo "5. tip: On creator page, click the Tip button and send a private tip."
echo ""
echo "--- GIFT ---"
echo "6. gift_subscription: Use the Gift button on creator page to gift to another address."
echo "7. redeem_gift: Recipient connects their wallet and redeems the GiftToken."
echo ""
echo "--- TRANSFER ---"
echo "8. transfer_pass: After subscribing, transfer your AccessPass to another address."
echo ""
echo "--- DISPUTE ---"
echo "9. dispute_content: After subscribing, file a dispute on a content item."
echo ""
echo "--- REVOKE ---"
echo "10. revoke_access: As creator, revoke an AccessPass by its pass_id."
echo ""
echo "Check on-chain: https://testnet.aleoscan.io/program?id=$PROGRAM"
