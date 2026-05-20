"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

type ReportPoint = {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  debris_type: string | null;
};

type CleanupRow = {
  id: string;
  geom_wkt: string;
  kg_collected: number;
};

function parsePolygonWKT(wkt: string): number[][] | null {
  // POLYGON((lon lat, lon lat, ...))
  const m = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
  if (!m) return null;
  return m[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat];
  });
}

async function fetchReports(bbox: [number, number, number, number]): Promise<ReportPoint[]> {
  try {
    const res = await fetch(`${API}/reports?bbox=${bbox.join(",")}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchCleanups(): Promise<CleanupRow[]> {
  try {
    const res = await fetch(`${API}/cleanups?limit=200`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default function ForecastMap({ day }: { day: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const style = maptilerKey
      ? `https://api.maptiler.com/maps/ocean/style.json?key=${maptilerKey}`
      : (FALLBACK_STYLE as unknown as maplibregl.StyleSpecification);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [120.5, 24.0],
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = "forecast-tiles";
    const sourceId = "forecast-src";

    const setupForecastLayer = () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      map.addSource(sourceId, {
        type: "raster",
        tiles: [`${API}/tiles/{z}/{x}/{y}.png?day=${day}`],
        tileSize: 256,
      });
      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: { "raster-opacity": 0.65 },
      });
    };

    if (map.isStyleLoaded()) {
      setupForecastLayer();
    } else {
      map.once("load", setupForecastLayer);
    }
  }, [day]);

  // Citizen-report points + cleanup polygons (loaded once after style ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupCommunityLayers = async () => {
      const bbox: [number, number, number, number] = [-180, -85, 180, 85];
      const [reports, cleanups] = await Promise.all([fetchReports(bbox), fetchCleanups()]);

      const reportsGeoJSON = {
        type: "FeatureCollection" as const,
        features: reports.map((r) => ({
          type: "Feature" as const,
          properties: { severity: r.severity, debris_type: r.debris_type ?? "", id: r.id },
          geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
        })),
      };

      const cleanupsGeoJSON = {
        type: "FeatureCollection" as const,
        features: cleanups
          .map((c) => {
            const coords = parsePolygonWKT(c.geom_wkt);
            if (!coords) return null;
            return {
              type: "Feature" as const,
              properties: { kg: c.kg_collected, id: c.id },
              geometry: { type: "Polygon" as const, coordinates: [coords] },
            };
          })
          .filter((f): f is NonNullable<typeof f> => Boolean(f)),
      };

      if (map.getLayer("reports-circles")) map.removeLayer("reports-circles");
      if (map.getSource("reports-src")) map.removeSource("reports-src");
      map.addSource("reports-src", { type: "geojson", data: reportsGeoJSON });
      map.addLayer({
        id: "reports-circles",
        type: "circle",
        source: "reports-src",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "severity"], 1, 4, 5, 11],
          "circle-color": "#0d9488",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });

      if (map.getLayer("cleanups-fill")) map.removeLayer("cleanups-fill");
      if (map.getLayer("cleanups-line")) map.removeLayer("cleanups-line");
      if (map.getSource("cleanups-src")) map.removeSource("cleanups-src");
      map.addSource("cleanups-src", { type: "geojson", data: cleanupsGeoJSON });
      map.addLayer({
        id: "cleanups-fill",
        type: "fill",
        source: "cleanups-src",
        paint: { "fill-color": "#fbbf24", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "cleanups-line",
        type: "line",
        source: "cleanups-src",
        paint: { "line-color": "#f59e0b", "line-width": 2 },
      });

      map.on("click", "reports-circles", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        new maplibregl.Popup()
          .setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<strong>${f.properties?.debris_type ?? "report"}</strong><br />severity ${f.properties?.severity ?? "?"}`,
          )
          .addTo(map);
      });
    };

    if (map.isStyleLoaded()) {
      void setupCommunityLayers();
    } else {
      map.once("load", () => void setupCommunityLayers());
    }
  }, []);

  return <div ref={containerRef} className="w-full h-[calc(100vh-64px)]" aria-label="Forecast map" />;
}
