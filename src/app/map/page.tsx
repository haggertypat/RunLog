"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GpxMap, { BaseLayerId, QuadOverlay } from "@/app/log/GpxMap";
import { loadLogs } from "@/lib/storage";

type LatLngTuple = [number, number];
type QuadBounds = [number, number, number, number];
type QuadBorderCrop = [number, number, number, number];

type QuadOverlayConfig = QuadOverlay & {
  borderCrop?: QuadBorderCrop;
};

type QuadOverlayDebug = {
  source: "multi" | "single" | "none";
  parseWarning?: string;
};

type OverlayEditor = {
  id: string;
  imageUrl: string;
  boundsText: string;
  cropText: string;
};

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

async function cropQuadImageUrl(imageUrl: string, crop?: QuadBorderCrop): Promise<string> {
  if (!crop) return imageUrl;

  const image = new Image();
  image.crossOrigin = "anonymous";

  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load USGS quad image for border crop."));
    image.src = imageUrl;
  });

  const [top, right, bottom, left] = crop;
  const sourceX = Math.round(loadedImage.width * left);
  const sourceY = Math.round(loadedImage.height * top);
  const sourceWidth = Math.max(1, Math.round(loadedImage.width * (1 - left - right)));
  const sourceHeight = Math.max(1, Math.round(loadedImage.height * (1 - top - bottom)));

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to crop USGS quad image.");

  context.drawImage(loadedImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return canvas.toDataURL("image/png");
}

function parseQuadBorderCrop(value: unknown): QuadBorderCrop | undefined {
  const parts = Array.isArray(value) ? value.map((part) => Number(part)) : null;
  if (!parts || parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part >= 1)) return undefined;

  const [top, right, bottom, left] = parts;
  if (top + bottom >= 1 || left + right >= 1) return undefined;
  return [top, right, bottom, left];
}

function parseQuadBorderCropString(value: string | undefined): QuadBorderCrop | undefined {
  if (!value) return undefined;
  return parseQuadBorderCrop(value.split(",").map((part) => Number(part.trim())));
}

function unwrapWrappedJsonString(value: string): string {
  let normalized = value.trim();
  for (let index = 0; index < 2; index += 1) {
    const isSingleQuoted = normalized.startsWith("'") && normalized.endsWith("'");
    const isDoubleQuoted = normalized.startsWith('"') && normalized.endsWith('"');
    if (!isSingleQuoted && !isDoubleQuoted) break;
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

function parseQuadBounds(value: string | undefined): QuadBounds | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

function parseQuadOverlays(value: string | undefined): QuadOverlayConfig[] {
  if (!value?.trim()) return [];

  try {
    let parsed: unknown = JSON.parse(unwrapWrappedJsonString(value));
    if (typeof parsed === "string") parsed = JSON.parse(unwrapWrappedJsonString(parsed));

    const source =
      Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).overlays : null;

    if (!Array.isArray(source)) return [];

    return source
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl : null;
        const boundsSource = Array.isArray(record.bounds) ? record.bounds : null;
        if (!imageUrl || !boundsSource || boundsSource.length !== 4) return null;

        const bounds = boundsSource.map((part: unknown) => Number(part));
        if (bounds.some((part) => !Number.isFinite(part))) return null;

        return {
          imageUrl,
          bounds: [bounds[0], bounds[1], bounds[2], bounds[3]] as QuadBounds,
          opacity: 1,
          borderCrop: parseQuadBorderCrop(record.borderCrop),
        } as QuadOverlayConfig;
      })
      .filter((overlay): overlay is QuadOverlayConfig => Boolean(overlay));
  } catch {
    return [];
  }
}

function boundsToText(bounds: QuadBounds) {
  return `${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}`;
}

function cropToText(crop?: QuadBorderCrop) {
  if (!crop) return "0,0,0,0";
  return `${crop[0]},${crop[1]},${crop[2]},${crop[3]}`;
}

