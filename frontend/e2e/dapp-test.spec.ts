/**
 * VeilSub dApp E2E — Full Creator Flow
 *
 * Tests the complete creator lifecycle:
 * 1. Landing page loads
 * 2. Connect Leo Wallet
 * 3. Navigate to Dashboard
 * 4. Register as creator (fill form, approve TX, wait for confirmation)
 * 5. Verify dashboard shows stats after registration
 * 6. Create a post (fill form, approve TX, wait for confirmation)
 * 7. Verify post appears in posts list
 * 8. Visit creator page to verify it's live
 * 9. Visit explore, verify, docs pages
 *
 * Run:  npx playwright test e2e/dapp-test.spec.ts --headed --reporter=list
 */

import { test, type BrowserContext, type Page } from '@playwright/test'
import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const LEO_EXT_ID = 'nebnhfamliijlghikdgcigoebonmoibm'
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')

// ─── Helpers ────────────────────────────────────────────────────────────────

function findLeoWallet(): string {
  const ld = process.env.LOCALAPPDATA || ''
  for (const p of [
    path.join(ld, 'BraveSoftware/Brave-Browser/User Data/Default/Extensions', LEO_EXT_ID, '3.0.0_0'),
    path.join(ld, 'Microsoft/Edge/User Data/Default/Extensions', LEO_EXT_ID, '3.0.0_0'),
    path.join(ld, 'Google/Chrome/User Data/Default/Extensions', LEO_EXT_ID, '3.0.0_0'),
    path.join(ld, 'ms-playwright/mcp-chrome-b7fba89/Default/Extensions', LEO_EXT_ID, '3.0.0_0'),
  ]) { if (fs.existsSync(p)) return p }
  throw new Error('Leo Wallet not found')
}

async function ss(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
  console.log(`  [screenshot] ${name}.png`)
}

async function waitForExtPopup(context: BrowserContext, timeout = 30000): Promise<Page> {
  const popup = await context.waitForEvent('page', {
    predicate: (p) => p.url().includes('chrome-extension://'),
    timeout,
  })
  await popup.waitForLoadState('domcontentloaded').catch(() => {})
  await new Promise(r => setTimeout(r, 2500))
  return popup
}

const WALLET_PASSWORD = process.env.WALLET_PASSWORD || 'aleo0909'

async function handleWalletPassword(popup: Page): Promise<boolean> {
  // Leo Wallet may require password entry before showing approval buttons
  const passwordInput = popup.locator('input[type="password"]').first()
  if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('  Entering wallet password...')
    await passwordInput.fill(WALLET_PASSWORD)
    // Look for unlock/submit button
    const unlockBtn = popup.locator('button[type="submit"], button:has-text("Unlock"), button:has-text("Submit"), button:has-text("Continue")').first()
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockBtn.click()
      await new Promise(r => setTimeout(r, 2000))
    }
    return true
  }
  return false
}

async function clickApproveButton(popup: Page): Promise<boolean> {
  // First handle password if wallet is locked
  await handleWalletPassword(popup)

  for (const label of ['Approve', 'Confirm', 'Sign', 'Allow', 'Connect', 'Accept']) {
    const btn = popup.locator(`button:has-text("${label}")`).first()
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click()
      await new Promise(r => setTimeout(r, 1000))
      return true
    }
  }
  return false
}

/** Log all console messages from the page */
function attachConsoleLogger(page: Page, prefix: string) {
  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    if (type === 'error') {
      console.log(`  [${prefix} CONSOLE ERROR] ${text}`)
    } else if (type === 'warning' && !text.includes('DevTools') && !text.includes('Download the React DevTools')) {
      console.log(`  [${prefix} WARN] ${text}`)
    }
  })
  page.on('pageerror', (err) => {
    console.log(`  [${prefix} PAGE ERROR] ${err.message}`)
  })
}

