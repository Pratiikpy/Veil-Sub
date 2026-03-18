import dynamic from 'next/dynamic'
import PageTransition from '@/components/PageTransition'
import BackgroundOrbs from '@/components/home/BackgroundOrbs'
import HeroSection from '@/components/home/HeroSection'

// Below-fold sections: code-split via dynamic() to reduce initial JS bundle size.
const ProblemSolution = dynamic(() => import('@/components/home/ProblemSolution'))
const PlatformComparison = dynamic(() => import('@/components/home/PlatformComparison'))
const ExploreCreators = dynamic(() => import('@/components/home/ExploreCreators'))
const CTASection = dynamic(() => import('@/components/home/CTASection'))

export default function HomePage() {
  return (
    <PageTransition className="min-h-screen">
      <BackgroundOrbs />
      <HeroSection />
      <ProblemSolution />
      <PlatformComparison />
      <ExploreCreators />
      <CTASection />
    </PageTransition>
  )
}