export default function MapPage() {
  const [segments, setSegments] = useState<LatLngTuple[][]>([]);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("usgsQuad");
  const [quadOverlays, setQuadOverlays] = useState<QuadOverlay[] | undefined>();
  const [quadOverlayStatus, setQuadOverlayStatus] = useState<string | null>(null);
  const [overlayEditors, setOverlayEditors] = useState<OverlayEditor[]>([]);
  const [overlayStatuses, setOverlayStatuses] = useState<Record<string, string | undefined>>({});

  const { configuredQuadOverlays, quadOverlayDebug } = useMemo(() => {
    const multiOverlayRaw = process.env.NEXT_PUBLIC_USGS_QUAD_OVERLAYS;
    const configuredOverlays = parseQuadOverlays(multiOverlayRaw);

    if (configuredOverlays.length) {
      return {
        configuredQuadOverlays: configuredOverlays,
        quadOverlayDebug: { source: "multi" } as QuadOverlayDebug,
      };
    }

    if (multiOverlayRaw?.trim()) {
      return {
        configuredQuadOverlays: undefined,
        quadOverlayDebug: {
          source: "none",
          parseWarning:
            "NEXT_PUBLIC_USGS_QUAD_OVERLAYS is set but no valid overlays were parsed. Confirm valid JSON and bounds format [south,west,north,east].",
        } as QuadOverlayDebug,
      };
    }

    const imageUrl = process.env.NEXT_PUBLIC_USGS_QUAD_IMAGE_URL;
    const bounds = parseQuadBounds(process.env.NEXT_PUBLIC_USGS_QUAD_BOUNDS);
    if (!imageUrl || !bounds) {
      return {
        configuredQuadOverlays: undefined,
        quadOverlayDebug: { source: "none" } as QuadOverlayDebug,
      };
    }

    return {
      configuredQuadOverlays: [
        {
          imageUrl,
          bounds,
          opacity: 1,
          borderCrop: parseQuadBorderCropString(process.env.NEXT_PUBLIC_USGS_QUAD_BORDER_CROP),
        },
      ],
      quadOverlayDebug: { source: "single" } as QuadOverlayDebug,
    };
  }, []);

  useEffect(() => {
    const logs = loadLogs();
    const nextSegments: LatLngTuple[][] = [];

    logs.forEach((log) => {
      if (!log.gpxData) return;
      nextSegments.push(...parseGpxSegments(log.gpxData));
    });

    setSegments(nextSegments);
  }, []);

  useEffect(() => {
    const editors = (configuredQuadOverlays ?? []).map((overlay, index) => ({
      id: `overlay-${index}`,
      imageUrl: overlay.imageUrl,
      boundsText: boundsToText(overlay.bounds),
      cropText: cropToText(overlay.borderCrop),
    }));
    setOverlayEditors(editors);
  }, [configuredQuadOverlays]);

  useEffect(() => {
    let cancelled = false;

    const process = async () => {
      if (!overlayEditors.length) {
        setQuadOverlays(undefined);
        setQuadOverlayStatus(quadOverlayDebug.parseWarning ?? null);
        return;
      }

      const nextStatuses: Record<string, string | undefined> = {};
      const processed: QuadOverlay[] = [];

      for (const editor of overlayEditors) {
        const imageUrl = editor.imageUrl.trim();
        const bounds = parseQuadBounds(editor.boundsText);
        if (!imageUrl || !bounds) {
          nextStatuses[editor.id] = "Invalid image URL or bounds format.";
          continue;
        }

        const crop = parseQuadBorderCropString(editor.cropText);

        try {
          const cropped = await cropQuadImageUrl(imageUrl, crop);
          processed.push({ imageUrl: cropped, bounds, opacity: 1 });
          nextStatuses[editor.id] = undefined;
        } catch (error) {
          processed.push({ imageUrl, bounds, opacity: 1 });
          const message = error instanceof Error ? error.message : "Unknown crop error.";
          nextStatuses[editor.id] = `Crop failed, using original image: ${message}`;
        }
      }

      if (cancelled) return;

      setOverlayStatuses(nextStatuses);
      setQuadOverlays(processed.length ? processed : undefined);
      setQuadOverlayStatus(quadOverlayDebug.parseWarning ?? null);
    };

    process();

    return () => {
      cancelled = true;
    };
  }, [overlayEditors, quadOverlayDebug.parseWarning]);

  const trackCount = useMemo(() => segments.length, [segments.length]);

  const generatedOverlayConfig = useMemo(() => {
    if (!overlayEditors.length) return "";

    const overlays = overlayEditors
      .map((editor) => {
        const imageUrl = editor.imageUrl.trim();
        const bounds = parseQuadBounds(editor.boundsText);
        if (!imageUrl || !bounds) return null;

        return {
          imageUrl,
          bounds,
          borderCrop: parseQuadBorderCropString(editor.cropText) ?? [0, 0, 0, 0],
        };
      })
      .filter((overlay) => overlay !== null);

    if (!overlays.length) return "";
    return JSON.stringify(overlays, null, 2);
  }, [overlayEditors]);

  const updateEditor = (id: string, patch: Partial<OverlayEditor>) => {
    setOverlayEditors((prev) => prev.map((editor) => (editor.id === id ? { ...editor, ...patch } : editor)));
  };

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
          <GpxMap segments={segments} baseLayer={baseLayer} quadOverlays={quadOverlays} heightClassName="h-[calc(100vh-13rem)]" />
          {baseLayer === "usgsQuad" && !overlayEditors.length ? (
            <span className="block text-xs text-amber-700 dark:text-amber-300">
              Configure custom quads with NEXT_PUBLIC_USGS_QUAD_OVERLAYS (JSON array) or fallback NEXT_PUBLIC_USGS_QUAD_IMAGE_URL +
              NEXT_PUBLIC_USGS_QUAD_BOUNDS. Optional crop: NEXT_PUBLIC_USGS_QUAD_BORDER_CROP=&quot;top,right,bottom,left&quot;.
            </span>
          ) : null}
          {baseLayer === "usgsQuad" ? (
            <span className="block text-xs text-stone-600 dark:text-stone-300">
              Overlay source: {quadOverlayDebug.source}; active overlays: {quadOverlays?.length ?? 0}.
            </span>
          ) : null}
          {baseLayer === "usgsQuad" && quadOverlayStatus ? (
            <span className="block text-xs text-amber-700 dark:text-amber-300">{quadOverlayStatus}</span>
          ) : null}
          {baseLayer === "usgsQuad" && overlayEditors.length ? (
            <div className="space-y-3 rounded border border-stone-300 bg-stone-50 p-3 text-xs dark:border-stone-600 dark:bg-stone-800/40">
              <p className="font-medium text-stone-800 dark:text-stone-100">Overlay helpers (adjust loaded overlays)</p>
              {overlayEditors.map((editor, index) => (
                <div key={editor.id} className="rounded border border-stone-300 bg-white p-2 dark:border-stone-600 dark:bg-stone-700/40">
                  <p className="mb-1 font-medium">Overlay {index + 1}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label>
                      Image URL
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                        value={editor.imageUrl}
                        onChange={(event) => updateEditor(editor.id, { imageUrl: event.target.value })}
                      />
                    </label>
                    <label>
                      Bounds [south,west,north,east]
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                        value={editor.boundsText}
                        onChange={(event) => updateEditor(editor.id, { boundsText: event.target.value })}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      Crop [top,right,bottom,left] (0-1 decimals)
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                        value={editor.cropText}
                        onChange={(event) => updateEditor(editor.id, { cropText: event.target.value })}
                      />
                    </label>
                  </div>
                  {overlayStatuses[editor.id] ? <p className="mt-2 text-amber-700 dark:text-amber-300">{overlayStatuses[editor.id]}</p> : null}
                </div>
              ))}
              {generatedOverlayConfig ? (
                <label className="block">
                  Generated NEXT_PUBLIC_USGS_QUAD_OVERLAYS value
                  <textarea
                    className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                    rows={10}
                    value={generatedOverlayConfig}
                    readOnly
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-200">
          No GPX data found yet. Save a log with GPX on <Link href="/log" className="underline">/log</Link> to see it here.
        </div>
      )}
    </section>
  );
}
