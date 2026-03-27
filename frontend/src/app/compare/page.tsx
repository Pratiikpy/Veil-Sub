import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Patreon vs VeilSub | Privacy Comparison',
  description:
    'See how VeilSub zero-knowledge subscriptions compare to Patreon on identity privacy, payment trails, data breach risk, and more.',
}

const ROWS = [
  {
    feature: 'Identity',
    patreon: 'Real name & email required',
    veilsub: 'Pseudonymous wallet address only',
  },
  {
    feature: 'Payment Trail',
    patreon: 'Credit card statement links you to creator',
    veilsub: 'On-chain transfer with no creator metadata',
  },
  {
    feature: 'Subscription Link',
    patreon: 'Public supporter list by default',
    veilsub: 'Blind Subscription Protocol hides subscriber-creator link',
  },
  {
    feature: 'Content Access',
    patreon: 'Server-side DRM, platform reads your content',
    veilsub: 'E2E encrypted; only your wallet can decrypt',
  },
  {
    feature: 'Data Breach Risk',
    patreon: 'Centralized DB exposes names, emails, payment info',
    veilsub: 'No PII stored; on-chain records are ZK-shielded',
  },
  {
    feature: 'Renewal Tracking',
    patreon: 'Recurring billing reveals subscription duration',
    veilsub: 'Each renewal is an independent private transaction',
  },
  {
    feature: 'Audit Trail',
    patreon: 'Full history visible to platform & payment processor',
    veilsub: 'Scoped Audit Tokens reveal only what you choose',
  },
] as const

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Patreon vs VeilSub
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto">
            Traditional platforms expose your identity, payment history, and
            content preferences. VeilSub uses zero-knowledge proofs to keep
            every layer private.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm sm:text-base">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-white/50 font-medium w-[28%]">
                  Feature
                </th>
                <th className="px-4 py-3 text-left text-red-400/80 font-medium w-[36%]">
                  Patreon
                </th>
                <th className="px-4 py-3 text-left text-emerald-400/80 font-medium w-[36%]">
                  VeilSub
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td className="px-4 py-4 text-white font-medium align-top">
                    {row.feature}
                  </td>

                  {/* Patreon cell */}
                  <td className="px-4 py-4 text-white/60 align-top">
                    <span className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      {row.patreon}
                    </span>
                  </td>

                  {/* VeilSub cell */}
                  <td className="px-4 py-4 text-white/60 align-top">
                    <span className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {row.veilsub}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Explore Private Creators
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  )
}
