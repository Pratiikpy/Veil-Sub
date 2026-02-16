'use client'

import { FC, ReactNode, useMemo } from 'react'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core'
import { Network } from '@provablehq/aleo-types'
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield'
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'
import { APP_NAME, PROGRAM_ID } from '@/lib/config'

interface Props {
  children: ReactNode
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter({ appName: APP_NAME }),
      new LeoWalletAdapter({ appName: APP_NAME }),
    ],
    []
  )

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={[PROGRAM_ID, 'credits.aleo']}
      autoConnect
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  )
}
