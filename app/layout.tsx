import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL("https://geo-risk-front.vercel.app"),
  title: {
    default: "GeoRisk | Inteligencia hidrologica para decisao rapida",
    template: "%s | GeoRisk",
  },
  description:
    "Plataforma de analise de risco hidrologico com modelo auditavel e dados geoespaciais para seguradoras, mercado imobiliario e gestao urbana.",
  applicationName: "GeoRisk",
  keywords: [
    "risco hidrologico",
    "analise geoespacial",
    "mapa de risco",
    "seguradoras",
    "mercado imobiliario",
    "flood risk",
    "climate risk",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    title: "GeoRisk | Inteligencia hidrologica para decisao rapida",
    description:
      "Risco geoespacial em segundos com score explicavel por topografia, agua e solo.",
    siteName: "GeoRisk",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoRisk",
    description:
      "Analise de risco hidrologico com motor auditavel para decisoes urbanas e securitarias.",
  },
  icons: {
    icon: "/logo2.png",
    shortcut: "/logo2.png",
    apple: "/logo2.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
