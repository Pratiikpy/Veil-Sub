import { Newspaper, Shield, Lock } from 'lucide-react'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ScrollReveal'

const HEADING_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.1 } as const

const USE_CASES = [
  {
    icon: Newspaper,
    title: 'Journalism',
    description:
      'Subscribe to investigative reporters without your government tracking your reading habits.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/[0.06]',
    border: 'border-blue-500/15',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: Shield,
    title: 'Political Commentary',
    description:
      'Support voices you believe in without social consequences.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/[0.06]',
    border: 'border-violet-500/15',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: Lock,
    title: 'Sensitive Content',
    description:
      "Your subscriptions are your business. Nobody else's.",
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/[0.06]',
    border: 'border-emerald-500/15',
    iconBg: 'bg-emerald-500/10',
  },
] as const

export default function WhyPrivacyMatters() {
  return (
    <section className="py-20 lg:py-28 section-divider">
      <Container>
        <ScrollReveal>
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              Real-world privacy
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[44px] font-serif italic text-white"
              style={HEADING_STYLE}
            >
              Why Privacy Matters
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-xl mx-auto leading-relaxed">
              Privacy is not about having something to hide. It is about having the freedom to choose what you share.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {USE_CASES.map((item, i) => {
            const Icon = item.icon
            return (
              <ScrollReveal key={item.title} delay={i * 0.1}>
                <div
                  className={`relative p-6 sm:p-8 rounded-2xl ${item.bg} border ${item.border} hover:border-opacity-40 transition-all duration-300 h-full`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-5`}
                  >
                    <Icon className={`w-5 h-5 ${item.color}`} aria-hidden="true" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
