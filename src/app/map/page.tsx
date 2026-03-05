"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GpxMap, { BaseLayerId } from "@/app/log/GpxMap";
import { loadLogs } from "@/lib/storage";

type LatLngTuple = [number, number];

const MAP_LAYER_OPTIONS: { id: BaseLayerId; label: string }[] = [
  { id: "osm", label: "OpenStreetMap" },
  { id: "cartoLight", label: "CARTO Positron" },
  { id: "esriImagery", label: "Esri Satellite" },
  { id: "usgsTopo", label: "USGS Topo" },
  { id: "usgsQuad", label: "USGS Quad (custom image overlay)" },
];

function parseGpxSegments(gpxData: string): LatLngTuple[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxData, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) return [];

  return Array.from(doc.getElementsByTagName("trkseg"))
    .map((segment) =>
      Array.from(segment.getElementsByTagName("trkpt"))
        .map((point) => {
          const lat = Number(point.getAttribute("lat"));
          const lon = Number(point.getAttribute("lon"));
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          return [lat, lon] as LatLngTuple;
        })
        .filter((point): point is LatLngTuple => point !== null),
    )
    .filter((segment) => segment.length > 0);
}

export default function MapPage() {
  const [segments, setSegments] = useState<LatLngTuple[][]>([]);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("usgsQuad");

  useEffect(() => {
    const logs = loadLogs();
    const nextSegments: LatLngTuple[][] = [];

    logs.forEach((log) => {
      if (!log.gpxData) return;
      nextSegments.push(...parseGpxSegments(log.gpxData));
    });

    setSegments(nextSegments);
  }, []);

  const trackCount = useMemo(() => segments.length, [segments.length]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">All GPX Tracks Map</h2>
          <p className="text-sm text-stone-600 dark:text-stone-300">Showing {trackCount} GPX track segment{trackCount === 1 ? "" : "s"} from saved logs.</p>
        </div>
        <Link href="/plan" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200">
          Back to plan
        </Link>
      </div>

      {segments.length ? (
        <>
          <label className="block text-sm">
            Map background
            <select
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
              value={baseLayer}
              onChange={(event) => setBaseLayer(event.target.value as BaseLayerId)}
            >
              {MAP_LAYER_OPTIONS.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.label}
                </option>
              ))}
            </select>
          </label>
          <GpxMap segments={segments} baseLayer={baseLayer} heightClassName="h-[calc(100vh-13rem)]" />
        </>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-200">
          No GPX data found yet. Save a log with GPX on <Link href="/log" className="underline">/log</Link> to see it here.
        </div>
      )}
    </section>
  );
}
