"use client";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { useEffect, useRef, useState } from "react";
import { postRiskByCenterRadius } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function GeoRiskMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState({ lng: -49.2415, lat: -25.4388 });

  const [radius, setRadius] = useState(100);
  const radiusRef = useRef(radius);
  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    const next = { lng, lat };
    setCenter(next);
    setCoords({ lat, lng });
    await drawAndAnalyze(next, radiusRef.current);
  };

  // inicializa o mapa
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 15,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    // quando o mapa terminar de carregar
    map.current.on("load", async () => {
      enable3D(map.current!);
      await drawAndAnalyze(center, radiusRef.current);

      // ✅ registra o clique uma única vez, usando radiusRef
      map.current!.on("click", handleMapClick);
    });

    map.current.on("load", async () => {
      enable3D(map.current!);
      await drawAndAnalyze(center, radiusRef.current);

      // ✅ Geocoder - campo de busca de endereço
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken as string,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: "Buscar endereço ou bairro...",
      });
      map.current!.addControl(geocoder, "top-left");

      // quando o usuário escolhe um resultado
      geocoder.on("result", (e) => {
        const { center } = e.result; // [lng, lat]
        const next = { lng: center[0], lat: center[1] };
        setCenter(next);
        map.current!.flyTo({ center, zoom: 15, duration: 1000 });
        drawAndAnalyze(next, radiusRef.current);
      });

      // listener de clique continua
      map.current!.on("click", handleMapClick);
    });

    // ✅ cleanup — remove o listener ao desmontar
    return () => {
      map.current?.off("click", handleMapClick);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 🔁 redesenha automaticamente quando o raio mudar
  useEffect(() => {
    if (!map.current || !center) return;

    const timeout = setTimeout(() => {
      drawAndAnalyze(center, radius);
    }, 400); // pequeno atraso pra evitar reanálises rápidas

    return () => clearTimeout(timeout);
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
      <div className="flex flex-wrap items-center gap-4">
        {/* Campo de raio */}
        <div className="flex items-center gap-2">
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

        {/* Campo de coordenadas */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Coordenadas:</label>
          <input
            type="text"
            placeholder="-25.43, -49.27"
            className="px-2 py-1 border rounded-md bg-background border-border w-44"
            onBlur={(e) => {
              const [lat, lng] = e.target.value
                .split(",")
                .map((v) => parseFloat(v.trim()));
              if (!isNaN(lat) && !isNaN(lng)) {
                setCenter({ lat, lng });
                map.current?.flyTo({
                  center: [lng, lat],
                  zoom: 15,
                  duration: 1000,
                });
                drawAndAnalyze({ lng, lat }, radiusRef.current);
              }
            }}
          />
        </div>
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
          <p className="text-sm leading-relaxed">
            📊 <strong>Análise técnica:</strong>
          </p>

          <div className="mt-2 p-3 rounded-md bg-background/40 border border-border text-sm text-foreground/90 whitespace-pre-line">
            <ReactMarkdown>{riskData.resposta_ia}</ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}
