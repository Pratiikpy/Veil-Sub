import dynamic from 'next/dynamic'
import PageTransition from '@/components/PageTransition'
import BackgroundOrbs from '@/components/home/BackgroundOrbs'
import HeroSection from '@/components/home/HeroSection'
import TrustTicker from '@/components/home/TrustTicker'

// Below-fold sections: code-split via dynamic() to reduce initial JS bundle size.
// The page is a Server Component so { ssr: false } cannot be used here; plain dynamic()
// still provides route-level code-splitting for the client-side JS of each section.
const ProblemSolution = dynamic(() => import('@/components/home/ProblemSolution'))
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'))
const PrivacyFeatures = dynamic(() => import('@/components/home/PrivacyFeatures'))
const ContractShowcase = dynamic(() => import('@/components/home/ContractShowcase'))
const ZeroKnowledgeVisual = dynamic(() => import('@/components/home/ZeroKnowledgeVisual'))
const PlatformComparison = dynamic(() => import('@/components/home/PlatformComparison'))
const ExploreCreators = dynamic(() => import('@/components/home/ExploreCreators'))
const ProtocolStats = dynamic(() => import('@/components/home/ProtocolStats'))
const FAQ = dynamic(() => import('@/components/home/FAQ'))
const CTASection = dynamic(() => import('@/components/home/CTASection'))

export default function HomePage() {
  return (
    <PageTransition className="min-h-screen">
      <BackgroundOrbs />
      <HeroSection />
      <TrustTicker />
      <ProblemSolution />
      <HowItWorks />
      <PrivacyFeatures />
      <ContractShowcase />
      <ZeroKnowledgeVisual />
      <PlatformComparison />
      <ExploreCreators />
      <ProtocolStats />
      <FAQ />
      <CTASection />
    </PageTransition>
  )
}
