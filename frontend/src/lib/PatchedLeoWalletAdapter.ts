import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo'

/**
 * Fixes a race condition in LeoWalletAdapter@0.3.0-alpha.3 where:
 * 1. Constructor reads window.leoWallet before the extension injects it
 * 2. _checkAvailability() detects the extension later but never updates _leoWallet
 * 3. connect() calls _leoWallet?.connect() on undefined → "No address returned"
 *
 * This patch re-reads the wallet reference from window right before connecting.
 */
export class PatchedLeoWalletAdapter extends LeoWalletAdapter {
  async connect(
    network: any,
    decryptPermission: any,
    programs: string[]
  ): Promise<any> {
    // Fix race condition: re-read wallet reference from window before connecting
    const win = window as any
    const leoWallet = win.leoWallet || win.leo

    if (leoWallet) {
      // Patch the internal reference that the constructor missed
      ;(this as any)._leoWallet = leoWallet
    } else {
      // Extension not injected yet — poll up to 3 seconds
      await new Promise<void>((resolve) => {
        let elapsed = 0
        const interval = setInterval(() => {
          const w = window as any
          const wallet = w.leoWallet || w.leo
          if (wallet) {
            ;(this as any)._leoWallet = wallet
            clearInterval(interval)
            resolve()
          }
          elapsed += 100
          if (elapsed >= 3000) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
      })
    }

    return super.connect(network, decryptPermission, programs)
  }
}
