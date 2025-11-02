"use client"
import HeroSection from "@/components/hero-section"
import FeaturesSection from "@/components/features-section"
import DemoSection from "@/components/demo-section"
import CTASection from "@/components/cta-section"
import Footer from "@/components/footer"
import GeoRiskMap from "@/components/ui/GeoRiskMap"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <GeoRiskMap/>
      <CTASection />
      <Footer />
    </main>
  )
}
