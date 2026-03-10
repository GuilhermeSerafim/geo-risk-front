"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  Layers,
  MapPinned,
  ShieldAlert,
  Waves,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ThemeToggle from "@/components/theme-toggle"

const pipeline = [
  {
    title: "1. Captura geoespacial",
    description:
      "Recebe um poligono GeoJSON ou area por raio, identifica rios proximos e cria o contexto geografico da analise.",
  },
  {
    title: "2. Enriquecimento ambiental",
    description:
      "Cruza altitude (SRTM), solo (MapBiomas) e frequencia de agua com fallback de proximidade para rios canalizados.",
  },
  {
    title: "3. Motor de risco explicavel",
    description:
      "Aplica um algoritmo deterministico com pesos fixos, classificacao objetiva e historico persistido para auditoria.",
  },
  {
    title: "4. Entrega de laudo tecnico",
    description:
      "Retorna nivel de risco, distancia ao rio, queda relativa e explicacao em linguagem natural com contexto tecnico.",
  },
]

const riskWeights = [
  { label: "Topografia", value: "50%", note: "Distancia ao rio + queda relativa" },
  { label: "Agua", value: "30%", note: "Frequencia satelital + fallback de proximidade" },
  { label: "Solo", value: "20%", note: "Permeabilidade por classe ambiental" },
]

const transparencyNotes = [
  "Modelo atual usa SRTM 30m, com limite em micro-topografia urbana.",
  "Cobertura hidrografica depende da qualidade de mapeamento no OSM.",
  "Frequencia de agua usa MapBiomas e fallback quando rio canalizado nao aparece no satelite.",
]

/* ---- animation helpers ---- */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const viewportOnce = { once: true, margin: "-60px" as const }

export default function Home() {
  return (
    <main className="relative overflow-hidden pb-20">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -18, 12, 0], y: [0, 20, -8, 0], scale: [1, 0.94, 1.06, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 top-40 h-72 w-72 rounded-full bg-teal-300/50 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 14, -14, 0], y: [0, -12, 16, 0], scale: [1, 1.05, 0.97, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-sky-200/35 blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              GR
            </span>
            <span>GeoRisk</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#problema" className="hover:text-foreground transition-colors">
              Problema
            </a>
            <a href="#motor" className="hover:text-foreground transition-colors">
              Motor de risco
            </a>
            <a href="#stack" className="hover:text-foreground transition-colors">
              Stack tecnico
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/analise">Abrir analise</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-20 pt-16 md:grid-cols-[1.2fr_0.8fr] md:pt-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Deep Hazard Intelligence para risco hidrologico
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-balance md:text-6xl"
          >
            O risco real nao aparece em mapa parado no tempo.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            O GeoRisk transforma incerteza climatica em decisao tecnica em segundos.
            Cruzamos rios, relevo, solo e historico de agua para mostrar o que um mapa
            estatico nao enxerga: drenagens ocultas, vulnerabilidade local e risco auditavel.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/analise">
                Testar analise interativa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-7">
              <a href="mailto:guilerstudies@gmail.com?subject=Contato%20GeoRisk">
                Falar com o time
              </a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Card className="border-border/70 bg-card/85 shadow-xl shadow-primary/10">
            <CardHeader>
              <CardTitle>O que muda com GeoRisk</CardTitle>
              <CardDescription>
                Da leitura reativa para uma analise tecnica explicavel e reproducivel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="font-medium">Sem GeoRisk</p>
                <p className="mt-1 text-muted-foreground">
                  Decisoes baseadas em mapas historicos, sem leitura de rios canalizados e
                  pouca transparência sobre o risco calculado.
                </p>
              </div>
              <div className="rounded-lg border border-accent/40 bg-accent/15 p-4">
                <p className="font-medium">Com GeoRisk</p>
                <p className="mt-1 text-muted-foreground">
                  Score rastreavel por componente, contexto ambiental e laudo tecnico para
                  seguradoras, imobiliarias e gestores urbanos.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Problema / Solução */}
      <section id="problema" className="mx-auto w-full max-w-6xl px-4 py-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-2"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Card className="border-border/70 bg-card/85 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-primary" />
                  Problema
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                A analise de risco atual ainda depende de historico defasado e leitura manual.
                Isso deixa passar rios canalizados, solo impermeavel e mudancas urbanas recentes.
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Card className="border-border/70 bg-card/85 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-primary" />
                  Solucao
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                O GeoRisk gera uma analise espacial em tempo quase real com logica explicita:
                calcula risco por fatores tecnicos e entrega um resultado pronto para decisao.
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* Pipeline */}
      <section id="stack" className="mx-auto w-full max-w-6xl px-4 py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mb-7"
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Como a plataforma funciona
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-3 max-w-3xl text-muted-foreground"
          >
            Arquitetura orientada a rastreabilidade: cada etapa do resultado tem origem
            tecnica clara, do dado geoespacial ao laudo final.
          </motion.p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid gap-4 md:grid-cols-2"
        >
          {pipeline.map((step) => (
            <motion.div key={step.title} variants={fadeUp} transition={{ duration: 0.5 }}>
              <Card className="border-border/70 bg-card/80 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.description}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Motor de risco */}
      <section id="motor" className="mx-auto w-full max-w-6xl px-4 py-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Card className="border-border/70 bg-card/85 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Motor de risco auditavel
                </CardTitle>
                <CardDescription>
                  Formula principal: total = topografia x 0.50 + agua x 0.30 + solo x 0.20
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {riskWeights.map((weight, i) => (
                  <motion.div
                    key={weight.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="rounded-lg border border-border/70 bg-background/60 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {weight.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{weight.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{weight.note}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Card className="border-border/70 bg-card/85 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Transparencia tecnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {transparencyNotes.map((item, i) => (
                  <motion.p
                    key={item}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="rounded-md border border-border/70 bg-background/60 p-3"
                  >
                    {item}
                  </motion.p>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.7 }}
        className="mx-auto mt-14 w-full max-w-6xl px-4"
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/15 shadow-lg shadow-primary/10">
          <CardContent className="flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Pronto para decisao operacional
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-balance">
                Acesse a analise interativa e veja o risco por coordenada.
              </h3>
            </div>
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/analise">
                Ir para analise
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.section>
    </main>
  )
}
