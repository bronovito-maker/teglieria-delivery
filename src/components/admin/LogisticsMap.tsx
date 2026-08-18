"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatOrderCode } from "@/lib/utils";

type OrderMapItem = {
  id: string;
  orderNumber: number;
  orderCode?: string | null;
  type?: string;
  customerName: string;
  customerPhone?: string | null;
  address?: string | null;
  status: string;
  createdAt?: string | null;
  estimatedTime?: string | null;
  riderName?: string | null;
};

type Props = {
  orders: OrderMapItem[];
  onStatusChange?: () => void;
};

type RouteInfo = {
  customerName: string;
  address: string;
  distance: string;
  duration: string;
};

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

const MAP_SCRIPT_ID = "google-maps-script";
const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function formatRouteDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}′` : `${m} min`;
}

function formatRouteDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

type IWRouteInfo = { distance: string; duration: string } | null;

function buildInfoWindowContent(
  orderId: string,
  orderCode: string,
  customerName: string,
  customerPhone: string | null | undefined,
  address: string | null | undefined,
  status: string,
  color: string,
  statusLabel: string,
  createdTime: string | null,
  etaTime: string | null,
  route: IWRouteInfo,
  routeLoading: boolean,
  isLate = false,
  riderName: string | null | undefined = null,
): string {
  // Route row — inline, no card
  const routeHtml = route
    ? `<div style="display:flex;align-items:center;gap:6px;margin-top:5px">
        <span style="font-size:13px">🛵</span>
        <span style="font-size:12px;font-weight:700;color:#D96A2B">${route.distance}</span>
        <span style="font-size:11px;color:#888">· ${route.duration}</span>
        ${riderName ? `<span style="font-size:11px;color:#555">· ${riderName}</span>` : ""}
      </div>`
    : routeLoading
    ? `<p style="font-size:10px;color:#bbb;margin:4px 0 0;font-style:italic">Calcolo percorso…</p>`
    : "";

  // Rider row — shown when assigned but no route yet computed
  const riderHtml = riderName && !route && !routeLoading
    ? `<p style="font-size:11px;color:#555;margin:3px 0 0">🧑‍🍳 ${riderName}</p>`
    : "";

  // Time row — phone + created + eta on one line
  const metaHtml = `<div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap">
    ${customerPhone ? `<a href="tel:${customerPhone}" style="font-size:11px;color:#555;text-decoration:none">📞 ${customerPhone}</a>` : ""}
    ${createdTime ? `<span style="font-size:11px;color:#999">🕐 ${createdTime}</span>` : ""}
    ${etaTime ? `<span style="font-size:11px;color:#D96A2B;font-weight:600">⏱ ${etaTime}</span>` : ""}
  </div>`;

  // Admin advances CONFIRMED → READY and READY → OUT from the map.
  // DELIVERED is set by the rider from their own dashboard.
  let actionHtml = "";
  if (status === "CONFIRMED") {
    actionHtml = `<button
      onclick="document.dispatchEvent(new CustomEvent('iw-action',{detail:{orderId:'${orderId}',action:'READY'}}))"
      style="margin-top:8px;width:100%;padding:7px 0;border-radius:7px;background:#22c55e;color:white;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border:none;cursor:pointer"
    >✓ Segna Pronto</button>`;
  } else if (status === "READY") {
    actionHtml = `<button
      onclick="document.dispatchEvent(new CustomEvent('iw-action',{detail:{orderId:'${orderId}',action:'OUT'}}))"
      style="margin-top:8px;width:100%;padding:7px 0;border-radius:7px;background:#D96A2B;color:white;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border:none;cursor:pointer"
    >🛵 Segna Spedito</button>`;
  }

  // Truncate address to one line
  const addressHtml = address
    ? `<p style="font-size:11px;color:#777;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px">📍 ${address}</p>`
    : "";

  const lateHtml = isLate
    ? `<div style="margin-bottom:6px;padding:4px 8px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;gap:5px">
        <span style="font-size:12px">⚠️</span>
        <span style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em">In ritardo</span>
      </div>`
    : "";

  return `<div style="font-family:system-ui,sans-serif;width:260px;padding:2px 0;box-sizing:border-box">
    ${lateHtml}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px">
      <a href="/admin/ordini/${orderId}" target="_blank" style="font-size:16px;font-weight:700;color:#1A1A1A;text-decoration:none;border-bottom:2px solid #D96A2B40;line-height:1">${orderCode}</a>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 7px;border-radius:99px;background:${color}22;color:${color};white-space:nowrap">${statusLabel}</span>
    </div>
    <p style="font-size:13px;font-weight:600;color:#1A1A1A;margin:0">${customerName}</p>
    ${addressHtml}
    ${metaHtml}
    ${riderHtml}
    ${routeHtml}
    ${actionHtml}
  </div>`;
}

function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  const resolveMaps = (resolve: (maps: any) => void, reject: (error: Error) => void) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
    } else {
      reject(new Error("Lo script Google Maps è stato caricato, ma google.maps non è disponibile. Controlla la restrizione del referrer e le API abilitate."));
    }
  };

  const existing = document.getElementById(MAP_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolveMaps(resolve, reject));
      existing.addEventListener("error", () => reject(new Error("Errore caricamento Google Maps")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = MAP_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolveMaps(resolve, reject);
    script.onerror = () => reject(new Error("Errore caricamento Google Maps"));
    document.head.appendChild(script);
  });
}

function statusColor(status: string) {
  if (status === "RECEIVED") return "#f59e0b";
  if (status === "CONFIRMED") return "#ef4444";
  if (status === "READY") return "#22c55e";
  if (status === "OUT") return "#0ea5e9";
  if (status === "DELIVERED") return "#6b7280";
  return "#9ca3af";
}

function parseNumber(value?: string) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Order is late if it hasn't departed and its ETA has passed. */
function isOrderLate(order: OrderMapItem): boolean {
  if (order.status === "OUT" || order.status === "DELIVERED" || order.status === "CANCELLED") return false;
  if (!order.estimatedTime) return false;
  return new Date(order.estimatedTime).getTime() < Date.now();
}

/** Inject pulse keyframe once — idempotent. */
function ensureLateStyle() {
  if (document.getElementById("map-late-style")) return;
  const s = document.createElement("style");
  s.id = "map-late-style";
  s.textContent = `
    @keyframes pin-late-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.55), 0 2px 8px rgba(0,0,0,.18); }
      50%      { box-shadow: 0 0 0 7px rgba(239,68,68,0),  0 2px 8px rgba(0,0,0,.18); }
    }
    .map-pin-late { animation: pin-late-pulse 1.3s ease-in-out infinite; border-color: #ef4444 !important; border-width: 3px !important; }
  `;
  document.head.appendChild(s);
}

type MarkerEntry = {
  marker: any;
  pinEl: HTMLDivElement;
  position: { lat: number; lng: number };
  status: string;
  isLate: boolean;
};

export default function LogisticsMap({ orders, onStatusChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  // Persistent marker map: orderId → entry — avoids destroy/recreate on every refresh
  const markersMapRef = useRef<Map<string, MarkerEntry>>(new Map());
  // Store marker is created once and never recreated
  const storeMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const userInteractedRef = useRef(false);
  const directionsRendererRef = useRef<any>(null);
  const activeMarkerRef = useRef<{ orderId: string; content: string; anchor: any } | null>(null);
  // Always-fresh orders snapshot — click handlers read from here to avoid stale closures
  const currentOrdersRef = useRef<OrderMapItem[]>(orders);
  // Mirror of routeInfo state accessible in useEffects without stale closure
  const routeInfoRef = useRef<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const storeLat = parseNumber(process.env.NEXT_PUBLIC_STORE_LAT);
  const storeLng = parseNumber(process.env.NEXT_PUBLIC_STORE_LNG);
  const storePosition = useMemo(
    () => (storeLat !== null && storeLng !== null ? { lat: storeLat, lng: storeLng } : DEFAULT_CENTER),
    [storeLat, storeLng]
  );

  function clearRoute() {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    routeInfoRef.current = null;
    setRouteInfo(null);
  }

  function closePopup() {
    infoWindowRef.current?.close();
    clearRoute();
    activeMarkerRef.current = null;
  }

  function toggleFullscreen() {
    setIsFullscreen((v) => !v);
    // Trigger map resize after layout change
    setTimeout(() => {
      if (mapRef.current && window.google?.maps) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    }, 50);
  }

  // Listen for InfoWindow action button clicks (iw-action CustomEvent)
  useEffect(() => {
    async function handler(e: Event) {
      const { orderId, action } = (e as CustomEvent<{ orderId: string; action: string }>).detail;
      const body: Record<string, string> = { status: action };
      if (action === "READY") {
        body.statusNote = "[ADMIN] Ordine pronto dalla mappa";
      } else if (action === "OUT") {
        body.deliveryStatus = "EN_ROUTE";
        body.statusNote = "[ADMIN] Ordine spedito dalla mappa";
      }
      await fetch(`/api/ordini/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onStatusChange?.();
    }
    document.addEventListener("iw-action", handler);
    return () => document.removeEventListener("iw-action", handler);
  }, [onStatusChange]);

  // Close fullscreen on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) {
        setError("Manca NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nelle variabili ambiente.");
        setLoading(false);
        return;
      }
      if (!mapContainerRef.current) return;

      window.gm_authFailure = () => {
        const message = "Google Maps ha rifiutato la API key: verifica referrer autorizzati, Maps JavaScript API e fatturazione.";
        console.error("[Google Maps] gm_authFailure", { message });
        if (!cancelled) setError(message);
      };

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
        mapRef.current = new maps.Map(mapContainerRef.current, {
          center: storePosition,
          zoom: 12,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false, // we use our own
        });
        infoWindowRef.current = new maps.InfoWindow();

        mapRef.current.addListener("zoom_changed", () => { userInteractedRef.current = true; });
        mapRef.current.addListener("dragend", () => { userInteractedRef.current = true; });

        // Closing the InfoWindow X button clears the route and active tracking
        infoWindowRef.current.addListener("closeclick", () => {
          clearRoute();
          activeMarkerRef.current = null;
        });

        // Create the store marker once — it never needs to be recreated
        const storePin = document.createElement("div");
        storePin.style.cssText = "width:36px;height:36px;border-radius:50%;background:#ef4444;border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.25)";
        storePin.textContent = "🏠";
        storeMarkerRef.current = new maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: storePosition,
          title: "La Teglieria",
          content: storePin,
        });

      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        console.error("[Google Maps] inizializzazione fallita", caughtError);
        if (!cancelled) setError(`Google Maps: ${message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, storePosition]);

  useEffect(() => {
    // Keep the always-fresh snapshot for click handlers
    currentOrdersRef.current = orders;

    if (!mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;
    const geocoder = new maps.Geocoder();
    const bounds = new maps.LatLngBounds();
    bounds.extend(storePosition);

    const addressOrders = orders.filter((order) => Boolean(order.address?.trim()));
    const currentOrderIds = new Set(addressOrders.map((o) => o.id));

    // ── 1. Remove markers for orders that are gone ──────────────────────────
    markersMapRef.current.forEach((entry, orderId) => {
      if (!currentOrderIds.has(orderId)) {
        entry.marker.setMap(null);
        markersMapRef.current.delete(orderId);
        if (activeMarkerRef.current?.orderId === orderId) {
          infoWindowRef.current?.close();
          clearRoute();
          activeMarkerRef.current = null;
        }
      }
    });

    if (addressOrders.length === 0) {
      if (!userInteractedRef.current) { map.setCenter(storePosition); map.setZoom(12); }
      return;
    }

    // ── 2. Attach click handler (reads fresh data via currentOrdersRef) ─────
    const attachClickHandler = (orderId: string, marker: any, position: { lat: number; lng: number }) => {
      marker.addListener("click", () => {
        // Always read the latest order data — avoids stale closure
        const o = currentOrdersRef.current.find((x) => x.id === orderId);
        if (!o) return;

        const code = o.orderCode ?? formatOrderCode({ orderCode: o.orderCode, orderNumber: o.orderNumber, type: o.type ?? "DELIVERY" });
        const col = statusColor(o.status);
        const statusLabel = ORDER_STATUS_LABELS[o.status] || o.status;
        const createdTime = o.createdAt
          ? new Date(o.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : null;
        const etaTime = o.estimatedTime
          ? new Date(o.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : null;

        infoWindowRef.current?.setContent(buildInfoWindowContent(
          o.id, code, o.customerName, o.customerPhone, o.address,
          o.status, col, statusLabel, createdTime, etaTime, null, true, isOrderLate(o), o.riderName
        ));
        infoWindowRef.current?.open({ map, anchor: marker });
        activeMarkerRef.current = { orderId: o.id, content: "", anchor: marker };

        // Clear previous route before computing a new one
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
          directionsRendererRef.current = null;
        }
        setRouteInfo(null);
        setRouteLoading(true);

        fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey!,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: storePosition.lat, longitude: storePosition.lng } } },
            destination: { location: { latLng: { latitude: position.lat, longitude: position.lng } } },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            setRouteLoading(false);
            const route = data?.routes?.[0];
            if (!route) return;

            const durationSec = parseInt(route.duration ?? "0", 10);
            const distanceText = formatRouteDistance(route.distanceMeters ?? 0);
            const durationText = formatRouteDuration(durationSec);

            const path = decodePolyline(route.polyline.encodedPolyline);
            const polyline = new maps.Polyline({
              path,
              strokeColor: "#D96A2B",
              strokeWeight: 5,
              strokeOpacity: 0.85,
              map,
            });
            directionsRendererRef.current = polyline;

            // Re-read latest order so route popup reflects current status
            const oNow = currentOrdersRef.current.find((x) => x.id === orderId) ?? o;
            const colNow = statusColor(oNow.status);
            const labelNow = ORDER_STATUS_LABELS[oNow.status] || oNow.status;

            const ri = {
              customerName: oNow.customerName,
              address: oNow.address ?? "",
              distance: distanceText,
              duration: durationText,
            };
            routeInfoRef.current = ri;
            setRouteInfo(ri);

            const content = buildInfoWindowContent(
              oNow.id, code, oNow.customerName, oNow.customerPhone, oNow.address,
              oNow.status, colNow, labelNow, createdTime, etaTime,
              { distance: distanceText, duration: durationText }, false, isOrderLate(oNow), oNow.riderName
            );
            infoWindowRef.current?.setContent(content);
            if (activeMarkerRef.current?.orderId === orderId) {
              activeMarkerRef.current.content = content;
            }
          })
          .catch(() => setRouteLoading(false));
      });
    };

    // Ensure late-pulse CSS is available
    ensureLateStyle();

    // ── 3. Diff existing markers vs new orders ──────────────────────────────
    const geocodePromises: Promise<void>[] = [];

    for (const order of addressOrders) {
      const existing = markersMapRef.current.get(order.id);

      if (existing) {
        // Already on map — update pin if status or late state changed
        const nowLate = isOrderLate(order);
        if (existing.status !== order.status || existing.isLate !== nowLate) {
          existing.pinEl.style.border = `2.5px solid ${statusColor(order.status)}`;
          existing.status = order.status;
          existing.isLate = nowLate;
          if (nowLate) {
            existing.pinEl.classList.add("map-pin-late");
          } else {
            existing.pinEl.classList.remove("map-pin-late");
          }

          // If this order's popup is open, refresh its content immediately
          if (activeMarkerRef.current?.orderId === order.id) {
            const col = statusColor(order.status);
            const label = ORDER_STATUS_LABELS[order.status] || order.status;
            const code = order.orderCode ?? formatOrderCode({ orderCode: order.orderCode, orderNumber: order.orderNumber, type: order.type ?? "DELIVERY" });
            const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : null;
            const etaTime = order.estimatedTime ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : null;
            const ri = routeInfoRef.current;
            const newContent = buildInfoWindowContent(
              order.id, code, order.customerName, order.customerPhone, order.address,
              order.status, col, label, createdTime, etaTime,
              ri ? { distance: ri.distance, duration: ri.duration } : null, false, nowLate, order.riderName
            );
            infoWindowRef.current?.setContent(newContent);
            activeMarkerRef.current.content = newContent;
          }
        }
        bounds.extend(existing.position);
        continue;
      }

      // New order — geocode and place a fresh marker
      const address = order.address!.trim();
      const orderId = order.id;

      geocodePromises.push(new Promise<void>((resolve) => {
        const placeAt = (position: { lat: number; lng: number }) => {
          const color = statusColor(order.status);
          const late = isOrderLate(order);
          const orderCode = order.orderCode ?? formatOrderCode({ orderCode: order.orderCode, orderNumber: order.orderNumber, type: order.type ?? "DELIVERY" });

          const pinEl = document.createElement("div");
          pinEl.style.cssText = `width:40px;height:40px;border-radius:50%;background:white;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer`;
          pinEl.textContent = "🍕";
          if (late) pinEl.classList.add("map-pin-late");

          const marker = new maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: `${orderCode} — ${order.customerName}`,
            content: pinEl,
            zIndex: late ? 20 : 10,
          });

          markersMapRef.current.set(orderId, { marker, pinEl, position, status: order.status, isLate: late });
          attachClickHandler(orderId, marker, position);
          bounds.extend(position);
        };

        const cached = geocodeCacheRef.current.get(address);
        if (cached) { placeAt(cached); resolve(); return; }

        geocoder.geocode({ address }, (results: any, gStatus: any) => {
          if (gStatus === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            const pos = { lat: loc.lat(), lng: loc.lng() };
            geocodeCacheRef.current.set(address, pos);
            placeAt(pos);
          }
          resolve();
        });
      }));
    }

    // ── 4. After new markers are placed, update bounds if needed ────────────
    Promise.all(geocodePromises).then(() => {
      if (userInteractedRef.current) return;
      if (bounds.isEmpty()) { map.setCenter(storePosition); map.setZoom(12); return; }
      map.fitBounds(bounds, 70);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, storePosition, loading]);

  return (
    <div
      ref={wrapperRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[200] bg-white flex flex-col p-0"
          : "rounded-2xl border border-red-100/80 bg-white/90 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5"
      }
    >
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 ${isFullscreen ? "px-4 pt-4 pb-2" : "mb-3"}`}>
        <h2 className="text-xl font-bold text-[#1d1d1f]">Mappa Operativa</h2>
        <div className="flex items-center gap-2">
          {routeLoading && <span className="text-xs text-gray-400 animate-pulse">Calcolo percorso…</span>}
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors"
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V3h4"/><path d="M17 3h4v4"/><path d="M21 17v4h-4"/><path d="M7 21H3v-4"/>
              </svg>
            )}
          </button>
          <span className="text-xs text-gray-500">Google Maps</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3 mx-4">{error}</div>
      ) : (
        <>
          <div
            ref={mapContainerRef}
            className={
              isFullscreen
                ? "flex-1 w-full"
                : "h-[340px] md:h-[420px] w-full rounded-xl border border-red-100/80 bg-gray-50"
            }
          />

          {/* Route info pill */}
          {routeInfo && (
            <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-orange-50 border border-orange-200 ${isFullscreen ? "mx-4 mb-4 mt-2 rounded-xl" : "mt-3 rounded-xl"}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg">🛵</span>
                <div>
                  <p className="text-xs font-bold text-orange-800 leading-none">{routeInfo.customerName}</p>
                  <p className="text-[11px] text-orange-600 mt-0.5">{routeInfo.distance} · {routeInfo.duration} in auto</p>
                </div>
              </div>
              <button
                onClick={closePopup}
                className="text-xs font-bold text-orange-400 hover:text-orange-700 transition-colors px-3 py-1 rounded-full hover:bg-orange-100"
              >
                Chiudi percorso
              </button>
            </div>
          )}

          {!isFullscreen && (
            <p className="mt-2 text-xs text-gray-500">
              Clicca un pin 🍕 per il percorso · chiudi il popup per rimuoverlo
            </p>
          )}
          {loading && <p className="mt-1 text-xs text-gray-400 px-1">Caricamento mappa...</p>}
        </>
      )}
    </div>
  );
}