/** Try to connect wallet — click Select Wallet, choose Leo, approve popup */
async function connectWallet(page: Page, context: BrowserContext): Promise<boolean> {
  console.log('  Attempting wallet connection...')

  // Look for the wallet button (could be "Select Wallet" or "Connect Wallet")
  const walletBtn = page.locator('button:has-text("Select Wallet"), button:has-text("Connect")').first()
  if (!(await walletBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Maybe already connected — check for aleo1 address display
    const hasAddr = await page.locator('text=/aleo1/').first().isVisible({ timeout: 2000 }).catch(() => false)
    if (hasAddr) {
      console.log('  Already connected!')
      return true
    }
    console.log('  No connect button found')
    return false
  }

  await walletBtn.click()
  await new Promise(r => setTimeout(r, 1500))

  // Look for Leo Wallet in adapter modal
  const leoBtn = page.locator('button:has-text("Leo Wallet"), button:has-text("Leo")').first()
  if (!(await leoBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('  Leo Wallet not found in modal')
    return false
  }

  await leoBtn.click()
  console.log('  Clicked Leo Wallet option')

  // Leo Wallet opens a popup for approval
  try {
    const popup = await waitForExtPopup(context, 25000)
    const popupBody = await popup.textContent('body').catch(() => '') || ''
    console.log('  Popup text:', popupBody.replace(/\s+/g, ' ').slice(0, 200))

    if (popupBody.includes('Create a new wallet') || popupBody.includes('I already have')) {
      console.log('  ERROR: Wallet not set up! Must be configured first.')
      return false
    }

    const approved = await clickApproveButton(popup)
    console.log('  Popup approved:', approved)
  } catch (e) {
    console.log('  No popup (may have auto-approved):', (e as Error).message?.slice(0, 80))
  }

  await new Promise(r => setTimeout(r, 3000))

  // Verify connection
  const connected = await page.locator('text=/aleo1/').first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('  Connected:', connected)
  return connected
}

/** Wait for an on-chain TX to confirm by watching page text */
async function waitForTxConfirmation(page: Page, maxWaitSec: number = 180): Promise<'confirmed' | 'failed' | 'timeout'> {
  console.log(`  Waiting for TX confirmation (max ${maxWaitSec}s)...`)
  const start = Date.now()
  const interval = 5000

  for (let elapsed = 0; elapsed < maxWaitSec * 1000; elapsed = Date.now() - start) {
    await new Promise(r => setTimeout(r, interval))
    const body = (await page.textContent('body').catch(() => '') || '').toLowerCase()

    if (body.includes('confirmed') || body.includes('registered') || body.includes('you\'re registered') || body.includes('published')) {
      const sec = Math.round((Date.now() - start) / 1000)
      console.log(`  TX CONFIRMED after ${sec}s`)
      return 'confirmed'
    }
    if (body.includes('failed') && !body.includes('registration failed')) {
      const sec = Math.round((Date.now() - start) / 1000)
      console.log(`  TX FAILED after ${sec}s`)
      return 'failed'
    }

    const sec = Math.round((Date.now() - start) / 1000)
    if (sec % 15 === 0) {
      console.log(`  Still waiting... (${sec}s)`)
      await ss(page, `tx-wait-${sec}s`)
    }
  }

  console.log(`  TX TIMEOUT after ${maxWaitSec}s`)
  return 'timeout'
}

// ─── Main Test ──────────────────────────────────────────────────────────────

test('Full Creator Flow — Register, Publish, Verify', async () => {
  test.setTimeout(600_000) // 10 minutes

  const extPath = findLeoWallet()
  console.log(`[setup] Extension: ${extPath}`)

  const userDataDir = path.join(__dirname, '.wallet-profile')
  fs.mkdirSync(userDataDir, { recursive: true })

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
    ],
    slowMo: 80,
    viewport: { width: 1366, height: 900 },
    ignoreDefaultArgs: ['--disable-extensions'],
  })

  // Wait for extension to initialize
  await new Promise(r => setTimeout(r, 4000))
  console.log('[setup] Browser launched\n')

  try {
    const page = context.pages()[0] || await context.newPage()
    attachConsoleLogger(page, 'dApp')

    // ══════════════════════════════════════════════════════════════════════
    // STEP 1: Landing Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 1: Landing Page ═══')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await ss(page, '01-landing')
    console.log('  Title:', await page.title())

    // Check for key elements
    const hasVeilSub = await page.locator('text=VeilSub').first().isVisible({ timeout: 3000 }).catch(() => false)
    console.log('  VeilSub branding visible:', hasVeilSub)

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2: Connect Wallet
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 2: Connect Wallet (Landing) ═══')
    const connected = await connectWallet(page, context)
    await ss(page, '02-connected')

    if (!connected) {
      console.log('\n  WARNING: Wallet not connected. Will retry on dashboard.')
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3: Navigate to Dashboard
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 3: Dashboard ═══')
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    await ss(page, '03a-dashboard-initial')

    // Check if we need to reconnect wallet on dashboard
    const dashBody = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')
    console.log('  Dashboard state:', dashBody.slice(0, 200))

    if (dashBody.includes('Connect Your Wallet')) {
      console.log('  Need to connect wallet on dashboard...')
      const dashConnected = await connectWallet(page, context)
      if (dashConnected) {
        // Wait for dashboard to reload after connection
        await new Promise(r => setTimeout(r, 3000))
        await ss(page, '03b-dashboard-connected')
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4: Check Registration Status & Register if Needed
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 4: Creator Registration ═══')
    await new Promise(r => setTimeout(r, 2000))
    const dashText = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')

    if (dashText.includes('Register as Creator')) {
      console.log('  Creator not registered — filling registration form...')

      // Fill price
      const priceInput = page.locator('input[type="number"]').first()
      if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await priceInput.fill('5')
        console.log('  Set price: 5 ALEO')
      }

      // Fill display name
      const nameInput = page.locator('input[placeholder="Your creator name"]').first()
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test Creator')
        console.log('  Set display name: Test Creator')
      }

      // Fill bio
      const bioInput = page.locator('textarea[placeholder="Tell subscribers what you create..."]').first()
      if (await bioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bioInput.fill('Privacy-first content creator. Testing VeilSub on Aleo testnet.')
        console.log('  Set bio')
      }

      await ss(page, '04a-registration-form-filled')

      // Click Register
      const regBtn = page.locator('button:has-text("Register")').first()
      if (await regBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
        console.log('  Clicking Register button...')
        await regBtn.click()
        await new Promise(r => setTimeout(r, 2000))
        await ss(page, '04b-after-register-click')

        // Handle Leo Wallet approval popup
        console.log('  Waiting for wallet approval popup...')
        try {
          const popup = await waitForExtPopup(context, 45000)
          await ss(popup, '04c-register-tx-popup')
          const popupText = await popup.textContent('body').catch(() => '') || ''
          console.log('  TX Popup:', popupText.replace(/\s+/g, ' ').slice(0, 300))

          const approved = await clickApproveButton(popup)
          console.log('  TX approved:', approved)

          if (!approved) {
            // Try scrolling down and looking for more buttons
            console.log('  Trying to scroll popup and find approve button...')
            await popup.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
            await new Promise(r => setTimeout(r, 1000))
            const retry = await clickApproveButton(popup)
            console.log('  Retry approve:', retry)
          }
        } catch (e) {
          console.log('  TX popup error:', (e as Error).message?.slice(0, 120))
        }

        // Wait for on-chain confirmation
        await new Promise(r => setTimeout(r, 3000))
        await ss(page, '04d-tx-broadcasting')

        const txResult = await waitForTxConfirmation(page, 180)
        console.log('  Registration TX result:', txResult)
        await ss(page, '04e-registration-result')

        if (txResult === 'confirmed') {
          // Wait for celebration and dashboard to load
          await new Promise(r => setTimeout(r, 6000))
          await ss(page, '04f-celebration')
        }
      } else {
        console.log('  Register button not enabled (no price set?)')
      }
    } else if (dashText.includes('Creator Dashboard') || dashText.includes('On-Chain Stats')) {
      console.log('  Already registered as creator!')
      await ss(page, '04-already-registered')
    } else {
      console.log('  Unexpected dashboard state. Body:', dashText.slice(0, 300))
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 5: Verify Dashboard Stats (if registered)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 5: Verify Dashboard ═══')
    // Refresh dashboard to see post-registration state
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 4000))

    // Reconnect if needed
    const step5Body = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')
    if (step5Body.includes('Connect Your Wallet')) {
      console.log('  Reconnecting wallet...')
      await connectWallet(page, context)
      await new Promise(r => setTimeout(r, 3000))
    }

    await ss(page, '05a-dashboard-final')

    const hasCretorDash = await page.locator('text=Creator Dashboard').first().isVisible({ timeout: 5000 }).catch(() => false)
    const hasStats = await page.locator('text=On-Chain Stats').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasTiers = await page.locator('text=Your Tier Pricing').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasProfile = await page.locator('text=Profile').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasCreatePost = await page.locator('text=Create Post').first().isVisible({ timeout: 3000 }).catch(() => false)

    console.log('  Creator Dashboard heading:', hasCretorDash)
    console.log('  On-Chain Stats:', hasStats)
    console.log('  Tier Pricing:', hasTiers)
    console.log('  Profile editor:', hasProfile)
    console.log('  Create Post form:', hasCreatePost)

    // ══════════════════════════════════════════════════════════════════════
    // STEP 6: Create a Post
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 6: Create Post ═══')

    if (hasCreatePost) {
      // Scroll to Create Post section
      await page.locator('text=Create Post').first().scrollIntoViewIfNeeded()
      await new Promise(r => setTimeout(r, 1000))

      // Fill post title
      const postTitle = page.locator('input[placeholder="Post title..."]').first()
      if (await postTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postTitle.fill('Welcome to VeilSub — My First Exclusive Post')
        console.log('  Set post title')
      }

      // Fill post body
      const postBody = page.locator('textarea[placeholder="Write your exclusive content..."]').first()
      if (await postBody.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postBody.fill(
          'This is a tier-gated exclusive post on VeilSub. ' +
          'Only subscribers with a valid AccessPass can view this content. ' +
          'The subscription is fully private — no one can see who subscribes. ' +
          'Built on Aleo zero-knowledge proofs.'
        )
        console.log('  Set post body')
      }

      // Select tier (default is Supporter / tier 1 — let's pick Premium / tier 2)
      const premiumBtn = page.locator('button:has-text("Premium")').first()
      if (await premiumBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await premiumBtn.click()
        console.log('  Selected Premium tier')
      }

      await ss(page, '06a-post-form-filled')

      // Click Publish
      const publishBtn = page.locator('button:has-text("Publish")').first()
      if (await publishBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
        console.log('  Clicking Publish...')
        await publishBtn.click()
        await new Promise(r => setTimeout(r, 2000))
        await ss(page, '06b-after-publish-click')

        // Handle Leo Wallet TX approval
        console.log('  Waiting for publish TX popup...')
        try {
          const popup = await waitForExtPopup(context, 45000)
          await ss(popup, '06c-publish-tx-popup')
          const approved = await clickApproveButton(popup)
          console.log('  Publish TX approved:', approved)
        } catch (e) {
          console.log('  Publish TX popup:', (e as Error).message?.slice(0, 120))
        }

        // Wait for on-chain confirmation
        await new Promise(r => setTimeout(r, 3000))
        const pubResult = await waitForTxConfirmation(page, 180)
        console.log('  Publish TX result:', pubResult)
        await ss(page, '06d-publish-result')
      }
    } else {
      console.log('  Create Post form not visible — skipping')
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 7: Verify Posts List
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 7: Verify Posts ═══')
    const hasYourPosts = await page.locator('text=Your Posts').first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('  Your Posts section visible:', hasYourPosts)
    if (hasYourPosts) {
      await page.locator('text=Your Posts').first().scrollIntoViewIfNeeded()
      await new Promise(r => setTimeout(r, 1000))
      await ss(page, '07-posts-list')

      // Count posts
      const postItems = page.locator('.space-y-2 > div')
      const postCount = await postItems.count().catch(() => 0)
      console.log('  Posts count:', postCount)
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 8: Visit Creator Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 8: Creator Page ═══')

    // Get the connected wallet address from the page
    const viewLink = page.locator('a:has-text("View")').first()
    if (await viewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await viewLink.getAttribute('href') || ''
      console.log('  Creator page link:', href)
      if (href.includes('/creator/')) {
        await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle', timeout: 30000 })
      }
    } else {
      // Fallback — try URL from page text
      const addrMatch = (await page.textContent('body').catch(() => '') || '').match(/aleo1[a-z0-9]{58}/)
      if (addrMatch) {
        console.log('  Found address:', addrMatch[0])
        await page.goto(`${BASE_URL}/creator/${addrMatch[0]}`, { waitUntil: 'networkidle', timeout: 30000 })
      }
    }

    await new Promise(r => setTimeout(r, 3000))
    await ss(page, '08a-creator-page')

    const creatorBody = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')
    console.log('  Creator page:', creatorBody.slice(0, 300))

    const hasSubscribeBtn = await page.locator('button:has-text("Subscribe")').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasTipBtn = await page.locator('button:has-text("Tip")').first().isVisible({ timeout: 3000 }).catch(() => false)
    const hasCreatorNotFound = creatorBody.toLowerCase().includes('creator not found')
    console.log('  Subscribe button:', hasSubscribeBtn)
    console.log('  Tip button:', hasTipBtn)
    console.log('  Creator Not Found:', hasCreatorNotFound)

    // ══════════════════════════════════════════════════════════════════════
    // STEP 9: Explore Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 9: Explore Page ═══')
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await ss(page, '09-explore')
    const exploreBody = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')
    console.log('  Explore page:', exploreBody.slice(0, 200))

    // ══════════════════════════════════════════════════════════════════════
    // STEP 10: Verify Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 10: Verify Page ═══')
    await page.goto(`${BASE_URL}/verify`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await ss(page, '10-verify')
    const verifyBody = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ')
    console.log('  Verify page:', verifyBody.slice(0, 200))

    // ══════════════════════════════════════════════════════════════════════
    // STEP 11: Docs Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 11: Docs Page ═══')
    await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await ss(page, '11-docs')
    console.log('  Docs loaded')

    // ══════════════════════════════════════════════════════════════════════
    // STEP 12: Privacy Page
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n═══ STEP 12: Privacy Page ═══')
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await ss(page, '12-privacy')
    console.log('  Privacy loaded')

    // ══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n\n╔══════════════════════════════════════╗')
    console.log('║     CREATOR FLOW TEST COMPLETE       ║')
    console.log('╚══════════════════════════════════════╝')
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`)

  } finally {
    await context.close()
  }
})
