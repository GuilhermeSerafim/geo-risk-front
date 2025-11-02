import type { Feature, Polygon } from "geojson";
import { circle as turfCircle } from "@turf/turf";

export type RiskResponse = {
  distancia_rio_m: number;
  queda_relativa_m: number | null;
  rio_mais_proximo: string;
  resposta_ia: string;
};

// Envia um Polygon (ou Feature<Polygon>) direto pro /geo/risk
export async function postRiskPolygon(polygon: Polygon | Feature<Polygon>): Promise<RiskResponse> {
  // teu backend aceita geometry OU feature:
  // shape(req.polygon.get("geometry", req.polygon))
  // então pode mandar só geometry para manter simples:
  const body = {
    polygon: "type" in polygon && (polygon as any).type === "Feature"
      ? (polygon as Feature<Polygon>).geometry
      : (polygon as Polygon),
  };

  let apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL não está configurada. Crie um arquivo .env (ou .env.local) na raiz do projeto com: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000"
    );
  }

  // Normaliza a URL base: remove /docs se presente e remove barras no final
  apiBaseUrl = apiBaseUrl.trim();
  apiBaseUrl = apiBaseUrl.replace(/\/docs\/?$/, ""); // Remove /docs no final
  apiBaseUrl = apiBaseUrl.replace(/\/+$/, ""); // Remove barras no final

  // Permite configurar o endpoint via env, ou usa o padrão /geo/risk
  const endpoint = process.env.NEXT_PUBLIC_API_RISK_ENDPOINT || "/geo/risk";
  const url = `${apiBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  // Debug: log apenas em desenvolvimento
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Chamando API:", url);
    console.log("📦 Body:", JSON.stringify(body, null, 2));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const errorMessage = `Erro ${res.status} ao chamar ${url}${errorText ? ` - ${errorText}` : ""}`;
    console.error("❌ Erro na API:", errorMessage);
    throw new Error(errorMessage);
  }
  return res.json();
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
