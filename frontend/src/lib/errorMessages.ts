/**
 * Maps on-chain error codes from VeilSub smart contract (veilsub_v27.aleo)
 * to user-friendly messages displayed in the frontend.
 *
 * Error codes are embedded as comments in the Leo contract's assert statements.
 * When a transaction fails on-chain, the error string may contain these codes.
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // === Creator Registration & Tier Management ===
  'ERR_001': 'Subscription price is below the minimum allowed (100 microcredits).',
  'ERR_002': 'Tier ID must be at least 1.',
  'ERR_003': 'Tier ID exceeds the maximum allowed value.',
  'ERR_004': 'Creator is not registered on VeilSub.',
  'ERR_005': 'This tier already exists for the creator.',
  'ERR_006': 'Tier price must be greater than zero.',
  'ERR_007': 'The specified tier does not exist.',
  'ERR_008': 'This tier has been deprecated and can no longer be used.',
  'ERR_009': 'The specified tier does not exist.',
  'ERR_010': 'Minimum tier level must be at least 1.',
  'ERR_011': 'Content hash cannot be empty.',

  // === Content Management ===
  'ERR_012': 'Only the content creator can update this content.',
  'ERR_013': 'The specified content does not exist.',
  'ERR_014': 'This content has been deleted and cannot be modified.',
  'ERR_015': 'Only the content creator can delete this content.',
  'ERR_016': 'The specified content does not exist.',
  'ERR_017': 'This content has already been deleted.',

  // === Creator Registration ===
  'ERR_018': 'Registration price is below the minimum allowed.',
  'ERR_019': 'This address is already registered as a creator.',

  // === Subscription ===
  'ERR_020': 'Subscription tier must be at least 1.',
  'ERR_021': 'Subscription tier exceeds the maximum allowed.',
  'ERR_022': 'Payment amount is insufficient for this tier.',
  'ERR_023': 'This tier has been deprecated. Please choose a different tier.',
  'ERR_024': 'Subscription expiry must be set in the future.',
  'ERR_025': 'Subscription expiry is set too far into the future.',
  'ERR_026': 'This creator has reached the maximum subscriber limit.',
  'ERR_027': 'Your access has been revoked by the creator.',
  'ERR_028': 'Tip amount must be greater than zero.',

  // === Upgrade & Renewal ===
  'ERR_029': 'Upgrade tier must be at least 1.',
  'ERR_030': 'Payment amount is insufficient for renewal.',
  'ERR_031': 'This tier has been deprecated. Please choose a different tier.',
  'ERR_032': 'Renewal expiry must be set in the future.',
  'ERR_033': 'Renewal expiry is set too far into the future.',

  // === Content Publishing ===
  'ERR_034': 'Minimum tier for content must be at least 1.',
  'ERR_035': 'Content hash cannot be empty.',
  'ERR_036': 'You must register as a creator before publishing content.',
  'ERR_037': 'Content with this ID has already been published.',
  'ERR_038': 'You have reached the maximum number of published content items.',

  // === Gift Subscriptions ===
  'ERR_039': 'Gift subscription tier must be at least 1.',
  'ERR_040': 'Payment amount is insufficient for this gift subscription.',
  'ERR_041': 'This tier has been deprecated. Please choose a different tier.',
  'ERR_042': 'Gift subscription expiry must be set in the future.',
  'ERR_043': 'Gift subscription expiry is set too far into the future.',
  'ERR_044': 'This gift ID has already been used.',
  'ERR_045': 'This gift subscription has already been redeemed.',

  // === ERR_046–054: Reserved (escrow transitions removed in v23) ===

  // === Platform & Creator Withdrawals ===
  'ERR_055': 'Withdrawal amount must be greater than zero.',
  'ERR_056': 'Only the platform administrator can perform this action.',
  'ERR_057': 'Insufficient platform balance for this withdrawal.',
  'ERR_058': 'Withdrawal amount must be greater than zero.',
  'ERR_059': 'Creator is not registered on VeilSub.',
  'ERR_060': 'Insufficient creator balance for this withdrawal.',

  // === Blind Subscribe ===
  'ERR_061': 'Subscription tier must be at least 1.',
  'ERR_062': 'Privacy nonce cannot be zero.',
  'ERR_063': 'Payment amount is insufficient for this blind subscription.',
  'ERR_064': 'This tier has been deprecated. Please choose a different tier.',
  'ERR_065': 'Subscription expiry must be set in the future.',
  'ERR_066': 'Subscription expiry is set too far into the future.',
  'ERR_067': 'This privacy nonce has already been used. Please retry with a new nonce.',

  // === Blind Renewal ===
  'ERR_068': 'Renewal tier must be at least 1.',
  'ERR_069': 'Privacy nonce cannot be zero.',
  'ERR_070': 'Payment amount is insufficient for this blind renewal.',
  'ERR_071': 'This tier has been deprecated. Please choose a different tier.',
  'ERR_072': 'Renewal expiry must be set in the future.',
  'ERR_073': 'Renewal expiry is set too far into the future.',
  'ERR_074': 'This privacy nonce has already been used. Please retry with a new nonce.',

  // === Access Verification ===
  'ERR_075': 'Your subscription pass does not belong to this creator.',
  'ERR_076': 'Your subscription tier is not high enough to access this content.',
  'ERR_077': 'Your access has been revoked by the creator.',
  'ERR_078': 'Minimum tier for content must be at least 1.',
  'ERR_079': 'Content hash cannot be empty.',
  'ERR_080': 'Encryption commitment is required for encrypted content.',

  // === Encrypted Content Publishing ===
  'ERR_081': 'You must register as a creator before publishing encrypted content.',
  'ERR_082': 'Encrypted content with this ID has already been published.',
  'ERR_083': 'Only the issuing creator can revoke access.',

  // === Disputes ===
  'ERR_084': 'The specified content does not exist.',
  'ERR_085': 'This content has been deleted and cannot be disputed.',
  'ERR_086': 'You have reached the maximum number of disputes allowed.',

  // === Subscription Transfer ===
  'ERR_087': 'You cannot transfer a subscription to yourself.',
  'ERR_088': 'Your access has been revoked and cannot be transferred.',

  // === ERR_089–098: Reserved (Pedersen proof transitions removed in v23) ===

  // === Commit-Reveal Tipping ===
  'ERR_099': 'Tip amount must be greater than zero.',
  'ERR_100': 'A tip commitment with this ID already exists.',
  'ERR_101': 'Reveal amount must be greater than zero.',
  'ERR_102': 'No tip commitment found for this ID. Submit a commitment first.',
  'ERR_103': 'This tip has already been revealed.',

  // === Expiry Checks ===
  'ERR_104': 'Your subscription has expired. Please renew to continue access.',
  'ERR_105': 'Your subscription has expired. Please renew to continue access.',
  'ERR_106': 'You have reached the maximum number of encrypted content items.',
  'ERR_107': 'Your subscription has expired and cannot be used to file a dispute.',

  // === Privacy Proofs (v25) ===
  'ERR_108': 'Threshold must be greater than zero.',
  'ERR_109': 'Creator is not registered on VeilSub.',
  'ERR_110': 'Subscriber count is below the specified threshold.',

  // === Trial Subscriptions ===
  'ERR_111': 'Trial tier must be at least 1.',
  'ERR_112': 'Trial tier exceeds the maximum allowed.',
  'ERR_113': 'Trial payment is insufficient (must be at least 20% of tier price).',
  'ERR_114': 'This tier is deprecated and cannot be used for trials.',
  'ERR_115': 'Trial expiry must be in the future.',
  'ERR_116': 'Trial duration exceeds the maximum (~12 hours).',
  'ERR_117': 'Creator has reached the maximum subscriber limit.',

  // === Scoped Audit Tokens (v27) ===
  'ERR_118': 'Audit token scope must include at least one field.',

  // === Trial Rate Limiting (v27) ===
  'ERR_119': 'You have already used a trial subscription for this creator.',
}

/**
 * Checks an error string for known VeilSub error codes and returns
 * a user-friendly message. Falls back to the original error if no
 * known code is found.
 */
export function getErrorMessage(error: string): string {
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.includes(code)) {
      return message
    }
  }
  return error
}
