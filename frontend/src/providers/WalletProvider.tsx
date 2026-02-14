'use client'

import { FC, ReactNode, useMemo } from 'react'
import { WalletProvider as AleoWalletProvider } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui'
import {
  WalletAdapterNetwork,
  DecryptPermission,
} from '@demox-labs/aleo-wallet-adapter-base'
import { LeoWalletAdapter, FoxWalletAdapter } from 'aleo-adapters'
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css'
import { PROGRAM_ID, APP_NAME } from '@/lib/config'

interface Props {
  children: ReactNode
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({ appName: APP_NAME }),
      new FoxWalletAdapter({ appName: APP_NAME }),
    ],
    []
  )

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={WalletAdapterNetwork.Testnet}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={[PROGRAM_ID, 'credits.aleo']}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  )
}
