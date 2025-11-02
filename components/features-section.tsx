"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

const features = [
  {
    icon: "🌧️",
    title: "Distância de Rios",
    description: "Análise da proximidade com corpos d'água e áreas de drenagem",
  },
  {
    icon: "⛰️",
    title: "Altitude e Declividade",
    description: "Avaliação do terreno para identificar áreas de risco de deslizamento",
  },
  {
    icon: "🧠",
    title: "Análise por IA",
    description: "Algoritmos avançados baseados em dados ambientais e históricos",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

export default function FeaturesSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-card/20 to-background" id="sobre-section">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Capacidades Principais</h2>
          <p className="text-lg text-muted-foreground text-balance">
            Entenda como o GeoRisk analisa riscos geográficos
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-accent/50 transition-colors h-full p-6 group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
