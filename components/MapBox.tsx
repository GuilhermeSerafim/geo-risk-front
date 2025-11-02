    "use client";
    import mapboxgl from "mapbox-gl";
    import { useEffect, useRef, useState } from "react";
    import * as turf from "@turf/turf";

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    export default function MapBox({ onSelect }: { onSelect: (data: any) => void }) {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [lng, setLng] = useState(-49.2733);
    const [lat, setLat] = useState(-25.4294);
    const [radius, setRadius] = useState(1000); // 1km

    useEffect(() => {
        if (map.current) return; // evita recriação
        if (!mapContainer.current) return;

        map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: 12,
        });

        // Clique no mapa → selecionar ponto
        map.current.on("click", (e) => {
        const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat, radius };
        onSelect(coords);
        drawCircle(coords);
        });
    }, []);

    function drawCircle({ lng, lat, radius }: { lng: number; lat: number; radius: number }) {
        if (!map.current) return;

        const circle = turf.circle([lng, lat], radius / 1000, { steps: 64, units: "kilometers" });
        if (map.current.getSource("circle")) map.current.removeLayer("circle");
        if (map.current.getSource("circle")) map.current.removeSource("circle");

        map.current.addSource("circle", { type: "geojson", data: circle });
        map.current.addLayer({
        id: "circle",
        type: "fill",
        source: "circle",
        paint: {
            "fill-color": "#0080ff",
            "fill-opacity": 0.2,
        },
        });
    }

    return (
        <div className="w-full h-[80vh]">
        <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
    }
