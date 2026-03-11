export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 bg-transparent">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} GeoRisk. Todos os direitos reservados.</p>

          <p className="flex items-center gap-1.5 sm:justify-end">
            <span>Criado por</span>
            <a
              href="https://portifolio-guiler.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="group relative font-medium text-foreground transition-colors duration-300 hover:text-primary"
            >
              <span className="relative">Guiler</span>
              <span className="absolute inset-x-0 bottom-[-2px] h-px origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
