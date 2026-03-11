import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Logo } from "./logo"

const footerLinks = [
  { label: "Landing", href: "/" },
  { label: "Abrir analise", href: "/analise" },
  { label: "Contato", href: "mailto:guilerstudies@gmail.com?subject=Contato%20GeoRisk" },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6">

        <div className="flex flex-col gap-3  border-border/70 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} GeoRisk. Todos os direitos reservados.</p>

          <p className="flex flex-wrap items-center gap-2">
            <span>Criado por</span>
            <a
              href="https://portifolio-guiler.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="group relative inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors duration-300 hover:text-primary"
            >
              <span className="relative overflow-hidden rounded-full px-1.5 py-0.5">
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/25 to-teal-400/0 opacity-0 blur-[1px] transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
                <span className="relative block transition-transform duration-300 group-hover:-translate-y-0.5">
                  Guiler
                </span>
                <span className="absolute inset-x-1 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-cyan-400 via-sky-500 to-teal-400 transition-transform duration-300 group-hover:scale-x-100" />
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
