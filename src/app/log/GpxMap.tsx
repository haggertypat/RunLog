"use client";

import { useEffect, useRef } from "react";

type LatLngTuple = [number, number];

type GpxMapProps = {
  segments: LatLngTuple[][];
};

type LeafletNamespace = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (url: string, options: { attribution: string }) => { addTo: (map: LeafletMap) => void };
  polyline: (positions: LatLngTuple[], options: { color: string; weight: number }) => { addTo: (map: LeafletMap) => void };
  latLngBounds: (positions: LatLngTuple[]) => unknown;
};

type LeafletMap = {
  fitBounds: (bounds: unknown, options: { padding: [number, number] }) => void;
  remove: () => void;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

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
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet.")));
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

export default function GpxMap({ segments }: GpxMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || !segments.length) return;

    let map: LeafletMap | null = null;

    const renderMap = async () => {
      await ensureLeaflet();

      if (!window.L || !mapRef.current) return;

      const routePoints = segments.flat();
      map = window.L.map(mapRef.current);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      segments.forEach((segment) => {
        window.L?.polyline(segment, {
          color: "#2563eb",
          weight: 4,
        }).addTo(map as LeafletMap);
      });

      const bounds = window.L.latLngBounds(routePoints);
      map.fitBounds(bounds, {
        padding: [24, 24],
      });
    };

    renderMap();

    return () => {
      map?.remove();
    };
  }, [segments]);

  return <div ref={mapRef} className="mt-2 h-72 w-full rounded border border-stone-300 dark:border-stone-600" />;
}
