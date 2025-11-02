"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type RiskLevel = "low" | "medium" | "high" | null

export default function DemoSection() {
  const [coordinates, setCoordinates] = useState("-25.43, -49.27")
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate random risk level for demo
    const levels: RiskLevel[] = ["low", "medium", "high"]
    setRiskLevel(levels[Math.floor(Math.random() * levels.length)])
    setIsLoading(false)
  }

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-green-500/20 border-green-500/50 text-green-400"
      case "medium":
        return "bg-orange-500/20 border-orange-500/50 text-orange-400"
      case "high":
        return "bg-red-500/20 border-red-500/50 text-red-400"
      default:
        return ""
    }
  }

  const getRiskLabel = (level: RiskLevel) => {
    const labels: Record<RiskLevel, string> = {
      low: "Baixo Risco",
      medium: "Risco Médio",
      high: "Alto Risco",
      null: "",
    }
    return labels[level]
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Teste o GeoRisk</h2>
          <p className="text-lg text-muted-foreground text-balance">
            Digite coordenadas para analisar risco geográfico
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Coordenadas (latitude, longitude)
                </label>
                <Input
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder="-25.43, -49.27"
                  className="bg-background/50 border-border text-foreground"
                />
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isLoading ? "Analisando..." : "Analisar Risco"}
              </Button>

              {riskLevel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border-2 text-center ${getRiskColor(riskLevel)}`}
                >
                  <p className="font-semibold text-lg">{getRiskLabel(riskLevel)}</p>
                  <p className="text-sm mt-2 opacity-90">
                    {riskLevel === "low" && "Área com baixa probabilidade de alagamento ou deslizamento."}
                    {riskLevel === "medium" && "Área com moderada probabilidade de risco. Atenção recomendada."}
                    {riskLevel === "high" && "Área com alta probabilidade de risco. Evacuação recomendada."}
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Map placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-8"
        >
          <div className="relative w-full h-96 bg-card/30 border border-border rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-muted-foreground">Integração Mapbox GL JS</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
