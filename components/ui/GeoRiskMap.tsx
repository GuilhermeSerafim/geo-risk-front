"use client"

import mapboxgl from "mapbox-gl"
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"
import * as turf from "@turf/turf"
import {
  Box,
  Droplets,
  Eye,
  Layers,
  Loader2,
  Minimize2,
  Mountain,
  ShieldAlert,
  ShieldCheck,
  Waves,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import type { Feature, Polygon } from "geojson"

import { postRiskByCenterRadius, type RiskLevel, type RiskResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const DEFAULT_CENTER = { lng: -51.9253, lat: -14.235 }
const DEFAULT_RADIUS = 100
const MAX_RADIUS = 4000
const MIN_RADIUS = 100
const DAY_MAP_STYLE = "mapbox://styles/mapbox/streets-v12"
const DARK_MAP_STYLE = "mapbox://styles/mapbox/dark-v11"
const RISK_FACTOR_WEIGHTS = {
  topography: 0.5,
  water: 0.3,
  soil: 0.2,
} as const

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

type MapCenter = { lng: number; lat: number }

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0,
}
const USER_LOCATION_ZOOM = 16
const BRAZIL_OVERVIEW_ZOOM = 4.2
const AUTO_ANALYZE_DEDUP_WINDOW_MS = 4000

type InitialLocationResult = {
  center: MapCenter | null
  error: string | null
}

let initialLocationPromise: Promise<InitialLocationResult> | null = null
let cachedInitialLocationResult: InitialLocationResult | null = null
let lastAutoAnalyzeCenter: MapCenter | null = null
let lastAutoAnalyzeAt = 0

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Permissao de localizacao negada. Exibindo o mapa no Brasil."
  }
  if (error.code === error.TIMEOUT) {
    return "Tempo limite ao buscar localizacao. Exibindo o mapa no Brasil."
  }
  return "Nao foi possivel obter sua localizacao. Exibindo o mapa no Brasil."
}

function getInitialUserLocation() {
  if (cachedInitialLocationResult) {
    return Promise.resolve(cachedInitialLocationResult)
  }
  if (initialLocationPromise) {
    return initialLocationPromise
  }
  if (typeof window === "undefined" || !("geolocation" in window.navigator)) {
    const unsupportedResult: InitialLocationResult = {
      center: null,
      error: "Geolocalizacao indisponivel no navegador. Exibindo o mapa no Brasil.",
    }
    cachedInitialLocationResult = unsupportedResult
    return Promise.resolve(unsupportedResult)
  }

  initialLocationPromise = new Promise<InitialLocationResult>((resolve) => {
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const successResult: InitialLocationResult = {
          center: {
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          },
          error: null,
        }
        cachedInitialLocationResult = successResult
        resolve(successResult)
      },
      (geoError) => {
        const errorResult: InitialLocationResult = {
          center: null,
          error: getGeolocationErrorMessage(geoError),
        }
        cachedInitialLocationResult = errorResult
        resolve(errorResult)
      },
      GEOLOCATION_OPTIONS
    )
  }).finally(() => {
    initialLocationPromise = null
  })

  return initialLocationPromise
}

function shouldAutoAnalyze(center: MapCenter) {
  const now = Date.now()
  const hasSameCenter =
    lastAutoAnalyzeCenter !== null &&
    Math.abs(lastAutoAnalyzeCenter.lng - center.lng) < 0.000001 &&
    Math.abs(lastAutoAnalyzeCenter.lat - center.lat) < 0.000001

  if (hasSameCenter && now - lastAutoAnalyzeAt < AUTO_ANALYZE_DEDUP_WINDOW_MS) {
    return false
  }

  lastAutoAnalyzeCenter = center
  lastAutoAnalyzeAt = now
  return true
}

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
  const normalizedScore = normalizeScore(totalScore)
  if (normalizedScore === null) return undefined
  if (normalizedScore >= 0.7) return "alto"
  if (normalizedScore >= 0.4) return "medio"
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

