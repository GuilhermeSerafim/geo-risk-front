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

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/geo/risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`/geo/risk falhou: ${res.status}`);
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
