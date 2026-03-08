"use client"

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">GeoRisk</h3>
            <p className="text-muted-foreground text-sm">
              Análise inteligente de risco geográfico para cidades mais seguras
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  Preços
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  API
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:guilerstudies@gmail.com" className="hover:text-accent transition">
                  Sobre
                </a>
              </li>
              <li>
                <a href="mailto:guilerstudies@gmail.com" className="hover:text-accent transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="mailto:guilerstudies@gmail.com" className="hover:text-accent transition">
                  Contato
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition">
                  Privacidade
                </a>
              </li>
              <li>
                <a href="mailto:guilerstudies@gmail.com" className="hover:text-accent transition">
                  Termos
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© GeoRisk 2025. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-accent transition">
              Twitter
            </a>
            <a href="#" className="hover:text-accent transition">
              LinkedIn
            </a>
            <a href="#" className="hover:text-accent transition">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
