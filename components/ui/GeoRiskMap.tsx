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
  const [center, setCenter] = useState({ lng: -49.2415, lat: -25.4388 });

  // inicializa o mapa
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 15, // põe 15+ pra ver prédios logo de cara
      pitch: 60, // inclinação da câmera
      bearing: -20, // rotação
      antialias: true, // bordas mais suaves em extrusions
    });

    map.current.on("load", async () => {
      enable3D(map.current!); // ⬅️ ativa terrain + sky + prédios 3D
      await drawAndAnalyze(center, radius);

      map.current!.on("click", async (e) => {
        const next = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        setCenter(next);
        await drawAndAnalyze(next, radius);
      });
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

    if (map.current.getLayer("circle-outline")) {
      map.current.removeLayer("circle-outline");
    }
    if (map.current.getLayer("circle")) {
      map.current.removeLayer("circle");
    }
    if (map.current.getSource("circle")) {
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
  function enable3D(map: mapboxgl.Map) {
    // Adiciona terreno
    if (!map.getSource("mapbox-dem")) {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });

    // Adiciona o céu
    if (!map.getLayer("sky")) {
      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });
    }

    // Prédios 3D
    const layers = map.getStyle().layers ?? [];
    const labelLayerId = layers.find(
      (l: any) => l.type === "symbol" && l.layout && l.layout["text-field"]
    )?.id;

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
            "fill-extrusion-color": "#a8a29e",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );
    }

    map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
  }

  async function drawAndAnalyze(
    center: { lng: number; lat: number },
    radius: number
  ) {
    if (!map.current) return;
    setLoading(true);
    setRiskData(null);

    try {
      // 1️⃣ gera o círculo GeoJSON com Turf
      const circle = turf.circle([center.lng, center.lat], radius / 1000, {
        steps: 64,
        units: "kilometers",
      });

      // 2️⃣ adiciona ou atualiza a camada no mapa
      if (map.current.getSource("circle")) {
        (map.current.getSource("circle") as mapboxgl.GeoJSONSource).setData(
          circle as any
        );
      } else {
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
        map.current.addLayer({
          id: "circle-outline",
          type: "line",
          source: "circle",
          paint: {
            "line-color": "#1E90FF",
            "line-width": 2,
          },
        });
      }

      // 3️⃣ chama a API para análise de risco
      const data = await postRiskByCenterRadius({
        lat: center.lat,
        lng: center.lng,
        radiusMeters: radius,
      });

      // 4️⃣ atualiza UI e pinta o círculo conforme risco
      setRiskData(data);
      const color =
        data.risk_level === "baixo"
          ? "#22c55e"
          : data.risk_level === "medio"
          ? "#f59e0b"
          : "#ef4444";

      if (map.current.getLayer("circle")) {
        map.current.setPaintProperty("circle", "fill-color", color);
      }
      if (map.current.getLayer("circle-outline")) {
        map.current.setPaintProperty("circle-outline", "line-color", color);
      }
    } catch (err) {
      console.error("Erro em drawAndAnalyze:", err);
    } finally {
      setLoading(false);
    }
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

      {loading && (
        <p className="text-sm text-muted-foreground">Analisando...</p>
      )}

      {riskData && (
        <div className="p-4 w-full max-w-xl bg-card/50 border rounded-lg mt-4 text-sm">
          <p>
            🌍 <strong>Coordenadas:</strong> {coords?.lat.toFixed(4)},{" "}
            {coords?.lng.toFixed(4)}
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
