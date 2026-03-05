"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanItemById } from "@/lib/plan";
import { addLog, deleteLog, loadLogs, updateLog } from "@/lib/storage";
import { LogEntry, PlanItemType } from "@/lib/types";
import Link from "next/link";
import dynamic from "next/dynamic";
import ElevationChart from "@/app/log/ElevationChart";

type LatLngTuple = [number, number];
type ElevationPoint = { distanceMi: number; elevationFt: number };

const GpxMap = dynamic(() => import("@/app/log/GpxMap"), {
  ssr: false,
});

type BaseLayerId = "osm" | "cartoLight" | "esriImagery" | "usgsTopo" | "usgsQuad";
type QuadBounds = [number, number, number, number];
type QuadBorderCrop = [number, number, number, number];
const MAP_LAYER_OPTIONS: { id: BaseLayerId; label: string }[] = [
  { id: "osm", label: "OpenStreetMap" },
  { id: "cartoLight", label: "CARTO Positron" },
  { id: "esriImagery", label: "Esri Satellite" },
  { id: "usgsTopo", label: "USGS Topo" },
  { id: "usgsQuad", label: "USGS Quad (custom image overlay)" },
];

type QuadOverlay = {
  imageUrl: string;
  bounds: QuadBounds;
  opacity?: number;
  borderCrop?: QuadBorderCrop;
};

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
  if (!parts || parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part >= 1)) {
    return undefined;
  }

  const [top, right, bottom, left] = parts;
  if (top + bottom >= 1 || left + right >= 1) return undefined;
  return [top, right, bottom, left];
}

function parseQuadBorderCropString(value: string | undefined): QuadBorderCrop | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((part) => Number(part.trim()));
  return parseQuadBorderCrop(parts);
}

function parseQuadOverlays(value: string | undefined): QuadOverlay[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const overlays: QuadOverlay[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const itemRecord = item as Record<string, unknown>;

      const imageUrl = typeof itemRecord.imageUrl === "string" ? itemRecord.imageUrl : null;
      const boundsSource = Array.isArray(itemRecord.bounds) ? itemRecord.bounds : null;

      if (!imageUrl || !boundsSource || boundsSource.length !== 4) continue;

      const bounds = boundsSource.map((part: unknown) => Number(part));
      if (bounds.some((part) => !Number.isFinite(part))) continue;

      const borderCrop = parseQuadBorderCrop(itemRecord.borderCrop);

      overlays.push({
        imageUrl,
        bounds: [bounds[0], bounds[1], bounds[2], bounds[3]] as QuadBounds,
        opacity: 1,
        borderCrop,
      });
    }

    return overlays;
  } catch {
    return [];
  }
}


function parseQuadBounds(value: string | undefined): QuadBounds | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

function formatRange(min?: number, max?: number, unit = "") {
  if (typeof min !== "number" && typeof max !== "number") return null;
  if (typeof min === "number" && typeof max === "number") {
    return `${min}–${max}${unit}`;
  }
  return `${typeof min === "number" ? min : max}${unit}`;
}

function formatDurationValue(durationMin?: number) {
  if (typeof durationMin !== "number") return "—";

  const roundedMinutes = Math.floor(durationMin);
  const seconds = Math.round((durationMin - roundedMinutes) * 60);

  if (seconds === 0) return `${roundedMinutes} min`;
  return `${roundedMinutes}m ${seconds}s`;
}

function parseDurationToMinutes(input: string): number | null {
  const value = input.trim();
  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    if (seconds > 59) return null;
    return minutes + seconds / 60;
  }

  const [hours, minutes, seconds] = parts.map(Number);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes + seconds / 60;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const earthRadiusMiles = 3958.7613;
  const latDelta = toRadians(b.lat - a.lat);
  const lonDelta = toRadians(b.lon - a.lon);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);

  const h =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return earthRadiusMiles * c;
}

function metersToFeet(meters: number) {
  return meters * 3.28084;
}

