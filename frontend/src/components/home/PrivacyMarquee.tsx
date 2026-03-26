'use client'

import { ExternalLink } from 'lucide-react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/ScrollReveal'

const STATS = [
  { value: '2.33M', label: 'Users Exposed', source: 'Patreon 2015 breach' },
  { value: '$7.25M', label: 'VPPA Settlement', source: 'Patreon paid 2024' },
  { value: '55%', label: 'Would Pay for Privacy', source: 'Deloitte 2024' },
  { value: '$480B', label: 'Creator Economy', source: 'Projected by 2027' },
]

type Post = {
  platform: string
  sub: string
  body: string
  url?: string
}

const POSTS: Post[] = [
  {
    platform: 'Patreon',
    sub: 'r/patreon',
    body: '"A creator is revealing every tier member\'s name publicly. I didn\'t consent to being listed. This is a massive privacy violation."',
    url: 'https://www.reddit.com/r/patreon/comments/1brpfws/creator_is_revealing_every_tier_members_name/',
  },
  {
    platform: 'Patreon',
    sub: 'r/privacy',
    body: '"Is there a way to subscribe to a Patreon anonymously? I don\'t want the creator knowing my real name or linked social accounts."',
    url: 'https://www.reddit.com/r/privacy/comments/sx6eso/is_there_a_way_to_subscibe_to_a_patreon/',
  },
  {
    platform: 'Patreon',
    sub: 'r/patreon',
    body: '"New profiles on Patreon are PUBLIC by default — showing your subscription history. I had no idea I was being exposed until a friend found my profile."',
    url: 'https://www.reddit.com/r/patreon/comments/16p9c30/new_profiles_on_by_default_a_privacy_concern/',
  },
  {
    platform: 'Buy Me a Coffee',
    sub: 'r/stripe',
    body: '"Does Stripe Express through Buy Me a Coffee reveal the donor\'s real name to the creator? I want to support someone anonymously."',
    url: 'https://www.reddit.com/r/stripe/comments/1bt6qgu/does_stripe_express_through_buymeacoffee_reveal/',
  },
  {
    platform: 'OnlyFans',
    sub: 'r/AusFinance',
    body: '"OnlyFans shows up on bank statements as \'OF\' — mortgage broker asked me to explain every transaction. Humiliating. Had to cancel."',
  },
  {
    platform: 'Patreon',
    sub: 'Hacker News',
    body: '"Patreon\'s new public profiles feature puts your subscription list on a searchable page. Your employer can now see what creators you support."',
  },
  {
    platform: 'Ko-fi',
    sub: 'r/Kofi',
    body: '"Is there any way to donate on Ko-fi without the creator seeing your name? I want to support a friend but they\'d feel awkward knowing it was me."',
  },
  {
    platform: 'Ko-fi',
    sub: 'r/artbusiness',
    body: '"Ko-fi uses Stripe — which means the creator gets your full name and email. Found out my home address was visible to a creator I barely know."',
  },
  {
    platform: 'OnlyFans',
    sub: 'r/Marriage',
    body: '"My husband found out I subscribed to a creator because it appeared on our joint bank statement. I had no idea it wasn\'t discreet. Marriage counselling now."',
  },
  {
    platform: 'Substack',
    sub: 'r/Substack',
    body: '"Is it possible for users to access a list of subscribers or find out who is subscribed? I write under a pen name and do NOT want my readers to know each other."',
    url: 'https://www.reddit.com/r/Substack/comments/1kqa9q2/need_help_is_it_possible_for_users_to_access_a/',
  },
]

const PLATFORM_COLORS: Record<string, string> = {
  Patreon: 'text-orange-400',
  OnlyFans: 'text-blue-400',
  'Ko-fi': 'text-cyan-400',
  'Buy Me a Coffee': 'text-yellow-400',
  Substack: 'text-orange-300',
}

// Duplicate posts for seamless infinite scroll
const ALL_POSTS = [...POSTS, ...POSTS]

export default function PrivacyMarquee() {
  return (
    <section className="py-16 lg:py-20 section-divider overflow-hidden">
      <Container>
        <ScrollReveal>
          <div className="text-center mb-10">
            <Badge variant="accent">The Problem — In Their Own Words</Badge>
            <p className="mt-4 text-sm text-white/60 max-w-lg mx-auto">
              Real posts from Patreon, OnlyFans, Ko-fi users who discovered their subscriptions were never private.
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl glass p-4 text-center border border-red-500/[0.08] hover:border-red-500/[0.15] transition-colors duration-300"
              >
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium text-white/80 mt-0.5">{stat.label}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{stat.source}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </Container>

      {/* Full-width marquee breakout */}
      <div className="relative w-[100vw] left-1/2 -translate-x-1/2">
        {/* Side fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee-slow hover:[animation-play-state:paused]">
          {ALL_POSTS.map((post, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 mx-3 rounded-2xl glass p-5 relative overflow-hidden group"
            >
              {/* Red left accent */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-red-500/50 via-red-500/20 to-transparent rounded-l-2xl" />

              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className={`text-[11px] font-semibold ${PLATFORM_COLORS[post.platform] ?? 'text-white/60'}`}>
                    {post.platform}
                  </span>
                  <span className="text-[11px] text-white/50 ml-2">{post.sub}</span>
                </div>
                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-white/50 transition-colors"
                    aria-label="View original post"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <p className="text-xs text-white/70 leading-relaxed line-clamp-4">{post.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
