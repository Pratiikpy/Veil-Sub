/**
 * Playwright helpers for Leo Wallet extension interaction.
 *
 * Leo Wallet v3 is a Manifest V3 Chrome extension. Key facts:
 * - Extension ID: nebnhfamliijlghikdgcigoebonmoibm
 * - Popup page:   chrome-extension://<id>/popup.html
 * - The popup opens in a new window/tab when the user clicks the extension icon
 * - When the dApp calls wallet adapter methods, Leo Wallet opens an approval popup
 */

import { chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'path'

// Leo Wallet extension ID (consistent across installs)
const LEO_EXTENSION_ID = 'nebnhfamliijlghikdgcigoebonmoibm'

// Possible extension paths (pick the first that exists)
const EXTENSION_PATHS = [
  // Brave (preferred — most compatible with Chromium automation)
  path.join(
    process.env.LOCALAPPDATA || '',
    'BraveSoftware/Brave-Browser/User Data/Default/Extensions',
    LEO_EXTENSION_ID,
    '3.0.0_0'
  ),
  // Edge
  path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft/Edge/User Data/Default/Extensions',
    LEO_EXTENSION_ID,
    '3.0.0_0'
  ),
  // Playwright mcp-chrome
  path.join(
    process.env.LOCALAPPDATA || '',
    'ms-playwright',
    'mcp-chrome-b7fba89/Default/Extensions',
    LEO_EXTENSION_ID,
    '3.0.0_0'
  ),
]

function getExtensionPath(): string {
  const fs = require('fs')
  for (const p of EXTENSION_PATHS) {
    if (fs.existsSync(p)) return p
  }
  throw new Error(
    `Leo Wallet extension not found. Checked:\n${EXTENSION_PATHS.join('\n')}`
  )
}

/**
 * Launch a persistent Chromium context with Leo Wallet loaded.
 *
 * Uses a persistent user data dir so the wallet state (imported accounts)
 * survives across test runs. First run requires wallet setup.
 */
export async function launchBrowserWithWallet(options?: {
  headless?: boolean
  userDataDir?: string
  slowMo?: number
}): Promise<{ context: BrowserContext; extensionId: string }> {
  const extPath = getExtensionPath()
  const userDataDir = options?.userDataDir || path.join(__dirname, '.wallet-profile')

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Extensions REQUIRE headed mode
    channel: undefined, // Use Playwright's bundled Chromium
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
    ],
    slowMo: options?.slowMo ?? 100,
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--disable-extensions'],
  })

  // Wait for the service worker to register (Leo Wallet background script)
  let extensionId = LEO_EXTENSION_ID
  try {
    const sw = await context.waitForEvent('serviceworker', { timeout: 10_000 })
    extensionId = new URL(sw.url()).hostname
  } catch {
    // Extension may already be loaded from persistent context
    console.log('[wallet-helpers] Service worker already running, using known extension ID')
  }

  return { context, extensionId }
}

/**
 * Open the Leo Wallet popup page directly.
 */
export async function openWalletPopup(
  context: BrowserContext,
  extensionId: string = LEO_EXTENSION_ID
): Promise<Page> {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`
  const page = await context.newPage()
  await page.goto(popupUrl)
  await page.waitForLoadState('domcontentloaded')
  return page
}

/**
 * Wait for Leo Wallet to open an approval popup (e.g., connect, sign tx).
 * Returns the popup page so you can interact with it.
 */
export async function waitForWalletPopup(
  context: BrowserContext,
  timeoutMs: number = 30_000
): Promise<Page> {
  const popup = await context.waitForEvent('page', {
    predicate: (page) => page.url().includes('chrome-extension://'),
    timeout: timeoutMs,
  })
  await popup.waitForLoadState('domcontentloaded')
  // Give the popup UI a moment to render
  await popup.waitForTimeout(500)
  return popup
}

/**
 * Click the approve/confirm button in a Leo Wallet popup.
 * Leo Wallet v3 uses various button labels: "Approve", "Confirm", "Sign", "Allow".
 */
export async function approveWalletAction(popup: Page): Promise<void> {
  // Wait for any approve-like button to appear
  const approveBtn = popup.locator(
    'button:has-text("Approve"), button:has-text("Confirm"), button:has-text("Sign"), button:has-text("Allow"), button:has-text("Connect")'
  ).first()

  await approveBtn.waitFor({ state: 'visible', timeout: 15_000 })
  await approveBtn.click()

  // Wait for popup to close or navigate
  await popup.waitForTimeout(1000)
}

/**
 * Reject/cancel a wallet action.
 */
export async function rejectWalletAction(popup: Page): Promise<void> {
  const rejectBtn = popup.locator(
    'button:has-text("Reject"), button:has-text("Cancel"), button:has-text("Deny"), button:has-text("Close")'
  ).first()

  await rejectBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await rejectBtn.click()
}

/**
 * Import a wallet account using a private key.
 * Call this on first setup when the wallet is fresh.
 */
export async function importWalletAccount(
  walletPage: Page,
  privateKey: string,
  accountName: string = 'Test Account'
): Promise<void> {
  // Look for "Import" or "Add Account" button
  const importBtn = walletPage.locator(
    'button:has-text("Import"), button:has-text("Add Account"), a:has-text("Import")'
  ).first()

  if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importBtn.click()
    await walletPage.waitForTimeout(500)
  }

  // Find private key input
  const keyInput = walletPage.locator(
    'input[placeholder*="private"], input[placeholder*="key"], textarea[placeholder*="private"], textarea[placeholder*="key"]'
  ).first()

  if (await keyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await keyInput.fill(privateKey)

    // Look for name input
    const nameInput = walletPage.locator(
      'input[placeholder*="name"], input[placeholder*="Name"]'
    ).first()
    if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameInput.fill(accountName)
    }

    // Submit
    const submitBtn = walletPage.locator(
      'button:has-text("Import"), button:has-text("Add"), button:has-text("Submit"), button:has-text("Confirm")'
    ).first()
    await submitBtn.click()
    await walletPage.waitForTimeout(2000)
  }
}

/**
 * Check if the wallet already has an account set up.
 */
export async function isWalletSetUp(walletPage: Page): Promise<boolean> {
  // If the popup shows a balance or account address, it's set up
  const hasAccount = await walletPage.locator(
    'text=/aleo1/, text=/Balance/, text=/Account/'
  ).first().isVisible({ timeout: 3000 }).catch(() => false)

  return hasAccount
}
