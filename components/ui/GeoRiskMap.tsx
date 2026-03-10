"use client"

import mapboxgl from "mapbox-gl"
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"
import * as turf from "@turf/turf"
import { AlertTriangle, Droplets, Layers, Loader2, Mountain, RotateCcw, Waves } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import type { Feature, Polygon } from "geojson"

import { postRiskByCenterRadius, type RiskLevel, type RiskResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const DEFAULT_CENTER = { lng: -49.2415, lat: -25.4388 }
const DEFAULT_RADIUS = 600
const MAX_RADIUS = 4000
const MIN_RADIUS = 100
const DAY_MAP_STYLE = "mapbox://styles/mapbox/streets-v12"
const DARK_MAP_STYLE = "mapbox://styles/mapbox/dark-v11"

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

type MapCenter = { lng: number; lat: number }

type Preset = {
  id: string
  title: string
  center: MapCenter
  radius: number
  note: string
}

const presets: Preset[] = [
  {
    id: "curitiba-centro",
    title: "Curitiba Centro",
    center: { lat: -25.4284, lng: -49.2733 },
    radius: 600,
    note: "Area urbana densa para baseline rapido.",
  },
  {
    id: "vila-olimpia",
    title: "Vila Olimpia",
    center: { lat: -23.5951, lng: -46.6862 },
    radius: 700,
    note: "Proximidade do Rio Pinheiros.",
  },
  {
    id: "morumbi",
    title: "Morumbi",
    center: { lat: -23.6176, lng: -46.7269 },
    radius: 800,
    note: "Area com variacao topografica relevante.",
  },
  {
    id: "manaus",
    title: "Manaus",
    center: { lat: -3.119, lng: -60.0217 },
    radius: 900,
    note: "Ambiente hidrologico de grande bacia.",
  },
]

type RiskDisplay = {
  label: string
  color: string
  badge: string
  pulse?: boolean
}

function normalizeRiskLevel(level: string | undefined): RiskLevel | undefined {
  if (!level) return undefined

  const normalized = level
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (normalized.startsWith("ba") || normalized === "low") return "baixo"
  if (normalized.startsWith("me") || normalized === "medium") return "medio"
  if (normalized.startsWith("al") || normalized === "high") return "alto"

  return undefined
}

function deriveRiskLevel(level: string | undefined, totalScore: number | null): RiskLevel | undefined {
  const normalizedLevel = normalizeRiskLevel(level)
  if (normalizedLevel) return normalizedLevel
  if (totalScore === null) return undefined
  if (totalScore >= 0.7) return "alto"
  if (totalScore >= 0.4) return "medio"
  return "baixo"
}

function getMapStyle(theme: string | undefined) {
  return theme === "dark" ? DARK_MAP_STYLE : DAY_MAP_STYLE
}

function getRiskDisplay(params: {
  level: RiskLevel | undefined
  isLoading: boolean
  hasSelection: boolean
  hasError: boolean
}): RiskDisplay {
  if (params.isLoading) {
    return {
      label: "Analisando...",
      color: "#0284c7",
      badge:
        "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
      pulse: true,
    }
  }

  if (params.hasError) {
    return {
      label: "Falha na analise",
      color: "#dc2626",
      badge:
        "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200",
    }
  }

  if (!params.hasSelection) {
    return {
      label: "Aguardando ponto",
      color: "#0284c7",
      badge:
        "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
      pulse: true,
    }
  }

  switch (params.level) {
    case "baixo":
      return {
        label: "Baixo risco",
        color: "#16a34a",
        badge:
          "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/60 dark:text-green-200",
      }
    case "medio":
      return {
        label: "Risco medio",
        color: "#d97706",
        badge:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
      }
    case "alto":
      return {
        label: "Alto risco",
        color: "#dc2626",
        badge:
          "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200",
      }
    default:
      return {
        label: "Classificacao pendente",
        color: "#0284c7",
        badge:
          "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-200",
      }
  }
}

function pickNumber(...values: Array<number | undefined | null>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

function formatPercent(score: number | null) {
  if (score === null) return "-"
  const normalized = score <= 1 ? score * 100 : score
  return `${Math.round(normalized)}%`
}

function getTotalScore(data: RiskResponse | null | undefined) {
  return pickNumber(
    data?.score_total,
    data?.total_score,
    data?.risk_score,
    data?.score,
    data?.risk_calculation?.total_score
  )
}

function parseRadius(inputValue: string) {
  const parsed = Number.parseInt(inputValue, 10)
  if (Number.isNaN(parsed)) {
    return MIN_RADIUS
  }
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, parsed))
}

