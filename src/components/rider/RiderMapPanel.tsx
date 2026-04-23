"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRiderGeolocation, type GeoPosition } from "@/hooks/useRiderGeolocation";
import {
  useRouteOptimization,
  type RouteStop,
  type OptimizedRoute,
} from "@/hooks/useRouteOptimization";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatOrderCode } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────

type RiderOrder = {
  id: string;
  orderNumber: number;
  orderCode?: string | null;
  type: string;
  status: string;
  deliveryStatus?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  customerName: string;
  customerPhone?: string | null;
  estimatedTime?: string | null;
  notes?: string | null;
  total?: string | number | null;
};

type GeocodedStop = {
  order: RiderOrder;
  position: GeoPosition;
};

type Props = {
  orders: RiderOrder[];
  vehicle?: "BIKE" | "SCOOTER" | "CAR" | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

// ── Constants ────────────────────────────────────────────────────────────

const MAP_SCRIPT_ID = "google-maps-script";

const STORE_POSITION: GeoPosition = {
  lat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? "43.5261962"),
  lng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? "10.3371522"),
};

// ── Pure helpers ─────────────────────────────────────────────────────────

function markerColor(status: string): string {
  switch (status) {
    case "READY":
      return "#22c55e";
    case "OUT":
      return "#D96A2B";
    case "DELIVERED":
      return "#6b7280";
    default:
      return "#E6A52E";
  }
}

function markerEmoji(status: string): string {
  switch (status) {
    case "READY":
      return "🍕";
    case "OUT":
      return "🛵";
    case "DELIVERED":
      return "✓";
    default:
      return "📦";
  }
}

/** Priority score: lower = higher priority = deliver first */
function stopPriority(order: RiderOrder): number {
  // 1. Status weight — OUT orders are actively in delivery
  const statusWeight =
    order.status === "OUT"
      ? 0
      : order.status === "READY"
        ? 100
        : 200;

  // 2. ETA urgency — sooner deadline = higher priority
  const etaMs = order.estimatedTime
    ? new Date(order.estimatedTime).getTime() - Date.now()
    : Infinity;
  const etaWeight = Number.isFinite(etaMs) ? etaMs / 60_000 : 9999;

  return statusWeight + etaWeight;
}

/**
 * Determines the "next recommended stop" from geocoded stops.
 * If the route API provided an optimized order, uses that (first id).
 * Otherwise falls back to priority scoring.
 */
function computeNextStop(
  geocodedStops: GeocodedStop[],
  optimizedRoute: OptimizedRoute | null
): GeocodedStop | null {
  const active = geocodedStops.filter(
    (s) => s.order.status !== "DELIVERED" && s.order.status !== "CANCELLED"
  );
  if (active.length === 0) return null;

  if (optimizedRoute && optimizedRoute.orderedStopIds.length > 0) {
    for (const id of optimizedRoute.orderedStopIds) {
      const found = active.find((s) => s.order.id === id);
      if (found) return found;
    }
  }

  // Fallback: pure priority scoring
  return [...active].sort(
    (a, b) => stopPriority(a.order) - stopPriority(b.order)
  )[0];
}

function buildNavLink(
  destination: GeoPosition,
  origin: GeoPosition | null,
  vehicle: string | null
): string {
  const mode = vehicle === "BIKE" ? "bicycling" : "driving";
  const destParam = `${destination.lat},${destination.lng}`;
  const originParam = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destParam}&travelmode=${mode}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}′` : `${m} min`;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${meters} m`;
}

function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  const existing = document.getElementById(MAP_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.google?.maps));
      existing.addEventListener("error", () =>
        reject(new Error("Errore caricamento Google Maps"))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = MAP_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps);
    script.onerror = () =>
      reject(new Error("Errore caricamento Google Maps"));
    document.head.appendChild(script);
  });
}

// ── Component ────────────────────────────────────────────────────────────