function parseGpxSummary(content: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file.");
  }

  const segmentElements = Array.from(doc.getElementsByTagName("trkseg"));
  if (segmentElements.length === 0) {
    throw new Error("GPX does not contain any track segments.");
  }

  const segmentPoints = segmentElements
    .map((segment) =>
      Array.from(segment.getElementsByTagName("trkpt"))
        .map((point) => {
          const lat = Number(point.getAttribute("lat"));
          const lon = Number(point.getAttribute("lon"));
          const timeNode = point.getElementsByTagName("time")[0];
          const eleNode = point.getElementsByTagName("ele")[0];
          const timestamp = timeNode?.textContent ? Date.parse(timeNode.textContent) : Number.NaN;
          const elevationM = eleNode?.textContent ? Number(eleNode.textContent) : Number.NaN;

          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          return {
            lat,
            lon,
            timestamp,
            elevationM,
          };
        })
        .filter((point): point is { lat: number; lon: number; timestamp: number; elevationM: number } => Boolean(point)),
    )
    .filter((segment) => segment.length > 0);

  const totalPointCount = segmentPoints.reduce((count, segment) => count + segment.length, 0);
  if (totalPointCount < 2) {
    throw new Error("GPX needs at least 2 track points to calculate distance.");
  }

  let miles = 0;
  for (const points of segmentPoints) {
    for (let index = 1; index < points.length; index += 1) {
      miles += haversineMiles(points[index - 1], points[index]);
    }
  }

  const timestamps = segmentPoints.flat().map((point) => point.timestamp).filter(Number.isFinite);
  const durationMin =
    timestamps.length >= 2
      ? Math.max(0, (Math.max(...timestamps) - Math.min(...timestamps)) / 60000)
      : null;

  const segments = segmentPoints.map((points) => points.map((point) => [point.lat, point.lon] as LatLngTuple));

  const elevationProfile: ElevationPoint[] = [];
  let cumulativeMiles = 0;
  for (const points of segmentPoints) {
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];

      if (index > 0) {
        cumulativeMiles += haversineMiles(points[index - 1], point);
      }

      if (Number.isFinite(point.elevationM)) {
        elevationProfile.push({
          distanceMi: cumulativeMiles,
          elevationFt: metersToFeet(point.elevationM),
        });
      }
    }
  }

  return {
    distanceMi: miles,
    durationMin,
    segments,
    elevationProfile,
  };
}

