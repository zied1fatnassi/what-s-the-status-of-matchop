import { useEffect } from 'react'
import { HeroSection } from '../components/landing/sections/HeroSection'
import { ProblemSection } from '../components/landing/sections/ProblemSection'
import { IdeaSection } from '../components/landing/sections/IdeaSection'
import { AiEngineSection } from '../components/landing/sections/AiEngineSection'
import { DiscoveryFeedSection } from '../components/landing/sections/DiscoveryFeedSection'
import { MatchMomentSection } from '../components/landing/sections/MatchMomentSection'
import { ChatConnectionSection } from '../components/landing/sections/ChatConnectionSection'
import { DualValueSection } from '../components/landing/sections/DualValueSection'
import { FinalCtaSection } from '../components/landing/sections/FinalCtaSection'
import { LandingFloatingDock } from '../components/landing/sections/LandingFloatingDock'
import { ScrollProgress } from '../components/landing/motion/ScrollProgress'
import './Landing.css'

/**
 * MatchOp Editorial Landing Experience
 * Inspired by Fixa Plan's visual hierarchy, typography scale, whitespace, and kinetic motion.
 */
function Landing() {
  useEffect(() => {
    document.title = 'MatchOp — Match the Opportunity | AI Career Discovery'
  }, [])

  return (
    <div className="landing-editorial-root">
      {/* Ambient Top Scroll Progress Bar */}
      <ScrollProgress />

      {/* 1. Hero: Kinetic Typography, Logo Animation, Dual CTAs */}
      <HeroSection />

      {/* 2. The Problem: The 200-CV Black Hole vs Mutual Discovery */}
      <ProblemSection />

      {/* 3. The MatchOp Paradigm: 3-Step Clean Workflow */}
      <IdeaSection />

      {/* 4. AI Matching Engine: Vector Similarity & Live Dynamic Score Demo */}
      <AiEngineSection />

      {/* 5. Discovery Feed: Real MatchOp Vertical Opportunity Stream Demo */}
      <DiscoveryFeedSection />

      {/* 6. The Match Moment: Cinematic Candidate + Company Convergence */}
      <MatchMomentSection />

      {/* 7. Chat & Direct Connection: Real-time 1:1 Messaging & Interview Scheduling */}
      <ChatConnectionSection />

      {/* 8. Dual Value Split: Sticky Left Column + Scrolling Feature Cards */}
      <DualValueSection />

      {/* 9. Final Cinematic CTA: Call to Action with Trust Signals */}
      <FinalCtaSection />

      {/* 10. Fixa-Style Floating Pill Dock */}
      <LandingFloatingDock />
    </div>
  )
}

export default Landing
