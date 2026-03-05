"use client";

import { useEffect, useMemo, useRef } from "react";

type LatLngTuple = [number, number];
type LatLngBoundsTuple = [number, number, number, number];

export type BaseLayerId = "osm" | "cartoLight" | "esriImagery" | "usgsTopo" | "usgsQuad";

export type QuadOverlay = {
  imageUrl: string;
  bounds: LatLngBoundsTuple;
  opacity?: number;
};

type GpxMapProps = {
  segments: LatLngTuple[][];
  baseLayer: BaseLayerId;
  quadOverlays?: QuadOverlay[];
  heightClassName?: string;
};

type LeafletNamespace = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom?: number },
  ) => { addTo: (map: LeafletMap) => void };
  polyline: (positions: LatLngTuple[], options: { color: string; weight: number }) => { addTo: (map: LeafletMap) => void };
  imageOverlay: (imageUrl: string, bounds: [LatLngTuple, LatLngTuple], options: { opacity: number }) => { addTo: (map: LeafletMap) => void };
};

type LeafletMap = {
  setView: (center: LatLngTuple, zoom: number) => void;
  remove: () => void;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const BASE_LAYER_CONFIG: Record<BaseLayerId, { url: string; attribution: string; maxZoom?: number }> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  cartoLight: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  esriImagery: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  usgsTopo: {
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    attribution: "USGS National Map",
    maxZoom: 16,
  },
  usgsQuad: {
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    attribution: "USGS National Map",
    maxZoom: 16,
  },
};

async function ensureLeaflet() {
  if (typeof window === "undefined") return;

  const hasCss = document.querySelector(`link[data-leaflet-css=\"true\"]`);
  if (!hasCss) {
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = LEAFLET_CSS;
    cssLink.dataset.leafletCss = "true";
    document.head.appendChild(cssLink);
  }

  if (window.L) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-leaflet-js=\"true\"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.leafletJs = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Leaflet."));
    document.body.appendChild(script);
  });
}

export default function GpxMap({ segments, baseLayer, quadOverlays, heightClassName = "h-72" }: GpxMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const layerConfig = useMemo(() => BASE_LAYER_CONFIG[baseLayer], [baseLayer]);

  useEffect(() => {
    if (!mapRef.current || !segments.length) return;

    let map: LeafletMap | null = null;
    let cancelled = false;

    const renderMap = async () => {
      await ensureLeaflet();
      if (cancelled || !window.L || !mapRef.current) return;

      map = window.L.map(mapRef.current);

      const initialPoint = segments.find((segment) => segment.length)?.[0];
      if (initialPoint) {
        map.setView(initialPoint, 13);
      }

      window.L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: layerConfig.maxZoom,
      }).addTo(map);

      if (baseLayer === "usgsQuad" && quadOverlays?.length) {
        quadOverlays.forEach((overlay) => {
          const [south, west, north, east] = overlay.bounds;
          window.L?.imageOverlay(overlay.imageUrl, [[south, west], [north, east]], {
            opacity: overlay.opacity ?? 1,
          }).addTo(map as LeafletMap);
        });
      }

      segments.forEach((segment) => {
        window.L?.polyline(segment, {
          color: "#0069a8",
          weight: 4,
        }).addTo(map as LeafletMap);
      });

    };

    renderMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [segments, layerConfig, baseLayer, quadOverlays]);

  return (
    <div
      ref={mapRef}
      className={`mt-2 w-full rounded border border-stone-300 dark:border-stone-600 ${heightClassName}`}
    />
  );
}
