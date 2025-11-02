"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postRiskByCenterRadius, type RiskResponse } from "@/lib/api";
import ReactMarkdown from "react-markdown";

export default function DemoSection() {
  const [coordinates, setCoordinates] = useState("-25.43, -49.27");
  const [radius, setRadius] = useState(1000);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 traduz o backend (baixo/medio/alto) para cor
  const getRiskColor = (level: string | undefined) => {
    switch (level) {
      case "baixo":
        return "bg-green-500/20 border-green-500/50 text-green-400";
      case "medio":
        return "bg-orange-500/20 border-orange-500/50 text-orange-400";
      case "alto":
        return "bg-red-500/20 border-red-500/50 text-red-400";
      default:
        return "";
    }
  };

  const getRiskLabel = (level: string | undefined) => {
    switch (level) {
      case "baixo":
        return "Baixo Risco";
      case "medio":
        return "Risco Médio";
      case "alto":
        return "Alto Risco";
      default:
        return "";
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [latStr, lngStr] = coordinates.split(",").map((v) => v.trim());
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error("Coordenadas inválidas. Use 'lat, lng'.");
      }

      // 🔹 backend já retorna risk_level
      const data = await postRiskByCenterRadius({
        lat,
        lng,
        radiusMeters: radius,
      });

      setRiskData(data);
    } catch (err) {
      console.error(err);
      setRiskData(null);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Teste o GeoRisk</h2>
          <p className="text-lg text-muted-foreground">
            Digite coordenadas e raio para analisar o risco
          </p>
        </motion.div>

        <Card className="bg-card/50 backdrop-blur-sm border-border p-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Coordenadas (latitude, longitude)
                </label>
                <Input
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder="-25.43, -49.27"
                  className="bg-background/50 border-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Raio (m)</label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={radius}
                  onChange={(e) =>
                    setRadius(parseInt(e.target.value || "0", 10))
                  }
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? "Analisando..." : "Analisar Risco"}
            </Button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border-2 bg-red-500/20 border-red-500/50 text-red-400"
              >
                <p className="font-semibold text-sm">⚠️ Erro</p>
                <p className="text-sm mt-2">{error}</p>
              </motion.div>
            )}

            {/* 🔹 Se existir resposta, renderiza o resultado */}
            {riskData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border-2 ${getRiskColor(
                  riskData.risk_level
                )}`}
              >
                <p className="font-semibold text-lg text-center">
                  {getRiskLabel(riskData.risk_level)}
                </p>

                <div className="text-sm mt-3 space-y-1">
                  <p>
                    🌊 <strong>Rio mais próximo:</strong>{" "}
                    {riskData.rio_mais_proximo}
                  </p>
                  <p>
                    📏 <strong>Distância até o rio:</strong>{" "}
                    {riskData.distancia_rio_m.toFixed(1)} m
                  </p>
                  <p>
                    🧭 <strong>Queda relativa:</strong>{" "}
                    {riskData.queda_relativa_m ?? "N/A"} m
                  </p>
                </div>

                <div className="mt-2 leading-relaxed text-foreground/90 markdown-body">
                  <ReactMarkdown>{riskData.resposta_ia}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
