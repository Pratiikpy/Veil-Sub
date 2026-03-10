# VeilSub Deployment & Submission Readiness Report
**Updated:** March 10, 2026

---

## EXECUTIVE SUMMARY

VeilSub is a privacy-first creator subscription platform on Aleo. The deployed contract is `veilsub_v27.aleo` with 27 transitions, 25 mappings, 6 record types, and 5 structs. The contract compiles clean and is live on testnet.

### Status Overview
- **Deployed on Testnet**: `veilsub_v27.aleo` -- 27 transitions, 25 mappings, 6 records, 5 structs, 866 statements
- **Deploy Transaction**: at1akvalucqxep93ss8q9k9vpq36h7kferevyq3feu7ta06k9kx5uys0dnw8t
- **Deploy Cost**: 41.26 ALEO (storage: 36.89, synthesis: 3.36, namespace: 1.0, constructor: 0.002)
- **Testnet Executions**: 15+ transitions executed across v24-v27
- **Frontend**: https://veilsub.vercel.app -- 10 routes, zero TypeScript errors, 62 components, 16 hooks
- **Tests**: 281 passing (vitest)
- **Version Iterations**: v4 through v27 (23 versions across 3 waves)

---

## 1. CONTRACT STATUS

### Deployed: veilsub_v27.aleo
- **Explorer**: https://testnet.aleoscan.io/program?id=veilsub_v27.aleo
- **Account**: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk
- **Statements**: 866
- **Error Codes**: 119 (ERR_001 through ERR_119)
- **Records**: AccessPass, CreatorReceipt, AuditToken, SubscriptionTier, ContentDeletion, GiftToken
- **Structs**: 5 (TierKey, BlindKey, TipCommitData, DisputeKey, TrialKey)

### Transitions (27)
- **Creator management**: register_creator, create_custom_tier, update_tier_price, deprecate_tier
- **Subscriptions**: subscribe, renew, subscribe_blind, renew_blind, subscribe_trial
- **Content**: publish_content, publish_encrypted_content, update_content, delete_content
- **Verification**: verify_access, verify_tier_access, create_audit_token
- **Financial**: tip, commit_tip, reveal_tip, withdraw_platform_fees, withdraw_creator_rev
- **Social**: gift_subscription, redeem_gift, transfer_pass, dispute_content
- **Privacy**: prove_subscriber_threshold

### What Changed Since v24
- **v25**: Added `prove_subscriber_threshold` (privacy-preserving reputation proof), `total_creators` and `total_content` platform-wide singleton mappings, removed unused RefundEscrow/ReferralReward records, added MAX_CONTENT check in publish_encrypted, expiry check in dispute_content
- **v26**: Added `subscribe_trial` (ephemeral trial passes with ~12hr/1000 block duration at 20% of tier price), error codes ERR_111 through ERR_117
- **v27**: Scoped audit tokens (`scope_mask` field on AuditToken), trial rate-limiting (`trial_used` mapping + TrialKey struct), `redeem_gift` now writes `pass_creator` (gift revocation fix), error codes ERR_118-119

### Key Privacy Properties (verified)
- Zero raw addresses in any finalize block -- all field-keyed via Poseidon2
- self.caller used only in transition layer, never in finalize
- BHP256 for privacy-critical commitments, Poseidon2 for ZK-efficient mapping keys
- 119 error codes (ERR_001 through ERR_119) with sequential numbering

---

## 2. FRONTEND STATUS

- **Framework**: Next.js 16 + React 19 + TypeScript + Tailwind 4
- **Build**: Zero TypeScript errors, zero warnings
- **Components**: 62
- **Hooks**: 16 (useVeilSub, useContractExecute, useSubscription, useCreatorActions, useContentActions, useTipping, useWalletRecords, useCreatorStats, useTransactionFlow, useContentFeed, useProtocolStats, useFocusTrap, and others)
- **Tests**: 281 passing across 10 test suites (utils, errorMessages, config, configAdvanced, encryption, aleoUtils, types, utilsEdgeCases, errorMessagesAdvanced, contractHelpers)
- **Wallets**: Shield, Leo (patched), Fox, Puzzle, Soter
- **Features exposed**: register, subscribe (standard + blind + trial), renew (standard + blind), gift, redeem, transfer, tip (direct + commit-reveal), verify access, verify tier, create/update/deprecate tiers, publish/update/delete content, revoke access, withdraw revenue, prove subscriber threshold
- **Routes**: /, /dashboard, /explore, /explorer, /analytics, /docs, /privacy, /verify, /vision, /creator/[address]

---

## 3. SUBMISSION CHECKLIST

- [x] Live frontend at https://veilsub.vercel.app
- [x] Contract deployed on testnet (veilsub_v27.aleo)
- [x] 15+ on-chain transactions verified
- [x] README with architecture, privacy model, verification guide
- [x] Wallet connection working (Shield + 4 others)
- [x] Frontend connected to real on-chain transitions
- [x] Dynamic tier creation (judge requested)
- [x] Zero addresses in finalize (privacy baseline)
- [x] Blind Subscription Protocol (novel privacy)
- [x] Commit-reveal tipping (BHP256 scheme)
- [x] Creator revenue withdrawal UI
- [x] Content gating with encrypted content
- [x] Trial subscription passes (v26)
- [x] Privacy-preserving reputation proofs (v25)
- [x] 281 passing tests across 10 test suites
- [x] 119 error codes with sequential numbering
