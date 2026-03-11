import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import ThemeToggle from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import GeoRiskMap from "@/components/ui/GeoRiskMap"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Analise interativa",
  description:
    "Execute analises geoespaciais com o motor de risco do GeoRisk usando mapa, raio customizavel e laudo tecnico.",
}

export default function AnalisePage() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
          <div className="min-w-0 flex items-center gap-3">
            <Link href="/" className="hidden sm:block">
              <Logo width={36} height={36} showText={false} />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-border/60" />
            <h1 className="truncate text-base font-semibold md:text-xl">Analise hidrologica</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="icon" className="h-9 w-9">
              <Link href="/" aria-label="Voltar para landing page">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100dvh-60px)] w-full max-w-[1280px] flex-col p-0 sm:h-[calc(100dvh-77px)] sm:p-4">
        <GeoRiskMap />
      </section>
    </main>
  )
}
