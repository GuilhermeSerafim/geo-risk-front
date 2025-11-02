"use client";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { useEffect, useRef, useState } from "react";
import { postRiskByCenterRadius } from "@/lib/api";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function GeoRiskMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [riskData, setRiskData] = useState<any>(null);
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);

  // inicializa o mapa
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-49.27, -25.43], // centro de Curitiba
      zoom: 12,
    });

    // adiciona interação de clique
    map.current.on("click", async (e) => {
      const { lat, lng } = e.lngLat;
      setCoords({ lat, lng });

      // desenha o círculo no mapa
      drawCircle(lng, lat, radius);

      // chama API
      setLoading(true);
      try {
        const data = await postRiskByCenterRadius({
          lat,
          lng,
          radiusMeters: radius,
        });
        setRiskData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  }, [radius]);

  // função pra desenhar o círculo (área de análise)
  function drawCircle(lng: number, lat: number, radius: number) {
    if (!map.current) return;

    const circle = turf.circle([lng, lat], radius / 1000, {
      steps: 64,
      units: "kilometers",
    });

    if (map.current.getLayer("circle")) {
      map.current.removeLayer("circle");
      map.current.removeSource("circle");
    }

    map.current.addSource("circle", { type: "geojson", data: circle });
    map.current.addLayer({
      id: "circle",
      type: "fill",
      source: "circle",
      paint: {
        "fill-color": "#0080ff",
        "fill-opacity": 0.25,
      },
    });

    // marcador no centro
    new mapboxgl.Marker({ color: "#1E90FF" })
      .setLngLat([lng, lat])
      .addTo(map.current);
  }

  return (
    <section className="w-full flex flex-col items-center gap-4 mt-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Raio (m):</label>
        <input
          type="number"
          className="px-2 py-1 border rounded-md bg-background border-border w-28"
          value={radius}
          min={100}
          step={100}
          onChange={(e) => setRadius(parseInt(e.target.value || "0", 10))}
        />
      </div>

      <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow-lg mt-4">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Analisando...</p>}

      {riskData && (
        <div className="p-4 w-full max-w-xl bg-card/50 border rounded-lg mt-4 text-sm">
          <p>
            🌍 <strong>Coordenadas:</strong>{" "}
            {coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}
          </p>
          <p>
            🌊 <strong>Rio mais próximo:</strong> {riskData.rio_mais_proximo}
          </p>
          <p>
            📏 <strong>Distância até o rio:</strong>{" "}
            {riskData.distancia_rio_m.toFixed(1)} m
          </p>
          <p>
            🧭 <strong>Queda relativa:</strong>{" "}
            {riskData.queda_relativa_m ?? "N/A"} m
          </p>
          <p>
            🧠 <strong>Nível de risco:</strong>{" "}
            <span
              className={`${
                riskData.risk_level === "baixo"
                  ? "text-green-400"
                  : riskData.risk_level === "medio"
                  ? "text-orange-400"
                  : "text-red-400"
              } font-semibold`}
            >
              {riskData.risk_level.toUpperCase()}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