export default function RiderMapPanel({ orders, vehicle }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Refs — Google Maps objects
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; pinEl: HTMLDivElement; position: GeoPosition; status: string }>>(new Map());
  const riderDotRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Map<string, GeoPosition>>(new Map());
  const userInteractedRef = useRef(false);

  // State
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geocodedStops, setGeocodedStops] = useState<GeocodedStop[]>([]);

  // Hooks
  const { position: riderPosition, error: geoError } = useRiderGeolocation();

  // Only feed active DELIVERY orders with addresses into route optimization
  const activeDeliveryOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.type === "DELIVERY" &&
          o.status !== "DELIVERED" &&
          o.status !== "CANCELLED" &&
          o.address?.trim()
      ),
    [orders]
  );

  // Build RouteStop[] from geocoded data for the optimization hook
  const routeStops: RouteStop[] = useMemo(
    () =>
      geocodedStops
        .filter(
          (s) =>
            s.order.status !== "DELIVERED" && s.order.status !== "CANCELLED"
        )
        .map((s) => ({ id: s.order.id, position: s.position })),
    [geocodedStops]
  );

  const travelMode = vehicle === "BIKE" ? "BICYCLE" as const : "DRIVE" as const;

  const { route: optimizedRoute, loading: routeLoading } =
    useRouteOptimization(
      routeStops,
      riderPosition ?? STORE_POSITION,
      STORE_POSITION,
      apiKey,
      travelMode
    );

  const nextStop = useMemo(
    () => computeNextStop(geocodedStops, optimizedRoute),
    [geocodedStops, optimizedRoute]
  );

  // ── Effect 1: Initialize map ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) {
        setMapError("Manca NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
        return;
      }
      if (!containerRef.current) return;

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        const mapId =
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

        mapRef.current = new maps.Map(containerRef.current, {
          center: STORE_POSITION,
          zoom: 13,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
        });

        infoWindowRef.current = new maps.InfoWindow();

        mapRef.current.addListener("zoom_changed", () => {
          userInteractedRef.current = true;
        });
        mapRef.current.addListener("dragend", () => {
          userInteractedRef.current = true;
        });

        // Store marker (always visible)
        const storePin = document.createElement("div");
        storePin.style.cssText =
          "width:32px;height:32px;border-radius:50%;background:#ef4444;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.25)";
        storePin.textContent = "🏠";
        storeMarkerRef.current = new maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: STORE_POSITION,
          title: "La Teglieria",
          content: storePin,
        });

        setMapReady(true);
      } catch {
        if (!cancelled) setMapError("Impossibile caricare Google Maps.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // ── Effect 2: Update rider position marker ────────────────────────────

  useEffect(() => {
    if (!mapReady || !mapRef.current || !riderPosition || !window.google?.maps)
      return;

    const maps = window.google.maps;

    if (!riderDotRef.current) {
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,.3),0 2px 6px rgba(0,0,0,.2)";
      riderDotRef.current = new maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: riderPosition,
        title: "Tu sei qui",
        content: dot,
        zIndex: 100,
      });
    } else {
      riderDotRef.current.position = riderPosition;
    }
  }, [mapReady, riderPosition]);

  // ── Effect 3: Geocode orders & manage markers ─────────────────────────

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;
    const geocoder = new maps.Geocoder();
    const currentIds = new Set(activeDeliveryOrders.map((o) => o.id));

    // Remove stale markers
    markersMapRef.current.forEach((entry, orderId) => {
      if (!currentIds.has(orderId)) {
        entry.marker.map = null;
        markersMapRef.current.delete(orderId);
      }
    });

    const geocodePromises: Promise<GeocodedStop | null>[] = [];

    for (const order of activeDeliveryOrders) {
      const existing = markersMapRef.current.get(order.id);

      // Update existing marker style if status changed
      if (existing) {
        if (existing.status !== order.status) {
          existing.pinEl.style.borderColor = markerColor(order.status);
          existing.pinEl.textContent = markerEmoji(order.status);
          existing.status = order.status;
        }
        geocodePromises.push(
          Promise.resolve({ order, position: existing.position })
        );
        continue;
      }

      const address = (order.address ?? "").trim();
      if (!address) continue;

      geocodePromises.push(
        new Promise<GeocodedStop | null>((resolve) => {
          const cached = geocodeCacheRef.current.get(address);
          const placeAt = (pos: GeoPosition) => {
            const color = markerColor(order.status);
            const pinEl = document.createElement("div");
            pinEl.style.cssText = `width:38px;height:38px;border-radius:50%;background:white;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer`;
            pinEl.textContent = markerEmoji(order.status);

            const marker = new maps.marker.AdvancedMarkerElement({
              map,
              position: pos,
              title: `${formatOrderCode(order)} — ${order.customerName}`,
              content: pinEl,
              zIndex: order.status === "OUT" ? 20 : 10,
            });

            // Marker click → show InfoWindow
            marker.addListener("click", () => {
              const code = formatOrderCode(order);
              const statusLabel =
                ORDER_STATUS_LABELS[order.status] || order.status;
              const eta = order.estimatedTime
                ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              infoWindowRef.current?.setContent(
                buildInfoContent(code, order, statusLabel, eta)
              );
              infoWindowRef.current?.open({ map, anchor: marker });
            });

            markersMapRef.current.set(order.id, {
              marker,
              pinEl,
              position: pos,
              status: order.status,
            });
            resolve({ order, position: pos });
          };

          if (cached) {
            placeAt(cached);
            return;
          }

          geocoder.geocode({ address }, (results: any, gStatus: any) => {
            if (gStatus === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              const pos = { lat: loc.lat(), lng: loc.lng() };
              geocodeCacheRef.current.set(address, pos);
              placeAt(pos);
            } else {
              resolve(null);
            }
          });
        })
      );
    }

    Promise.all(geocodePromises).then((results) => {
      const valid = results.filter(Boolean) as GeocodedStop[];
      setGeocodedStops(valid);

      // Fit bounds to show all markers + rider
      if (!userInteractedRef.current && valid.length > 0) {
        const bounds = new maps.LatLngBounds();
        bounds.extend(STORE_POSITION);
        valid.forEach((s) => bounds.extend(s.position));
        if (riderPosition) bounds.extend(riderPosition);
        map.fitBounds(bounds, 60);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, activeDeliveryOrders, riderPosition]);

  // ── Effect 4: Draw route polyline ─────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const maps = window.google.maps;

    // Remove old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!optimizedRoute || optimizedRoute.polylinePath.length === 0) return;

    polylineRef.current = new maps.Polyline({
      path: optimizedRoute.polylinePath,
      strokeColor: "#D96A2B",
      strokeWeight: 5,
      strokeOpacity: 0.8,
      map: mapRef.current,
    });

    // Highlight next stop marker
    if (nextStop) {
      const entry = markersMapRef.current.get(nextStop.order.id);
      if (entry) {
        entry.pinEl.style.boxShadow =
          "0 0 0 4px rgba(230,106,38,.4), 0 2px 8px rgba(0,0,0,.18)";
        entry.pinEl.style.transform = "scale(1.15)";
      }
    }

    // Clean up highlight on other markers
    markersMapRef.current.forEach((entry, id) => {
      if (id !== nextStop?.order.id) {
        entry.pinEl.style.boxShadow = "0 2px 8px rgba(0,0,0,.18)";
        entry.pinEl.style.transform = "scale(1)";
      }
    });
  }, [mapReady, optimizedRoute, nextStop]);

  // ── Numbering: show step badges on markers based on route order ────────

  useEffect(() => {
    if (!optimizedRoute) return;
    const { orderedStopIds } = optimizedRoute;

    // Add step number badge to each marker
    markersMapRef.current.forEach((entry, orderId) => {
      const stepIdx = orderedStopIds.indexOf(orderId);
      // Remove old badge if present
      const oldBadge = entry.pinEl.querySelector("[data-step-badge]");
      if (oldBadge) oldBadge.remove();

      if (stepIdx >= 0) {
        const badge = document.createElement("span");
        badge.setAttribute("data-step-badge", "true");
        badge.textContent = String(stepIdx + 1);
        badge.style.cssText =
          "position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#D96A2B;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,.2)";
        entry.pinEl.style.position = "relative";
        entry.pinEl.appendChild(badge);
      }
    });
  }, [optimizedRoute]);

  // ── Render ─────────────────────────────────────────────────────────────

  const navLink = useMemo(() => {
    if (!nextStop) return null;
    return buildNavLink(nextStop.position, riderPosition, vehicle ?? null);
  }, [nextStop, riderPosition, vehicle]);

  // Route summary for next stop
  const nextLeg = useMemo(() => {
    if (!optimizedRoute || !nextStop) return null;
    // First leg after origin is leg index 0
    const leg = optimizedRoute.legs[0];
    return leg ?? null;
  }, [optimizedRoute, nextStop]);

  if (mapError) {
    return (
      <section className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-charcoal/5 shadow-xl p-5">
        <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 text-terracotta text-[11px] font-brand font-bold uppercase tracking-widest p-3 text-center">
          {mapError}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/70 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
      {/* Map container — no header, route info overlaid */}
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[36svh] min-h-[180px] max-h-[300px] w-full bg-warm-light/40"
        />

        {/* Route summary pill — overlaid top-right on map */}
        {optimizedRoute && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-charcoal/5">
            {routeLoading ? (
              <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 animate-pulse">
                Calcolo...
              </span>
            ) : (
              <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-terracotta">
                {formatDistance(optimizedRoute.totalDistanceMeters)} &middot;{" "}
                {formatDuration(optimizedRoute.totalDurationSec)}
              </span>
            )}
          </div>
        )}
        {!optimizedRoute && routeLoading && (
          <div className="absolute top-2.5 right-2.5 z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-charcoal/5">
            <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 animate-pulse">
              Calcolo percorso...
            </span>
          </div>
        )}

        {/* Geolocation error — compact inline pill */}
        {geoError && (
          <div className="absolute top-2.5 left-2.5 z-10 rounded-full bg-marigold/90 text-white text-[8px] font-brand font-bold uppercase tracking-widest px-3 py-1.5 backdrop-blur-sm shadow-sm">
            GPS non attivo
          </div>
        )}

        {/* Loading overlay */}
        {!mapReady && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-warm-light/60 backdrop-blur-sm">
            <p className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/40 animate-pulse">
              Caricamento mappa...
            </p>
          </div>
        )}
      </div>

      {/* ── NextStopCard — ultra-compact for mobile ── */}
      {nextStop ? (
        <div className="px-3 py-2.5 md:px-5 md:py-3">
          {/* Info row: badge + details + call */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center font-brand font-bold text-xs shadow-md shadow-terracotta/25">
              1
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <p className="font-brand font-bold text-[15px] text-charcoal truncate leading-tight">
                  {nextStop.order.customerName}
                </p>
                {nextStop.order.estimatedTime && (
                  <span className="flex-shrink-0 text-[9px] font-brand font-bold text-terracotta leading-tight">
                    {new Date(nextStop.order.estimatedTime).toLocaleTimeString(
                      "it-IT",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-charcoal/45 font-body truncate leading-tight">
                  {nextStop.order.address}
                </p>
                {nextLeg && (
                  <span className="flex-shrink-0 text-[9px] font-brand font-bold text-charcoal/40">
                    {formatDistance(nextLeg.distanceMeters)} &middot; {formatDuration(nextLeg.durationSec)}
                  </span>
                )}
              </div>
            </div>
            {/* Quick call */}
            {nextStop.order.customerPhone && (
              <a
                href={`tel:${nextStop.order.customerPhone}`}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Chiama cliente"
              >
                <span className="text-sm">📞</span>
              </a>
            )}
          </div>

          {/* Avvia navigazione — full width, tight */}
          {navLink && (
            <a
              href={navLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.15em] text-[10px] shadow-lg shadow-charcoal/25 hover:bg-terracotta active:scale-[0.97] transition-all"
            >
              Avvia Navigazione
              <span className="text-xs">→</span>
            </a>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 text-center">
          <p className="text-[9px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/40">
            🗺️ Nessun ordine delivery attivo
          </p>
        </div>
      )}
    </section>
  );
}

// ── InfoWindow HTML builder ──────────────────────────────────────────────

function buildInfoContent(
  code: string,
  order: RiderOrder,
  statusLabel: string,
  eta: string | null
): string {
  const color = markerColor(order.status);
  return `<div style="font-family:system-ui,sans-serif;width:220px;padding:2px 0">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px">
      <span style="font-size:15px;font-weight:700;color:#1A1A1A">${code}</span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:2px 7px;border-radius:99px;background:${color}22;color:${color}">${statusLabel}</span>
    </div>
    <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0">${order.customerName}</p>
    <p style="font-size:11px;color:#777;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px">📍 ${order.address ?? ""}</p>
    ${eta ? `<p style="font-size:11px;color:#D96A2B;font-weight:600;margin:4px 0 0">⏱ ${eta}</p>` : ""}
    ${order.notes ? `<p style="font-size:10px;color:#E6A52E;font-weight:600;margin:4px 0 0">📝 ${order.notes}</p>` : ""}
    ${order.customerPhone ? `<a href="tel:${order.customerPhone}" style="font-size:10px;color:#555;text-decoration:none;display:block;margin-top:4px">📞 ${order.customerPhone}</a>` : ""}
  </div>`;
}