export default function GeoRiskMap() {
  const { resolvedTheme } = useTheme()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapStyleRef = useRef<string>(DAY_MAP_STYLE)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const radiusRef = useRef(DEFAULT_RADIUS)
  const latestRequestRef = useRef(0)

  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [riskData, setRiskData] = useState<RiskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [is3DMode, setIs3DMode] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  const totalScore = getTotalScore(riskData)
  const normalizedRiskLevel = deriveRiskLevel(riskData?.risk_level, totalScore)
  const topographyScore = pickNumber(
    riskData?.topografia_score,
    riskData?.topography_score,
    riskData?.risk_calculation?.component_scores?.topography
  )
  const waterScore = pickNumber(
    riskData?.agua_score,
    riskData?.water_score,
    riskData?.risk_calculation?.component_scores?.water_frequency
  )
  const soilScore = pickNumber(
    riskData?.solo_score,
    riskData?.soil_score,
    riskData?.risk_calculation?.component_scores?.soil_permeability
  )
  const riskDisplay = getRiskDisplay({
    level: normalizedRiskLevel,
    isLoading,
    hasSelection,
    hasError: Boolean(error),
  })

  function clearCircleLayers() {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer("analysis-circle-outline")) {
      map.removeLayer("analysis-circle-outline")
    }
    if (map.getLayer("analysis-circle")) {
      map.removeLayer("analysis-circle")
    }
    if (map.getSource("analysis-circle")) {
      map.removeSource("analysis-circle")
    }
  }

  function drawCircle(nextCenter: MapCenter, nextRadius: number, color: string) {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const circle = turf.circle([nextCenter.lng, nextCenter.lat], nextRadius / 1000, {
      steps: 64,
      units: "kilometers",
    })

    if (map.getSource("analysis-circle")) {
      ;(map.getSource("analysis-circle") as mapboxgl.GeoJSONSource).setData(circle as Feature<Polygon>)
    } else {
      map.addSource("analysis-circle", { type: "geojson", data: circle })
      map.addLayer({
        id: "analysis-circle",
        type: "fill",
        source: "analysis-circle",
        paint: {
          "fill-color": color,
          "fill-opacity": 0.18,
        },
      })
      map.addLayer({
        id: "analysis-circle-outline",
        type: "line",
        source: "analysis-circle",
        paint: {
          "line-color": color,
          "line-width": 2,
        },
      })
    }

    map.setPaintProperty("analysis-circle", "fill-color", color)
    map.setPaintProperty("analysis-circle-outline", "line-color", color)

    markerRef.current?.remove()
    markerRef.current = new mapboxgl.Marker({ color })
      .setLngLat([nextCenter.lng, nextCenter.lat])
      .addTo(map)
  }

  function disable3DMode() {
    const map = mapRef.current
    if (!map) return

    map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
    map.setTerrain(null)
    if (map.getLayer("3d-buildings")) {
      map.removeLayer("3d-buildings")
    }
    if (map.getLayer("sky")) {
      map.removeLayer("sky")
    }
  }

  function enable3DMode() {
    const map = mapRef.current
    if (!map) return

    if (!map.getSource("mapbox-dem")) {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      })
    }

    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.35 })

    if (!map.getLayer("sky")) {
      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0, 0],
          "sky-atmosphere-sun-intensity": 18,
        },
      })
    }

    const layers = map.getStyle().layers ?? []
    const labelLayerId = layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id

    if (!map.getLayer("3d-buildings")) {
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#6b7280",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.62,
          },
        },
        labelLayerId
      )
    }

    map.easeTo({ pitch: 58, bearing: -18, duration: 800 })
  }

  async function drawAndAnalyze(nextCenter: MapCenter, nextRadius: number) {
    const map = mapRef.current
    if (!map) return

    const requestId = ++latestRequestRef.current
    setIsLoading(true)
    setError(null)

    drawCircle(nextCenter, nextRadius, "#0284c7")

    try {
      const data = await postRiskByCenterRadius({
        lat: nextCenter.lat,
        lng: nextCenter.lng,
        radiusMeters: nextRadius,
      })

      if (requestId !== latestRequestRef.current) return

      setRiskData(data)
      const dataLevel = deriveRiskLevel(data.risk_level, getTotalScore(data))
      const dataColor = getRiskDisplay({
        level: dataLevel,
        isLoading: false,
        hasSelection: true,
        hasError: false,
      }).color
      drawCircle(nextCenter, nextRadius, dataColor)
    } catch (apiError) {
      if (requestId !== latestRequestRef.current) return

      setRiskData(null)
      setError(apiError instanceof Error ? apiError.message : "Falha ao consultar a API de risco.")
      drawCircle(nextCenter, nextRadius, "#64748b")
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    radiusRef.current = radius
  }, [radius])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    if (!MAPBOX_TOKEN) {
      setError("NEXT_PUBLIC_MAPBOX_TOKEN nao configurado. Defina no .env para renderizar o mapa.")
      return
    }

    const initialStyle = getMapStyle(resolvedTheme)
    mapStyleRef.current = initialStyle

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 13.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
    })

    mapRef.current = map

    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      const nextCenter = { lng: event.lngLat.lng, lat: event.lngLat.lat }
      setCenter(nextCenter)
      setSelectedPresetId(null)
      setHasSelection(true)
      void drawAndAnalyze(nextCenter, radiusRef.current)
    }

    const handleGeocoderResult = (event: { result?: { center?: [number, number] } }) => {
      const resultCenter = event.result?.center
      if (!resultCenter) return

      const nextCenter = { lng: resultCenter[0], lat: resultCenter[1] }
      setCenter(nextCenter)
      setSelectedPresetId(null)
      setHasSelection(true)
      map.flyTo({ center: resultCenter, zoom: 14.5, duration: 900 })
      void drawAndAnalyze(nextCenter, radiusRef.current)
    }

    map.on("load", () => {
      map.on("click", handleMapClick)

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken as string,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: "Busque endereco, bairro ou coordenada...",
      })

      geocoder.on("result", handleGeocoderResult)
      map.addControl(geocoder, "top-left")
    })

    return () => {
      map.off("click", handleMapClick)
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hasSelection) return

    const timeout = window.setTimeout(() => {
      void drawAndAnalyze(center, radius)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [radius])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextStyle = getMapStyle(resolvedTheme)
    if (nextStyle === mapStyleRef.current) return

    mapStyleRef.current = nextStyle
    map.setStyle(nextStyle)

    map.once("style.load", () => {
      const level = deriveRiskLevel(riskData?.risk_level, totalScore)
      const color = getRiskDisplay({
        level,
        isLoading,
        hasSelection,
        hasError: Boolean(error),
      }).color

      if (hasSelection) {
        drawCircle(center, radius, color)
      }

      if (is3DMode) {
        enable3DMode()
      }
    })
  }, [resolvedTheme, hasSelection, center, radius, is3DMode, riskData, totalScore, isLoading, error])

  function applyPreset(preset: Preset) {
    const map = mapRef.current
    if (!map) return

    setSelectedPresetId(preset.id)
    setCenter(preset.center)
    setRadius(preset.radius)
    setHasSelection(true)
    map.flyTo({ center: [preset.center.lng, preset.center.lat], zoom: 14.5, duration: 850 })
    void drawAndAnalyze(preset.center, preset.radius)
  }

  function handleRadiusChange(value: string) {
    setRadius(parseRadius(value))
  }

  function handleReset() {
    const map = mapRef.current
    setCenter(DEFAULT_CENTER)
    setRadius(DEFAULT_RADIUS)
    setRiskData(null)
    setError(null)
    setHasSelection(false)
    setSelectedPresetId(null)
    setIs3DMode(false)
    latestRequestRef.current += 1

    if (!map) return

    map.flyTo({ center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: 13.5, duration: 800 })
    disable3DMode()
    clearCircleLayers()
    markerRef.current?.remove()
    markerRef.current = null
  }

  function toggle3D() {
    const map = mapRef.current
    if (!map) return

    const nextMode = !is3DMode
    setIs3DMode(nextMode)
    if (nextMode) {
      enable3DMode()
    } else {
      disable3DMode()
    }
  }

  return (
    <section className="grid h-full overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-2xl shadow-primary/10 lg:grid-cols-[360px_1fr] lg:grid-rows-1">
      <aside className="overflow-y-auto border-b border-border/70 bg-background/90 p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <Card className="gap-4 border-border/70 bg-card/95 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Controles da analise</CardTitle>
              <CardDescription>
                Clique no mapa, use presets ou busque endereco para gerar uma nova leitura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Raio de analise (m)
                </label>
                <Input
                  type="number"
                  min={MIN_RADIUS}
                  max={MAX_RADIUS}
                  step={100}
                  value={radius}
                  onChange={(event) => handleRadiusChange(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={is3DMode ? "default" : "outline"}
                  onClick={toggle3D}
                  className="w-full"
                >
                  {is3DMode ? "Desativar 3D" : "Ativar 3D"}
                </Button>
                <Button variant="outline" onClick={handleReset} className="w-full">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 border-border/70 bg-card/95 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Presets de teste</CardTitle>
              <CardDescription>Cenarios rapidos para comparar leitura hidrologica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    selectedPresetId === preset.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/70 bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-sm font-medium">{preset.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.note}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-3 border-border/70 bg-card/95 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Status atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <p>
                Centro: <span className="font-medium">{center.lat.toFixed(5)}</span>,{" "}
                <span className="font-medium">{center.lng.toFixed(5)}</span>
              </p>
              <p>
                Raio: <span className="font-medium">{radius} m</span>
              </p>
              {isLoading && (
                <p className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando area...
                </p>
              )}
              {error && (
                <p className="inline-flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              {!isLoading && !error && !hasSelection && (
                <p className="text-muted-foreground">
                  Selecione um ponto para iniciar a analise.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3 border-border/70 bg-card/95 py-4 shadow-none">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Motor de risco</CardTitle>
 
            </CardHeader>
            <CardContent className="space-y-2 px-4 text-sm">
              <div className="rounded-md border border-border/70 bg-background/70 p-2">
                <p className="mb-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mountain className="h-3.5 w-3.5" />
                  Topografia (50%)
                </p>
                <p className="font-medium">{formatPercent(topographyScore)}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/70 p-2">
                <p className="mb-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Waves className="h-3.5 w-3.5" />
                  Agua (30%)
                </p>
                <p className="font-medium">{formatPercent(waterScore)}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/70 p-2">
                <p className="mb-1 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Solo (20%)
                </p>
                <p className="font-medium">{formatPercent(soilScore)}</p>
              </div>

              {riskData?.environmental_data?.soil && (
                <div className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="mb-1.5 text-xs text-muted-foreground flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    Permeabilidade do solo
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      riskData.environmental_data.soil.is_permeable
                        ? "border border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/60 dark:text-green-300"
                        : "border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-300"
                    )}
                  >
                    {riskData.environmental_data.soil.is_permeable ? "Permeavel" : "Impermeavel"}
                  </span>
                  {riskData.environmental_data.soil.class_name && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Classe: {riskData.environmental_data.soil.class_name}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>

      <div className="relative min-h-[360px] overflow-hidden lg:min-h-0">
        <div ref={mapContainerRef} className="h-full w-full" />

        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-end">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
              riskDisplay.pulse && "animate-pulse",
              riskDisplay.badge
            )}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {riskDisplay.label}
            {totalScore !== null ? ` | Score ${formatPercent(totalScore)}` : ""}
          </div>
        </div>

        {!hasSelection && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-xs rounded-lg border border-border/70 bg-background/90 p-3 text-sm text-muted-foreground shadow-lg">
            Clique no mapa para calcular o risco ou use um preset para iniciar.
          </div>
        )}

        {riskData && (
          <div className="absolute bottom-3 right-3 z-20 w-[calc(100%-1.5rem)] max-w-md rounded-lg border border-border/80 bg-card/95 p-4 text-sm shadow-xl">
            <p className="text-sm">
              <span className="font-semibold">Rio mais proximo:</span> {riskData.rio_mais_proximo}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">Distancia:</span> {riskData.distancia_rio_m.toFixed(1)} m
            </p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">Queda relativa:</span>{" "}
              {riskData.queda_relativa_m === null ? "N/A" : `${riskData.queda_relativa_m.toFixed(2)} m`}
            </p>


            <div className="markdown-body mt-3 max-h-40 overflow-y-auto rounded-md border border-border/70 bg-background/70 p-3 text-sm leading-relaxed">
              <ReactMarkdown>{riskData.resposta_ia}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
