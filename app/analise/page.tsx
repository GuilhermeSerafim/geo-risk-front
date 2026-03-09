import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import ThemeToggle from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import GeoRiskMap from "@/components/ui/GeoRiskMap"

export const metadata: Metadata = {
  title: "Analise interativa",
  description:
    "Execute analises geoespaciais com o motor de risco do GeoRisk usando mapa, raio customizavel e laudo tecnico.",
}

export default function AnalisePage() {
  return (
    <main className="min-h-dvh">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">GeoRisk</p>
            <h1 className="text-lg font-semibold md:text-xl">Analise de risco hidrologico</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar para landing
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto h-[calc(100dvh-77px)] w-full max-w-[1280px] p-4">
        <GeoRiskMap />
      </section>
    </main>
  )
}
