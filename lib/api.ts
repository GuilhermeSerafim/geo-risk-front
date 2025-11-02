import type { Feature, Polygon } from "geojson";
import { circle as turfCircle } from "@turf/turf";

export type RiskLevel = "baixo" | "medio" | "alto";

export type RiskResponse = {
  distancia_rio_m: number;
  queda_relativa_m: number | null;
  rio_mais_proximo: string;
  resposta_ia: string;
  risk_level: RiskLevel;
};

// ---- Type guard seguro: Feature<Polygon> vs Polygon
function isFeaturePolygon(
  p: Polygon | Feature<Polygon>
): p is Feature<Polygon> {
  return (p as Feature<Polygon>)?.type === "Feature" &&
         (p as Feature<Polygon>)?.geometry?.type === "Polygon";
}

// Envia um Polygon (ou Feature<Polygon>) direto pro /geo/risk
export async function postRiskPolygon(
  polygon: Polygon | Feature<Polygon>
): Promise<RiskResponse> {
  const geometry: Polygon = isFeaturePolygon(polygon)
    ? polygon.geometry
    : (polygon as Polygon);

  let apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL não está configurada. Crie .env(.local) com: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000"
    );
  }

  // Normaliza base: remove /docs e barras finais
  apiBaseUrl = apiBaseUrl.trim()
    .replace(/\/docs\/?$/, "")
    .replace(/\/+$/, "");

  const endpoint = process.env.NEXT_PUBLIC_API_RISK_ENDPOINT || "/geo/risk";
  const url = `${apiBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Opcional: desativa cache (útil se rodar em Server Components)
    cache: "no-store",
    body: JSON.stringify({ polygon: geometry }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const errorMessage = `Erro ${res.status} ao chamar ${url}${errorText ? ` - ${errorText}` : ""}`;
    console.error("❌ Erro na API:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = (await res.json()) as RiskResponse; // tipagem explícita
  return data;
}

// MVP: recebe lat/lng + raio em metros, gera um círculo (Polygon) e envia
export async function postRiskByCenterRadius(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<RiskResponse> {
  const { lat, lng, radiusMeters } = params;
  const circleFeature = turfCircle([lng, lat], radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  }); // Feature<Polygon>

  return postRiskPolygon(circleFeature.geometry);
}
