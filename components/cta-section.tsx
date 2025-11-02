"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CTASection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-primary/10 to-background">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Traga dados da sua cidade para o GeoRisk</h2>
          <p className="text-lg text-muted-foreground mb-8 text-balance">
            Proteja sua comunidade com análises de risco precisas e em tempo real
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Input
            type="email"
            placeholder="seu@email.com"
            className="bg-card/50 border-border text-foreground max-w-xs"
          />
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg">Entrar em Contato</Button>
        </motion.div>
      </div>
    </section>
  )
}
