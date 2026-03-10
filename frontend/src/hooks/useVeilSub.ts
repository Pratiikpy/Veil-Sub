'use client'

import { useContractExecute } from './useContractExecute'
import { useCreatorActions } from './useCreatorActions'
import { useSubscription } from './useSubscription'
import { useContentActions } from './useContentActions'
import { useTipping } from './useTipping'
import { useWalletRecords } from './useWalletRecords'

/**
 * Barrel hook that re-exports all domain hooks under a single API.
 * Existing imports from '@/hooks/useVeilSub' continue to work unchanged.
 */
export function useVeilSub() {
  const { address, connected } = useContractExecute()
  const creatorActions = useCreatorActions()
  const subscription = useSubscription()
  const contentActions = useContentActions()
  const tipping = useTipping()
  const walletRecords = useWalletRecords()

  return {
    publicKey: address,
    connected,
    // Creator actions (useCreatorActions)
    registerCreator: creatorActions.registerCreator,
    createCustomTier: creatorActions.createCustomTier,
    updateTierPrice: creatorActions.updateTierPrice,
    deprecateTier: creatorActions.deprecateTier,
    withdrawCreatorRevenue: creatorActions.withdrawCreatorRevenue,
    withdrawPlatformFees: creatorActions.withdrawPlatformFees,
    // Subscription actions (useSubscription)
    subscribe: subscription.subscribe,
    subscribeBlind: subscription.subscribeBlind,
    subscribeTrial: subscription.subscribeTrial,
    renew: subscription.renew,
    renewBlind: subscription.renewBlind,
    giftSubscription: subscription.giftSubscription,
    redeemGift: subscription.redeemGift,
    transferPass: subscription.transferPass,
    // Content actions (useContentActions)
    publishContent: contentActions.publishContent,
    publishEncryptedContent: contentActions.publishEncryptedContent,
    updateContent: contentActions.updateContent,
    deleteContent: contentActions.deleteContent,
    disputeContent: contentActions.disputeContent,
    revokeAccess: contentActions.revokeAccess,
    // Tipping & verification (useTipping)
    tip: tipping.tip,
    commitTip: tipping.commitTip,
    revealTip: tipping.revealTip,
    createAuditToken: tipping.createAuditToken,
    verifyAccess: tipping.verifyAccess,
    verifyTierAccess: tipping.verifyTierAccess,
    proveSubscriberThreshold: tipping.proveSubscriberThreshold,
    // Wallet records & utilities (useWalletRecords)
    getCreditsRecords: walletRecords.getCreditsRecords,
    getTierRecords: walletRecords.getTierRecords,
    getGiftTokens: walletRecords.getGiftTokens,
    getTokenRecords: walletRecords.getTokenRecords,
    splitCredits: walletRecords.splitCredits,
    convertPublicToPrivate: walletRecords.convertPublicToPrivate,
    getAccessPasses: walletRecords.getAccessPasses,
    getCreatorReceipts: walletRecords.getCreatorReceipts,
    getAuditTokens: walletRecords.getAuditTokens,
    pollTxStatus: walletRecords.pollTxStatus,
  }
}