export default function LogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planItemId = searchParams.get("planItemId") ?? "";
  const planItem = useMemo(() => (planItemId ? getPlanItemById(planItemId) : undefined), [planItemId]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [week, setWeek] = useState(planItem?.week ?? 1);
  const [type, setType] = useState<PlanItemType>(planItem?.type ?? "run");
  const [distanceMi, setDistanceMi] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [rpe, setRpe] = useState(String(planItem?.targetRpeMin ?? 5));
  const [surface, setSurface] = useState("");
  const [notes, setNotes] = useState("");
  const [gpxFileName, setGpxFileName] = useState("");
  const [gpxData, setGpxData] = useState("");
  const [gpxSegments, setGpxSegments] = useState<LatLngTuple[][]>([]);
  const [elevationProfile, setElevationProfile] = useState<ElevationPoint[]>([]);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("usgsQuad");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!planItem);

  const configuredQuadOverlays = useMemo(() => {
    const configuredOverlays = parseQuadOverlays(process.env.NEXT_PUBLIC_USGS_QUAD_OVERLAYS);
    if (configuredOverlays.length) return configuredOverlays;

    const imageUrl = process.env.NEXT_PUBLIC_USGS_QUAD_IMAGE_URL;
    const bounds = parseQuadBounds(process.env.NEXT_PUBLIC_USGS_QUAD_BOUNDS);
    if (!imageUrl || !bounds) return undefined;
    const borderCrop = parseQuadBorderCropString(process.env.NEXT_PUBLIC_USGS_QUAD_BORDER_CROP);

    return [
      {
        imageUrl,
        bounds,
        opacity: 1,
        borderCrop,
      },
    ];
  }, []);

  const [quadOverlays, setQuadOverlays] = useState<QuadOverlay[] | undefined>(configuredQuadOverlays);

  useEffect(() => {
    let cancelled = false;

    const processQuadOverlays = async () => {
      if (!configuredQuadOverlays?.length) {
        setQuadOverlays(undefined);
        return;
      }

      const processed = await Promise.all(
        configuredQuadOverlays.map(async (overlay) => {
          const croppedImageUrl = await cropQuadImageUrl(overlay.imageUrl, overlay.borderCrop);
          return {
            imageUrl: croppedImageUrl,
            bounds: overlay.bounds,
            opacity: 1,
          } as QuadOverlay;
        }),
      );

      if (!cancelled) {
        setQuadOverlays(processed);
      }
    };

    processQuadOverlays().catch(() => {
      if (!cancelled) {
        setQuadOverlays(
          configuredQuadOverlays?.map((overlay) => ({
            imageUrl: overlay.imageUrl,
            bounds: overlay.bounds,
            opacity: 1,
          })),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [configuredQuadOverlays]);

  const existingLog = useMemo(() => {
    if (!planItem) return null;
    return logs.find((log) => log.planItemId === planItem.id) ?? null;
  }, [logs, planItem]);

  const refreshLogs = () => {
    setLogs(loadLogs());
    router.refresh();
  };

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  useEffect(() => {
    if (existingLog) {
      setDate(existingLog.date);
      setWeek(existingLog.week);
      setType(existingLog.type);
      setDistanceMi(existingLog.distanceMi != null ? String(existingLog.distanceMi) : "");
      setDurationMin(existingLog.durationMin != null ? String(existingLog.durationMin) : "");
      setRpe(String(existingLog.rpe));
      setSurface(existingLog.surface);
      setNotes(existingLog.notes);
      setGpxFileName(existingLog.gpxFileName ?? "");
      setGpxData(existingLog.gpxData ?? "");
      if (existingLog.gpxData) {
        try {
          const summary = parseGpxSummary(existingLog.gpxData);
          setGpxSegments(summary.segments);
          setElevationProfile(summary.elevationProfile);
        } catch {
          setGpxSegments([]);
          setElevationProfile([]);
        }
      } else {
        setGpxSegments([]);
        setElevationProfile([]);
      }
      return;
    }

    setDate(new Date().toISOString().slice(0, 10));
    setWeek(planItem?.week ?? 1);
    setType(planItem?.type ?? "run");
    setDistanceMi(planItem?.estimatedMilesMin != null ? String(planItem.estimatedMilesMin) : "");
    setDurationMin(planItem?.estimatedTimeMin != null ? String(planItem.estimatedTimeMin) : "");
    setRpe(String(planItem?.targetRpeMin ?? 5));
    setSurface("");
    setNotes("");
    setGpxFileName("");
    setGpxData("");
    setGpxSegments([]);
    setElevationProfile([]);
  }, [existingLog, planItem]);

  useEffect(() => {
    setIsEditing(!existingLog);
  }, [existingLog]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedWeek = Number(week);
    const parsedRpe = Number(rpe);

    if (!date) return setError("Date is required.");
    if (!parsedWeek || parsedWeek < 1 || parsedWeek > 10) return setError("Week must be 1-10.");
    if (!parsedRpe || parsedRpe < 1 || parsedRpe > 10) return setError("RPE must be 1-10.");

    const parsedDurationMin = parseDurationToMinutes(durationMin);
    if (durationMin.trim() && parsedDurationMin == null) {
      return setError("Duration must be minutes (e.g. 45) or a time string like mm:ss or hh:mm:ss.");
    }

    const entry: LogEntry = {
      id: existingLog?.id ?? crypto.randomUUID(),
      date,
      planItemId: planItem?.id,
      week: parsedWeek,
      type,
      distanceMi: distanceMi ? Number(distanceMi) : undefined,
      durationMin: parsedDurationMin ?? undefined,
      rpe: parsedRpe,
      surface,
      notes,
      gpxFileName: gpxFileName || undefined,
      gpxData: gpxData || undefined,
      createdAt: existingLog?.createdAt ?? new Date().toISOString(),
    };

    if (existingLog) {
      updateLog(entry);
      setSuccess("Updated log.");
      setIsEditing(false);
    } else {
      addLog(entry);
      setSuccess("Saved log entry.");
    }

    refreshLogs();
  };

  const handleDelete = () => {
    if (!existingLog) return;
    deleteLog(existingLog.id);
    setSuccess("Log deleted.");
    refreshLogs();
  };

  const handleGpxUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setImportStatus(null);

    try {
      const content = await file.text();
      const summary = parseGpxSummary(content);

      setDistanceMi(summary.distanceMi.toFixed(2));
      setGpxData(content);
      setGpxFileName(file.name);
      setGpxSegments(summary.segments);
      setElevationProfile(summary.elevationProfile);
      if (summary.durationMin != null) {
        setDurationMin(summary.durationMin.toFixed(1));
      }
      setImportStatus(
        `Imported GPX${summary.durationMin != null ? " distance and duration" : " distance"}. Review before saving.`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to parse GPX file.");
    } finally {
      event.target.value = "";
    }
  };

  const clearGpx = () => {
    setGpxData("");
    setGpxFileName("");
    setGpxSegments([]);
    setElevationProfile([]);
    setImportStatus("Cleared GPX attachment from this entry.");
  };

  return (
    <section className="space-y-4">
      <Link
        href="/plan"
        className="inline-flex items-center text-sm font-medium text-stone-700 underline-offset-2 hover:underline dark:text-stone-200"
      >
        ← Back to plan
      </Link>

      {planItem ? (
        <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h1 className="font-semibold">{planItem.title}</h1>
          <h2 className="text-sm text-stone-600 dark:text-stone-300">{planItem.details}</h2>
          {planItem.description ? <p className="mt-2 text-sm text-stone-700 dark:text-stone-200">{planItem.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {formatRange(planItem.estimatedMilesMin, planItem.estimatedMilesMax, " mi") ? (
              <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-700">
                Est. miles: {formatRange(planItem.estimatedMilesMin, planItem.estimatedMilesMax, " mi")}
              </span>
            ) : null}
            {formatRange(planItem.estimatedTimeMin, planItem.estimatedTimeMax, " min") ? (
              <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-700">
                Est. time: {formatRange(planItem.estimatedTimeMin, planItem.estimatedTimeMax, " min")}
              </span>
            ) : null}
          </div>
        </article>
      ) : null}

      <form
        className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">{existingLog ? (isEditing ? "Edit Log" : "Log") : "New Log"}</h2>
          {existingLog && !isEditing ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setImportStatus(null);
                setSuccess(null);
                setIsEditing(true);
              }}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200"
            >
              Edit log
            </button>
          ) : null}
        </div>

        {existingLog && !isEditing ? (
          <>
            {gpxSegments.length ? (
                <>
                  <label className="block text-sm">
                    Map background
                    <select
                      className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                      value={baseLayer}
                      onChange={(e) => setBaseLayer(e.target.value as BaseLayerId)}
                    >
                      {MAP_LAYER_OPTIONS.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                          {layer.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <GpxMap
                    segments={gpxSegments}
                    baseLayer={baseLayer}
                    quadOverlays={quadOverlays}
                    heightClassName="h-[500px]"
                  />
                  {/* <ElevationChart profile={elevationProfile} /> */}
                </>
              ) : null}


            <dl className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm dark:border-stone-700 dark:bg-stone-900/40 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Date</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">{existingLog.date}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Week</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">{existingLog.week}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Type</dt>
                <dd className="font-medium capitalize text-stone-900 dark:text-stone-100">{existingLog.type}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">RPE</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">{existingLog.rpe}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Distance</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">
                  {typeof existingLog.distanceMi === "number" ? `${existingLog.distanceMi} mi` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Duration</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">
                  {formatDurationValue(existingLog.durationMin)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Surface</dt>
                <dd className="font-medium text-stone-900 dark:text-stone-100">{existingLog.surface || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Notes</dt>
                <dd className="whitespace-pre-wrap font-medium text-stone-900 dark:text-stone-100">{existingLog.notes || "—"}</dd>
              </div>
              {existingLog.gpxFileName ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">GPX file</dt>
                  <dd className="font-medium text-stone-900 dark:text-stone-100">{existingLog.gpxFileName}</dd>
                </div>
              ) : null}
            </dl>

            

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200"
                onClick={() => router.push("/plan")}
              >
                Back to plan
              </button>
            </div>
          </>
        ) : (
          <>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            GPX file (autofill distance + duration)
            <input
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
              onChange={handleGpxUpload}
            />
            {gpxFileName ? (
              <span className="mt-1 flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                Stored with entry: {gpxFileName}
                <button type="button" onClick={clearGpx} className="rounded border border-stone-300 px-2 py-0.5 text-xs dark:border-stone-600">
                  Remove
                </button>
              </span>
            ) : null}
            {gpxSegments.length ? (
              <>
                <span className="mt-2 block text-xs text-stone-600 dark:text-stone-300">Map background</span>
                <select
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                  value={baseLayer}
                  onChange={(e) => setBaseLayer(e.target.value as BaseLayerId)}
                >
                  {MAP_LAYER_OPTIONS.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.label}
                    </option>
                  ))}
                </select>
                <GpxMap segments={gpxSegments} baseLayer={baseLayer} quadOverlays={quadOverlays} />
                {/* <ElevationChart profile={elevationProfile} /> */}
                {baseLayer === "usgsQuad" && !quadOverlays?.length ? (
                  <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                    Configure custom quads with NEXT_PUBLIC_USGS_QUAD_OVERLAYS (JSON array) or fallback
                    NEXT_PUBLIC_USGS_QUAD_IMAGE_URL + NEXT_PUBLIC_USGS_QUAD_BOUNDS. Optional crop:
                    NEXT_PUBLIC_USGS_QUAD_BORDER_CROP=&quot;top,right,bottom,left&quot;.
                  </span>
                ) : null}
              </>
            ) : null}
          </label>
          <label className="text-sm">
            Date
            <input type="date" className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-sm">
            Week
            <input type="number" min={1 } max={10} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={week} onChange={(e) => setWeek(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            Type
            <select className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={type} onChange={(e) => setType(e.target.value as PlanItemType)}>
              <option value="run">Run</option>
              <option value="strength">Strength</option>
            </select>
          </label>
          <label className="text-sm">
            RPE (1-10)
            <input type="number" min={1} max={10} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </label>
          <label className="text-sm">
            Distance (mi)
            <input type="number" step="0.01" min={0} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={distanceMi} onChange={(e) => setDistanceMi(e.target.value)} />
          </label>
          <label className="text-sm">
            Duration (min or mm:ss / hh:mm:ss)
            <input type="text" inputMode="decimal" placeholder="45 or 1:05:30" className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </label>
          <label className="text-sm">
            Surface
            <input className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={surface} onChange={(e) => setSurface(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            Notes
            <textarea className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {importStatus ? <p className="text-sm text-blue-700 dark:text-blue-300">{importStatus}</p> : null}
        {success ? <p className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}

        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900">
            {existingLog ? "Save changes" : "Save"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200"
            onClick={() => {
              if (existingLog) {
                setError(null);
                setImportStatus(null);
                setSuccess(null);
                setIsEditing(false);
                return;
              }
              router.push("/plan");
            }}
          >
            {existingLog ? "Done" : "Cancel"}
          </button>
          {existingLog ? (
            <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-400" onClick={handleDelete}>
              Delete log
            </button>
          ) : null}
        </div>
          </>
        )}
      </form>
    </section>
  );
}