function normalizeScore(score: number | null | undefined) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null
  const normalized = score <= 1 ? score : score / 100
  return Math.min(1, Math.max(0, normalized))
}

function toPercentage(score: number | null | undefined) {
  const normalized = normalizeScore(score)
  if (normalized === null) return null
  return Math.round(normalized * 100)
}

function formatPercent(score: number | null | undefined) {
  const percentage = toPercentage(score)
  if (percentage === null) return "-"
  return `${percentage}%`
}

function getRiskWidgetTone(isDarkMode: boolean) {
  if (isDarkMode) {
    return {
      shell:
        "border-slate-800 bg-[#111827] text-slate-50 shadow-[0_18px_50px_rgba(2,6,23,0.42)]",
      title: "text-slate-50",
      description: "text-slate-400",
      summaryBase: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900",
      eyebrow: "text-slate-400",
      copy: "text-slate-400",
      factorBase: "bg-slate-900/80 shadow-[inset_0_1px_0_rgba(148,163,184,0.04)]",
      factorTitle: "text-slate-100",
      factorSubtitle: "text-slate-400",
      impactBadge: "border-slate-700/80 bg-slate-950/80 text-slate-300",
      progressTrack: "bg-slate-800/90",
      progressLegend: "text-slate-500",
      divider: "border-slate-800/80",
      soilPermeable: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      soilImpermeable: "border-rose-400/20 bg-rose-400/10 text-rose-100",
      soilClass: "border-violet-400/20 bg-violet-400/10 text-violet-100",
    }
  }

  return {
    shell:
      "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
    title: "text-slate-900",
    description: "text-slate-500",
    summaryBase: "bg-gradient-to-br from-white via-slate-50 to-slate-100",
    eyebrow: "text-slate-500",
    copy: "text-slate-500",
    factorBase: "bg-white/95 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]",
    factorTitle: "text-slate-900",
    factorSubtitle: "text-slate-500",
    impactBadge: "border-slate-200 bg-slate-100/90 text-slate-600",
    progressTrack: "bg-slate-200/90",
    progressLegend: "text-slate-400",
    divider: "border-slate-200/80",
    soilPermeable: "border-emerald-200 bg-emerald-50 text-emerald-700",
    soilImpermeable: "border-rose-200 bg-rose-50 text-rose-700",
    soilClass: "border-violet-200 bg-violet-50 text-violet-700",
  }
}

