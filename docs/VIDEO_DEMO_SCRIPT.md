# VeilSub Video Demo Script

## Setup Before Recording

1. Open Shield Wallet with testnet credits (at least 5 ALEO)
2. Register at least one creator on testnet
3. Have a second wallet address ready for subscriber demo
4. Open the live app: https://veilsub.vercel.app
5. Open Aleo Explorer: https://explorer.aleo.org in another tab
6. Screen recording tool: Loom or OBS (1080p recommended)

## Script (Target: 3-5 minutes)

### Intro (0:00 - 0:30)
**Show**: Landing page at veilsub.vercel.app

"VeilSub is a privacy-preserving content subscription platform built on Aleo. Unlike Patreon or Substack, VeilSub keeps subscriber identities completely private using zero-knowledge proofs. Creators are public — subscribers are anonymous."

### Creator Registration (0:30 - 1:00)
**Show**: Connect wallet → Dashboard → Register as creator

1. Connect Shield Wallet
2. Navigate to Dashboard
3. Click "Register as Creator"
4. Set base price (e.g., 1 ALEO)
5. Sign and submit transaction
6. Show transaction confirming on-chain

"I'm registering as a creator with a base price of 1 ALEO. This is an on-chain transaction using veilsub_v8.aleo. The creator address is public — subscribers will be able to see my profile and pricing."

### Subscribe Flow (1:00 - 2:00)
**Show**: Switch to subscriber wallet → Explore → Creator page → Subscribe

1. Disconnect creator wallet, connect subscriber wallet
2. Navigate to Explore page
3. Click on the registered creator
4. Select a tier (e.g., Premium - 2x)
5. Click Subscribe
6. Show wallet signing the transaction
7. Show transaction confirming
8. Show AccessPass appearing in wallet records

"Now I'm subscribing as a different user. The subscribe transition does three things atomically: transfers credits privately to the creator, mints an AccessPass to my wallet, and creates a CreatorReceipt for the creator. My subscriber address NEVER appears in any public data."

### Verify Access (2:00 - 2:30)
**Show**: Navigate to /verify → Select pass → Click "Verify with ZK Proof"

1. Go to Verify page
2. Show AccessPass listed
3. Click "Verify with ZK Proof"
4. Show the zero-knowledge proof being generated
5. Show success result

"This is zero-footprint verification. The verify_access transition has NO finalize — no public state changes whatsoever. The ZK proof confirms I hold a valid pass without revealing who I am."

### Walletless On-Chain Explorer (2:30 - 3:15)
**Show**: Scroll to "On-Chain Explorer" section → Disconnect wallet

1. Disconnect the wallet
2. Scroll to the On-Chain Explorer section
3. Enter the creator's address in "Creator Lookup"
4. Click "Query On-Chain"
5. Show: registered status, base price, subscriber count, revenue
6. Click "Check Deployment" to verify program is on-chain

"This works without any wallet connected. Anyone can verify on-chain data — creator stats, content metadata, program deployment. The subscriber count shows 1, but there's no way to determine WHO that subscriber is."

### On-Chain Evidence (3:15 - 3:45)
**Show**: Aleo Explorer showing program and transactions

1. Open Aleo Explorer
2. Search for veilsub_v8.aleo
3. Show the deployed program
4. Show a subscribe transaction
5. Point out: creator address visible, subscriber address NOT visible

"On the Aleo explorer, you can see the deployed program and transactions. Notice the subscribe transaction shows the creator and amount — but the subscriber's address is nowhere in the public data. That's the power of Aleo's privacy model."

### Privacy Model Summary (3:45 - 4:15)
**Show**: Navigate to /privacy or show PRIVACY_MODEL.md

"To summarize VeilSub's privacy model:
- Creators are PUBLIC entities — their prices, stats, and content are discoverable
- Subscribers are ANONYMOUS — self.caller never enters any finalize function
- Payments are PRIVATE — using credits.aleo/transfer_private
- Verification has ZERO footprint — no finalize, no state changes
- Audit tokens enable SELECTIVE DISCLOSURE — prove your subscription without revealing your identity"

### Closing (4:15 - 4:30)
**Show**: Landing page

"VeilSub demonstrates that privacy and usability can coexist. Built with Leo on Aleo, using real credits.aleo and token_registry.aleo integration. Visit our GitHub for the full source code and documentation."

## Key Points to Emphasize

- **Atomic payments**: credits.aleo/transfer_private called INSIDE the contract (not trust-based)
- **5 wallet adapters**: Shield, Leo, Fox, Puzzle, Soter
- **token_registry.aleo**: Generic ARC-20 multi-token support (unique among competitors)
- **Zero-footprint verify**: verify_access has NO finalize
- **CreatorReceipt**: Private payment proofs with hashed subscriber identity
- **AuditToken**: Selective disclosure for third parties
- **Content hashes**: On-chain integrity verification

## Recording Tips

- Use 1080p resolution
- Keep mouse movements deliberate and slow
- Pause briefly after each transaction to show the result
- Show the terminal/console if any errors occur (demonstrates honesty)
- Total target: 3-5 minutes (judges appreciate concise demos)
- Upload to YouTube as unlisted, share link in submission
