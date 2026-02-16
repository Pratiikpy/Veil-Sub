'use client'

import { FC, ReactNode, useMemo } from 'react'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core'
import { Network } from '@provablehq/aleo-types'
import { PatchedLeoWalletAdapter } from '@/lib/PatchedLeoWalletAdapter'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'
import { APP_NAME, PROGRAM_ID } from '@/lib/config'

interface Props {
  children: ReactNode
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PatchedLeoWalletAdapter({ appName: APP_NAME }),
    ],
    []
  )

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      network={Network.TESTNET}
      autoConnect
      programs={[PROGRAM_ID, 'credits.aleo']}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  )
}