function getScoreAppearance(score: number | null | undefined, isDarkMode: boolean) {
  const percentage = toPercentage(score)

  if (percentage === null) {
    return isDarkMode
      ? {
          label: "Aguardando leitura",
          text: "text-slate-200",
          badge: "border-slate-600/80 bg-slate-800/90 text-slate-300",
          fill: "from-slate-600 to-slate-500",
          panel: "border-slate-800 bg-slate-900/75",
          indicator: "border-slate-700/80 bg-slate-900/90 text-slate-300",
        }
      : {
          label: "Aguardando leitura",
          text: "text-slate-700",
          badge: "border-slate-300 bg-slate-100 text-slate-700",
          fill: "from-slate-400 to-slate-500",
          panel: "border-slate-200 bg-white",
          indicator: "border-slate-200 bg-slate-50 text-slate-600",
        }
  }

  if (percentage <= 30) {
    return isDarkMode
      ? {
          label: "Seguro",
          text: "text-emerald-300",
          badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
          fill: "from-emerald-500 via-emerald-400 to-emerald-300",
          panel: "border-emerald-400/15 bg-slate-900/75",
          indicator: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        }
      : {
          label: "Seguro",
          text: "text-emerald-700",
          badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
          fill: "from-emerald-500 via-teal-400 to-emerald-300",
          panel: "border-emerald-100 bg-emerald-50/40",
          indicator: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
  }

  if (percentage <= 60) {
    return isDarkMode
      ? {
          label: "Atencao",
          text: "text-amber-300",
          badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
          fill: "from-amber-500 via-amber-400 to-amber-300",
          panel: "border-amber-400/15 bg-slate-900/75",
          indicator: "border-amber-400/20 bg-amber-400/10 text-amber-200",
        }
      : {
          label: "Atencao",
          text: "text-amber-700",
          badge: "border-amber-200 bg-amber-50 text-amber-700",
          fill: "from-amber-500 via-yellow-400 to-amber-300",
          panel: "border-amber-100 bg-amber-50/40",
          indicator: "border-amber-200 bg-amber-50 text-amber-700",
        }
  }

  return isDarkMode
    ? {
        label: "Critico",
        text: "text-rose-300",
        badge: "border-rose-400/25 bg-rose-400/10 text-rose-100",
        fill: "from-rose-600 via-red-500 to-orange-400",
        panel: "border-rose-400/15 bg-slate-900/75",
        indicator: "border-rose-400/20 bg-rose-400/10 text-rose-200",
      }
    : {
        label: "Critico",
        text: "text-rose-700",
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        fill: "from-rose-500 via-red-500 to-orange-400",
        panel: "border-rose-100 bg-rose-50/40",
        indicator: "border-rose-200 bg-rose-50 text-rose-700",
      }
}

function getTotalScore(data: RiskResponse | null | undefined) {
  const apiTotal = normalizeScore(
    pickNumber(
      data?.score_total,
      data?.total_score,
      data?.risk_score,
      data?.score,
      data?.risk_calculation?.total_score
    )
  )

  if (apiTotal !== null) {
    return apiTotal
  }

  const topography = normalizeScore(
    pickNumber(
      data?.topografia_score,
      data?.topography_score,
      data?.risk_calculation?.component_scores?.topography
    )
  )
  const water = normalizeScore(
    pickNumber(
      data?.agua_score,
      data?.water_score,
      data?.risk_calculation?.component_scores?.water_frequency
    )
  )
  const soil = normalizeScore(
    pickNumber(
      data?.solo_score,
      data?.soil_score,
      data?.risk_calculation?.component_scores?.soil_permeability
    )
  )

  if (topography === null || water === null || soil === null) {
    return null
  }

  return (
    topography * RISK_FACTOR_WEIGHTS.topography +
    water * RISK_FACTOR_WEIGHTS.water +
    soil * RISK_FACTOR_WEIGHTS.soil
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
  const [mounted, setMounted] = useState(false)
  const effectiveResolvedTheme = mounted ? resolvedTheme : undefined
  const isDarkMode = effectiveResolvedTheme === "dark"
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapStyleRef = useRef<string>(DAY_MAP_STYLE)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const radiusRef = useRef(DEFAULT_RADIUS)
  const latestRequestRef = useRef(0)
  const hasResolvedInitialLocationRef = useRef(false)
  const userInitialCenterRef = useRef<MapCenter | null>(cachedInitialLocationResult?.center ?? null)

  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [riskData, setRiskData] = useState<RiskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(cachedInitialLocationResult?.error ?? null)
  const [hasSelection, setHasSelection] = useState(false)
  const [is3DMode, setIs3DMode] = useState(true)
  const [isDesktopAnalysisOpen, setIsDesktopAnalysisOpen] = useState(false)

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
  const statusBadgeLabel = isLocatingUser ? "Localizando voce..." : riskDisplay.label
  const showStatusSpinner = isLoading || isLocatingUser
  const desktopPanelId = "desktop-analysis-panel"
  const soilData = riskData?.environmental_data?.soil
  const widgetTone = getRiskWidgetTone(isDarkMode)
  type InsightBadge = {
    label: string
    className: string
    icon?: typeof Droplets
  }

  const soilBadges: InsightBadge[] = []

  if (typeof soilData?.is_permeable === "boolean") {
    soilBadges.push({
      label: soilData.is_permeable ? "Permeavel" : "Impermeavel",
      className: soilData.is_permeable ? widgetTone.soilPermeable : widgetTone.soilImpermeable,
      icon: Droplets,
    })
  }

  if (soilData?.class_name) {
    soilBadges.push({
      label: soilData.class_name,
      className: widgetTone.soilClass,
    })
  }

  const totalScoreAppearance = getScoreAppearance(totalScore, isDarkMode)
  const totalScorePercentage = toPercentage(totalScore)
  const SummaryIcon =
    totalScorePercentage === null ? Layers : totalScorePercentage > 60 ? ShieldAlert : ShieldCheck
  const riskFactors: Array<{
    id: string
    title: string
    weight: number
    score: number | null
    icon: typeof Mountain
    badges: InsightBadge[]
  }> = [
    {
      id: "topography",
      title: "Topografia",
      weight: 50,
      score: topographyScore,
      icon: Mountain,
      badges: [],
    },
    {
      id: "water",
      title: "Historico de agua",
      weight: 30,
      score: waterScore,
      icon: Waves,
      badges: [],
    },
    {
      id: "soil",
      title: "Solo",
      weight: 20,
      score: soilScore,
      icon: Layers,
      badges: soilBadges,
    },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

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
    const wrapper = document.createElement("div")
    wrapper.className = "relative flex items-center justify-center w-12 h-12 cursor-pointer group pointer-events-auto"
    wrapper.innerHTML = `
      <div class="absolute w-full h-full rounded-full opacity-25 animate-[ping_3s_ease-in-out_infinite] group-hover:opacity-40 transition-opacity" style="background-color: ${color};"></div>
      <div class="absolute inset-[8px] rounded-full border-2 border-white/60 shadow-[0_0_15px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-white/90" style="background-color: ${color}40;"></div>
      <div class="absolute inset-[15px] rounded-full transition-transform duration-300 group-hover:scale-95 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]" style="background-color: ${color}; box-shadow: 0 0 10px ${color};"></div>
      <div class="absolute inset-[21px] rounded-full bg-white shadow-sm"></div>
    `

    markerRef.current = new mapboxgl.Marker({ element: wrapper })
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

    const initialStyle = getMapStyle(effectiveResolvedTheme)
    mapStyleRef.current = initialStyle

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: BRAZIL_OVERVIEW_ZOOM,
      pitch: 58,
      bearing: -18,
      antialias: true,
    })

    mapRef.current = map
    let isMapDisposed = false

    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      const nextCenter = { lng: event.lngLat.lng, lat: event.lngLat.lat }
      setCenter(nextCenter)
      setHasSelection(true)
      void drawAndAnalyze(nextCenter, radiusRef.current)
    }

    const handleGeocoderResult = (event: { result?: { center?: [number, number] } }) => {
      const resultCenter = event.result?.center
      if (!resultCenter) return

      const nextCenter = { lng: resultCenter[0], lat: resultCenter[1] }
      setCenter(nextCenter)
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

      if (is3DMode) {
        enable3DMode()
      }

      if (hasResolvedInitialLocationRef.current) return
      hasResolvedInitialLocationRef.current = true

      setIsLocatingUser(true)
      setLocationError(null)

      void getInitialUserLocation().then((result) => {
        if (isMapDisposed || mapRef.current !== map) return

        setIsLocatingUser(false)
        setLocationError(result.error)

        if (!result.center) {
          return
        }

        userInitialCenterRef.current = result.center
        setCenter(result.center)
        setHasSelection(true)
        map.flyTo({
          center: [result.center.lng, result.center.lat],
          zoom: USER_LOCATION_ZOOM,
          duration: 900,
        })

        if (shouldAutoAnalyze(result.center)) {
          void drawAndAnalyze(result.center, DEFAULT_RADIUS)
        }
      })
    })

    return () => {
      isMapDisposed = true
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

    const nextStyle = getMapStyle(effectiveResolvedTheme)
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
  }, [effectiveResolvedTheme, hasSelection, center, radius, is3DMode, riskData, totalScore, isLoading, error])

  useEffect(() => {
    if (!riskData) {
      setIsDesktopAnalysisOpen(false)
    }
  }, [riskData])

  function handleRadiusChange(value: string) {
    setRadius(parseRadius(value))
  }

  function handleReset() {
    const map = mapRef.current
    const resetCenter = userInitialCenterRef.current ?? DEFAULT_CENTER
    const resetZoom = userInitialCenterRef.current ? USER_LOCATION_ZOOM : BRAZIL_OVERVIEW_ZOOM
    setCenter(resetCenter)
    setRadius(DEFAULT_RADIUS)
    setRiskData(null)
    setError(null)
    setHasSelection(false)
    setIs3DMode(false)
    setIsDesktopAnalysisOpen(false)
    latestRequestRef.current += 1

    if (!map) return

    map.flyTo({ center: [resetCenter.lng, resetCenter.lat], zoom: resetZoom, duration: 800 })
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

  const SidebarContent = (
    <div className="space-y-4">
      <Card className={cn("gap-4 overflow-hidden py-4 border-none lg:border-solid", widgetTone.shell)}>
        <CardHeader className="px-4">
          <CardTitle className={cn("text-base tracking-tight", widgetTone.title)}>Motor de risco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 text-sm">
          <div
            className={cn(
              "rounded-[1.25rem] border p-4",
              widgetTone.summaryBase,
              totalScoreAppearance.panel
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={cn("text-[11px] font-medium uppercase tracking-[0.24em]", widgetTone.eyebrow)}>
                  Nota de risco final
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <span className={cn("text-4xl font-semibold tracking-tight", totalScoreAppearance.text)}>
                    {formatPercent(totalScore)}
                  </span>
                  <span
                    className={cn(
                      "mb-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                      totalScoreAppearance.badge
                    )}
                  >
                    {totalScoreAppearance.label}
                  </span>
                </div>
                <p className={cn("mt-3 max-w-[28ch] text-xs leading-5", widgetTone.copy)}>
                  Media ponderada: Topografia 50%, Historico de agua 30% e Solo 20%.
                </p>
              </div>

              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                  totalScoreAppearance.indicator,
                  totalScorePercentage !== null && totalScorePercentage > 60 && "animate-pulse"
                )}
              >
                <SummaryIcon className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {riskFactors.map((factor) => {
              const appearance = getScoreAppearance(factor.score, isDarkMode)
              const Icon = factor.icon
              const percentage = toPercentage(factor.score) ?? 0

              return (
                <div
                  key={factor.id}
                  className={cn(
                    "rounded-[1.25rem] border p-4",
                    widgetTone.factorBase,
                    appearance.panel
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          appearance.indicator
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("font-medium", widgetTone.factorTitle)}>{factor.title}</p>
                        <p className={cn("mt-0.5 text-xs", widgetTone.factorSubtitle)}>
                          Leitura atual do fator
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        widgetTone.impactBadge
                      )}
                    >
                      Impacto: {factor.weight}%
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <span className={cn("text-2xl font-semibold tracking-tight", appearance.text)}>
                      {formatPercent(factor.score)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                        appearance.badge
                      )}
                    >
                      {appearance.label}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div
                      className={cn("h-2.5 overflow-hidden rounded-full", widgetTone.progressTrack)}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                      aria-label={`${factor.title} em ${percentage}%`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
                          appearance.fill
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div
                      className={cn("mt-2 flex items-center justify-between text-[11px]", widgetTone.progressLegend)}
                    >
                      <span>0% seguro</span>
                      <span>100% critico</span>
                    </div>
                  </div>

                  {factor.badges.length > 0 && (
                    <div className={cn("mt-3 flex flex-wrap gap-2 border-t pt-3", widgetTone.divider)}>
                      {factor.badges.map((badge) => {
                        const BadgeIcon = badge.icon

                        return (
                          <span
                            key={badge.label}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                            {badge.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mobile inline results below controls in drawer */}
      {riskData && (
        <div className="rounded-lg border border-border/80 bg-card/95 p-4 text-sm shadow-sm md:hidden mt-4">
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
  )

  return (
    <section className="grid h-full overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-2xl shadow-primary/10 lg:grid-cols-[360px_1fr] lg:grid-rows-1">
      <aside className="hidden overflow-y-auto border-r border-border/70 bg-background/90 p-4 lg:block">
        {SidebarContent}
      </aside>

      <div className="relative min-h-[360px] flex-1 overflow-hidden lg:min-h-0">
        <div ref={mapContainerRef} className="h-full w-full" />

        <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
              riskDisplay.pulse && "animate-pulse",
              riskDisplay.badge
            )}
          >
            {showStatusSpinner && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {statusBadgeLabel}
            {totalScore !== null ? ` | Score ${formatPercent(totalScore)}` : ""}
          </div>
        </div>

        <div
          className={cn(
            "absolute bottom-8 left-4 z-20 sm:bottom-8 sm:left-5",
            !hasSelection && "lg:bottom-32"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle3D}
            aria-label={is3DMode ? "Desativar modo 3D do mapa" : "Ativar modo 3D do mapa"}
            aria-pressed={is3DMode}
            className={cn(
              "group relative h-11 w-11 cursor-pointer overflow-hidden rounded-2xl border p-0 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:h-12 sm:w-12",
              is3DMode
                ? "border-sky-300/60 bg-[linear-gradient(145deg,rgba(14,165,233,0.96),rgba(34,211,238,0.86))] text-white shadow-[0_14px_30px_rgba(14,165,233,0.36),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_18px_36px_rgba(14,165,233,0.44),inset_0_1px_1px_rgba(255,255,255,0.52)]"
                : isDarkMode
                  ? "border-white/10 bg-slate-950/55 text-slate-300 shadow-[0_10px_22px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-sky-400/30 hover:bg-slate-900/75 hover:text-white"
                  : "border-slate-200/80 bg-white/82 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] hover:border-sky-300/60 hover:bg-white hover:text-slate-900"
            )}
            title={is3DMode ? "Desativar modo 3D" : "Ativar modo 3D"}
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-[1px] rounded-[15px] transition-opacity duration-300",
                is3DMode
                  ? "bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.36),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.22),transparent_58%)] opacity-100"
                  : "opacity-0"
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300",
                is3DMode
                  ? "opacity-100 shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset,0_0_22px_rgba(34,211,238,0.32)]"
                  : "opacity-0"
              )}
            />
            <Box
              className={cn(
                "relative h-5 w-5 transition-all duration-300 sm:h-[1.35rem] sm:w-[1.35rem]",
                is3DMode
                  ? "scale-100 drop-shadow-[0_4px_12px_rgba(8,47,73,0.42)]"
                  : "group-hover:scale-110"
              )}
            />
          </Button>
        </div>

        {/* MOBILE DRAWER TRIGGER */}
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 lg:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button size="lg" className="rounded-full px-6 shadow-xl min-h-[48px]">
                <Layers className="mr-2 h-4 w-4" />
                Motor de Risco
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle>Motor de Risco</DrawerTitle>
                <DrawerDescription>Deslize para ver os detalhes da leitura.</DrawerDescription>
              </DrawerHeader>
              <div className="overflow-y-auto p-4 pt-0">
                {SidebarContent}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {!hasSelection && (
          <div className="pointer-events-none hidden lg:block absolute bottom-8 left-3 z-20 max-w-xs rounded-lg border border-border/70 bg-background/90 p-3 text-sm text-muted-foreground shadow-lg lg:bottom-9 lg:left-4">
            {isLocatingUser
              ? "Detectando sua localizacao para iniciar automaticamente..."
              : locationError
                ? `${locationError} Clique no mapa para calcular o risco ou busque um endereco para iniciar.`
                : "Clique no mapa para calcular o risco ou busque um endereco para iniciar."}
          </div>
        )}

        {riskData && !isDesktopAnalysisOpen && (
          <div className="hidden lg:flex absolute bottom-8 right-8 z-20">
            <Button
              variant="outline"
              size="sm"
              aria-expanded={isDesktopAnalysisOpen}
              aria-controls={desktopPanelId}
              className={cn(
                "group h-12 rounded-full border px-5 cursor-pointer shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                isDarkMode
                  ? "border-white/10 bg-slate-950/60 text-slate-100 hover:border-sky-500/50 hover:bg-slate-900/80"
                  : "border-slate-200/80 bg-white/70 text-slate-800 hover:border-sky-400/50 hover:bg-white/90"
              )}
              onClick={() => setIsDesktopAnalysisOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="font-semibold tracking-tight">Ver Analise Completa</span>
            </Button>
          </div>
        )}

        {riskData && isDesktopAnalysisOpen && (
          <div
            id={desktopPanelId}
            className={cn(
              "hidden lg:flex flex-col absolute bottom-8 right-8 z-20 w-[440px] max-h-[80vh] rounded-[24px] border shadow-2xl backdrop-blur-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-8",
              isDarkMode 
                ? "border-white/10 bg-slate-950/75 shadow-black/80" 
                : "border-slate-200/60 bg-white/80 shadow-slate-300/50"
            )}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/10 shrink-0">
              <div className="flex items-center gap-3 w-full">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", totalScoreAppearance.indicator)}>
                  <SummaryIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-base font-semibold tracking-tight", isDarkMode ? "text-slate-100" : "text-slate-900")}>Analise de Risco</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", riskDisplay.pulse && "animate-pulse")} style={{ backgroundColor: riskDisplay.color }} />
                    <span className="text-xs font-medium text-muted-foreground truncate">{riskDisplay.label} {totalScore !== null && `· Score ${formatPercent(totalScore)}`}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar analise"
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full cursor-pointer ml-3 transition-all duration-200 hover:rotate-90",
                  isDarkMode ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-200/80 text-slate-500 hover:text-slate-900"
                )}
                onClick={() => setIsDesktopAnalysisOpen(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-3 mb-6">
                <div className={cn("flex flex-col gap-1 rounded-2xl border p-3", isDarkMode ? "border-white/5 bg-white/[0.02]" : "border-slate-200/50 bg-slate-50/50")}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Corpo d'Agua</span>
                  <span className={cn("text-sm font-semibold line-clamp-2 leading-tight break-words", isDarkMode ? "text-slate-200" : "text-slate-800")} title={riskData.rio_mais_proximo}>{riskData.rio_mais_proximo}</span>
                </div>
                <div className={cn("flex flex-col gap-1 rounded-2xl border p-3", isDarkMode ? "border-white/5 bg-white/[0.02]" : "border-slate-200/50 bg-slate-50/50")}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Distancia</span>
                  <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{riskData.distancia_rio_m.toFixed(1)}m</span>
                </div>
                <div className={cn("flex flex-col gap-1 rounded-2xl border p-3", isDarkMode ? "border-white/5 bg-white/[0.02]" : "border-slate-200/50 bg-slate-50/50")}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Elevacao</span>
                  <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                    {riskData.queda_relativa_m === null ? "N/A" : `${riskData.queda_relativa_m > 0 ? '+' : ''}${riskData.queda_relativa_m.toFixed(1)}m`}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                  <div className="h-px w-3 bg-muted-foreground/30"></div>
                  Sintese da Inteligencia
                  <div className="h-px flex-1 bg-muted-foreground/30"></div>
                </h4>
                <div className={cn(
                  "prose prose-sm max-w-none text-sm leading-relaxed",
                  isDarkMode 
                    ? "prose-invert prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300" 
                    : "prose-slate prose-p:text-slate-600 prose-strong:text-slate-900 prose-li:text-slate-600"
                )}>
                  <ReactMarkdown>{riskData.resposta_ia}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
