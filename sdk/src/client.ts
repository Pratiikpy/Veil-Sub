import { PROGRAM_ID, API_URL, FEES, SUBSCRIPTION_DURATION_BLOCKS, TRIAL_DURATION_BLOCKS } from './constants'
import { queryMapping, queryCreatorStats } from './queries'
import { parseAccessPass } from './records'
import type { VeilSubConfig, CreatorStats, AccessPass, TransactionResult } from './types'

export class VeilSubClient {
  readonly programId: string
  readonly apiUrl: string
  readonly network: string

  constructor(config?: VeilSubConfig) {
    this.programId = config?.programId || PROGRAM_ID
    this.apiUrl = config?.apiUrl || API_URL
    this.network = config?.network || 'testnet'
  }

  async getCreatorStats(creatorHash: string): Promise<CreatorStats> {
    return queryCreatorStats(creatorHash, { apiUrl: this.apiUrl, programId: this.programId })
  }

  async getMapping(mapping: string, key: string): Promise<string | null> {
    return queryMapping(mapping, key, { apiUrl: this.apiUrl, programId: this.programId })
  }

  async getSubscriberCount(creatorHash: string): Promise<number> {
    const raw = await this.getMapping('subscriber_count', creatorHash)
    return raw ? parseInt(raw.replace(/u\d+$/, ''), 10) || 0 : 0
  }

  async getTotalRevenue(creatorHash: string): Promise<number> {
    const raw = await this.getMapping('total_revenue', creatorHash)
    return raw ? parseInt(raw.replace(/u\d+$/, ''), 10) || 0 : 0
  }

  async getContentCount(creatorHash: string): Promise<number> {
    const raw = await this.getMapping('content_count', creatorHash)
    return raw ? parseInt(raw.replace(/u\d+$/, ''), 10) || 0 : 0
  }

  async getTierPrice(creatorHash: string): Promise<number | null> {
    const raw = await this.getMapping('tier_prices', creatorHash)
    if (!raw) return null
    return parseInt(raw.replace(/u\d+$/, ''), 10) || null
  }

  async isSubscriptionActive(creatorHash: string, passId: string): Promise<boolean> {
    const revoked = await this.getMapping('pass_revoked', passId)
    return revoked !== 'true'
  }

  parseAccessPass(plaintext: string): AccessPass | null {
    return parseAccessPass(plaintext)
  }

  getSubscribeParams(
    creatorAddress: string,
    tier: number,
    amount: number,
    passId: string,
    expiresAt: number
  ): { transition: string; inputs: string[]; fee: number } {
    return {
      transition: 'subscribe',
      inputs: [
        creatorAddress,
        `${tier}u8`,
        `${amount}u64`,
        `${passId}field`,
        `${expiresAt}u32`,
      ],
      fee: FEES.SUBSCRIBE,
    }
  }

  getTipParams(
    creatorAddress: string,
    amount: number
  ): { transition: string; inputs: string[]; fee: number } {
    return {
      transition: 'tip',
      inputs: [creatorAddress, `${amount}u64`],
      fee: FEES.TIP,
    }
  }

  static get FEES() { return FEES }
  static get SUBSCRIPTION_DURATION() { return SUBSCRIPTION_DURATION_BLOCKS }
  static get TRIAL_DURATION() { return TRIAL_DURATION_BLOCKS }
}
