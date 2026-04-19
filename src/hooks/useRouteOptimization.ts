"use client";

import { useEffect, useRef, useState } from "react";

export type GeoPosition = { lat: number; lng: number };

export type RouteStop = {
  id: string;
  position: GeoPosition;
};

export type RouteLeg = {
  distanceMeters: number;
  durationSec: number;
};

export type OptimizedRoute = {
  /** Stop IDs in optimized visit order */
  orderedStopIds: string[];
  /** Decoded polyline path for the full route */
  polylinePath: GeoPosition[];
  /** One leg per segment (origin→stop1, stop1→stop2, …) */
  legs: RouteLeg[];
  totalDistanceMeters: number;
  totalDurationSec: number;
};

const DEBOUNCE_MS = 800;

/**
 * Calls Google Routes API v2 with `optimizeWaypointOrder` to compute
 * the most efficient multi-stop route.
 *
 * @param stops      Geocoded delivery stops
 * @param origin     Rider current position (falls back to store)
 * @param returnTo   Store position used as final destination (circular route)
 * @param apiKey     Google Maps API key
 * @param travelMode DRIVE | BICYCLE
 */
export function useRouteOptimization(
  stops: RouteStop[],
  origin: GeoPosition | null,
  returnTo: GeoPosition,
  apiKey: string | undefined,
  travelMode: "DRIVE" | "BICYCLE" = "DRIVE"
) {
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable serialization for deps — avoids running effect on referential changes
  const stopsKey = stops.map((s) => s.id).sort().join(",");
  const originKey = origin ? `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : "";

  useEffect(() => {
    if (!apiKey || !origin || stops.length === 0) {
      setRoute(null);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        setLoading(true);
        setError(null);

        try {
          const toWaypoint = (p: GeoPosition) => ({
            location: { latLng: { latitude: p.lat, longitude: p.lng } },
          });

          const routingPref =
            travelMode === "DRIVE"
              ? "TRAFFIC_AWARE"
              : "ROUTING_PREFERENCE_UNSPECIFIED";

          const body: Record<string, unknown> = {
            origin: toWaypoint(origin),
            destination: toWaypoint(returnTo),
            travelMode,
            routingPreference: routingPref,
          };

          if (stops.length >= 1) {
            body.intermediates = stops.map((s) => toWaypoint(s.position));
            if (stops.length > 1) {
              body.optimizeWaypointOrder = true;
            }
          }

          const fieldMask = [
            "routes.duration",
            "routes.distanceMeters",
            "routes.polyline.encodedPolyline",
            "routes.optimizedIntermediateWaypointIndex",
            "routes.legs.duration",
            "routes.legs.distanceMeters",
          ].join(",");

          const res = await fetch(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": fieldMask,
              },
              body: JSON.stringify(body),
              signal: controller.signal,
            }
          );

          const data = await res.json();
          const r = data?.routes?.[0];
          if (!r) throw new Error("Nessun percorso trovato.");

          const polylinePath = decodePolyline(r.polyline?.encodedPolyline ?? "");
          const totalDurationSec = parseDuration(r.duration);
          const totalDistanceMeters = r.distanceMeters ?? 0;

          // Build ordered stop IDs from the optimization result
          let orderedStopIds: string[];
          if (stops.length === 1) {
            orderedStopIds = [stops[0].id];
          } else {
            const optimizedIdx: number[] =
              r.optimizedIntermediateWaypointIndex ??
              stops.map((_: unknown, i: number) => i);
            orderedStopIds = optimizedIdx.map((i: number) => stops[i].id);
          }

          const legs: RouteLeg[] = (r.legs ?? []).map((leg: any) => ({
            distanceMeters: leg.distanceMeters ?? 0,
            durationSec: parseDuration(leg.duration),
          }));

          setRoute({
            orderedStopIds,
            polylinePath,
            legs,
            totalDistanceMeters,
            totalDurationSec,
          });
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError(
            e instanceof Error ? e.message : "Errore ottimizzazione percorso."
          );
        } finally {
          setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, originKey, apiKey, travelMode]);

  return { route, loading, error };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Parse Routes API v2 duration string like "1234s" → 1234 */
function parseDuration(d: string | undefined | null): number {
  if (!d) return 0;
  return parseInt(d.replace("s", ""), 10) || 0;
}

/** Decode Google encoded polyline → array of {lat, lng} */
function decodePolyline(encoded: string): GeoPosition[] {
  const points: GeoPosition[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b: number,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
