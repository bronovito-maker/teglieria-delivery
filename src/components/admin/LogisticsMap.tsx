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
};

type Props = {
  orders: OrderMapItem[];
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
  }
}

const MAP_SCRIPT_ID = "google-maps-script";
const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }; // Roma fallback

function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  const existing = document.getElementById(MAP_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.google?.maps));
      existing.addEventListener("error", () => reject(new Error("Errore caricamento Google Maps")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = MAP_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps);
    script.onerror = () => reject(new Error("Errore caricamento Google Maps"));
    document.head.appendChild(script);
  });
}

function statusColor(status: string) {
  if (status === "RECEIVED") return "#f59e0b";
  if (status === "CONFIRMED") return "#ef4444";
  if (status === "PREPARING") return "#f97316";
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

export default function LogisticsMap({ orders }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const userInteractedRef = useRef(false);
  const directionsRendererRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

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
    setRouteInfo(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) {
        setError("Manca NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nelle variabili ambiente.");
        setLoading(false);
        return;
      }
      if (!mapContainerRef.current) return;

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        mapRef.current = new maps.Map(mapContainerRef.current, {
          center: storePosition,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoWindowRef.current = new maps.InfoWindow();

        mapRef.current.addListener("zoom_changed", () => {
          userInteractedRef.current = true;
        });
        mapRef.current.addListener("dragend", () => {
          userInteractedRef.current = true;
        });
        // Click on map background → clear route
        mapRef.current.addListener("click", () => {
          clearRoute();
          infoWindowRef.current?.close();
        });
      } catch {
        if (!cancelled) setError("Impossibile caricare Google Maps.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, storePosition]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;
    const geocoder = new maps.Geocoder();
    const bounds = new maps.LatLngBounds();

    // Clear existing markers and route on refresh
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setRouteInfo(null);

    const storeMarker = new maps.Marker({
      map,
      position: storePosition,
      title: "La Teglieria",
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      label: { text: "👨🏼‍💻", fontSize: "14px" },
    });
    markersRef.current.push(storeMarker);
    bounds.extend(storePosition);

    const addressOrders = orders.filter((order) => Boolean(order.address?.trim()));
    if (addressOrders.length === 0) {
      if (!userInteractedRef.current) {
        map.setCenter(storePosition);
        map.setZoom(12);
      }
      return;
    }

    const placeMarker = (order: OrderMapItem, position: { lat: number; lng: number }) => {
      const color = statusColor(order.status);
      const orderCode = order.orderCode ?? formatOrderCode({ orderCode: order.orderCode, orderNumber: order.orderNumber, type: order.type ?? "DELIVERY" });

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42">
        <circle cx="21" cy="21" r="19" fill="white" stroke="${color}" stroke-width="2.5"/>
        <text x="21" y="27" text-anchor="middle" font-size="20">🍕</text>
      </svg>`;

      const marker = new maps.Marker({
        map,
        position,
        title: `${orderCode} — ${order.customerName}`,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
          scaledSize: new maps.Size(42, 42),
          anchor: new maps.Point(21, 21),
        },
        zIndex: 10,
      });

      marker.addListener("click", () => {
        const createdTime = order.createdAt
          ? new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : null;
        const etaTime = order.estimatedTime
          ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : null;
        const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

        infoWindowRef.current?.setContent(`
          <div style="font-family:system-ui,sans-serif;min-width:200px;padding:4px 2px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:17px;font-weight:700;color:#151b1f">${orderCode}</span>
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:99px;background:${color}22;color:${color}">${statusLabel}</span>
            </div>
            <p style="font-size:13px;font-weight:600;color:#151b1f;margin:0 0 4px">${order.customerName}</p>
            ${order.customerPhone ? `<p style="font-size:12px;color:#555;margin:0 0 6px">📞 ${order.customerPhone}</p>` : ""}
            ${order.address ? `<p style="font-size:12px;color:#555;margin:0 0 6px">📍 ${order.address}</p>` : ""}
            <div style="display:flex;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0">
              ${createdTime ? `<span style="font-size:11px;color:#888">🕐 ${createdTime}</span>` : ""}
              ${etaTime ? `<span style="font-size:11px;color:#e66a26;font-weight:600">⏱ ${etaTime}</span>` : ""}
            </div>
            <p style="font-size:10px;color:#aaa;margin-top:8px;text-align:center">Calcolo percorso in corso…</p>
          </div>`);
        infoWindowRef.current?.open({ map, anchor: marker });

        // Clear previous route
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
        setRouteInfo(null);
        setRouteLoading(true);

        // Draw new route
        const directionsService = new maps.DirectionsService();
        const renderer = new maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: false,
          polylineOptions: {
            strokeColor: "#e66a26",
            strokeWeight: 5,
            strokeOpacity: 0.85,
          },
        });
        renderer.setMap(map);
        directionsRendererRef.current = renderer;

        directionsService.route(
          {
            origin: storePosition,
            destination: position,
            travelMode: maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            setRouteLoading(false);
            if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
              renderer.setDirections(result);
              const leg = result.routes[0].legs[0];
              setRouteInfo({
                customerName: order.customerName,
                address: order.address ?? "",
                distance: leg.distance?.text ?? "",
                duration: leg.duration?.text ?? "",
              });
              // Update infowindow with route info
              infoWindowRef.current?.setContent(`
                <div style="font-family:system-ui,sans-serif;min-width:200px;padding:4px 2px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                    <span style="font-size:17px;font-weight:700;color:#151b1f">${orderCode}</span>
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:99px;background:${color}22;color:${color}">${statusLabel}</span>
                  </div>
                  <p style="font-size:13px;font-weight:600;color:#151b1f;margin:0 0 4px">${order.customerName}</p>
                  ${order.customerPhone ? `<p style="font-size:12px;color:#555;margin:0 0 6px">📞 ${order.customerPhone}</p>` : ""}
                  ${order.address ? `<p style="font-size:12px;color:#555;margin:0 0 6px">📍 ${order.address}</p>` : ""}
                  <div style="display:flex;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0">
                    ${createdTime ? `<span style="font-size:11px;color:#888">🕐 ${createdTime}</span>` : ""}
                    ${etaTime ? `<span style="font-size:11px;color:#e66a26;font-weight:600">⏱ ${etaTime}</span>` : ""}
                  </div>
                  <div style="margin-top:10px;padding:8px 10px;border-radius:10px;background:#fff7f2;border:1px solid #fddccc;display:flex;gap:14px;align-items:center">
                    <span style="font-size:18px">🛵</span>
                    <div>
                      <span style="font-size:13px;font-weight:700;color:#e66a26">${leg.distance?.text ?? ""}</span>
                      <span style="font-size:12px;color:#555;margin-left:6px">· ${leg.duration?.text ?? ""}</span>
                    </div>
                  </div>
                </div>`);
            }
          }
        );
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    };

    const geocodePromises = addressOrders.map(
      (order) =>
        new Promise<void>((resolve) => {
          const address = order.address!.trim();
          const cached = geocodeCacheRef.current.get(address);
          if (cached) {
            placeMarker(order, cached);
            resolve();
            return;
          }

          geocoder.geocode({ address }, (results: any, status: any) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const location = results[0].geometry.location;
              const pos = { lat: location.lat(), lng: location.lng() };
              geocodeCacheRef.current.set(address, pos);
              placeMarker(order, pos);
            }
            resolve();
          });
        })
    );

    Promise.all(geocodePromises).then(() => {
      if (userInteractedRef.current) return;
      if (bounds.isEmpty()) {
        map.setCenter(storePosition);
        map.setZoom(12);
        return;
      }
      map.fitBounds(bounds, 70);
    });
  }, [orders, storePosition]);

  return (
    <div className="rounded-2xl border border-red-100/80 bg-white/90 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xl font-bold text-[#1d1d1f]">Mappa Operativa</h2>
        <div className="flex items-center gap-2">
          {routeLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Calcolo percorso…</span>
          )}
          <span className="text-xs text-gray-500">Google Maps</span>
        </div>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>
      ) : (
        <>
          <div ref={mapContainerRef} className="h-[340px] md:h-[420px] w-full rounded-xl border border-red-100/80 bg-gray-50" />

          {/* Route info pill */}
          {routeInfo && (
            <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">🛵</span>
                <div>
                  <p className="text-xs font-bold text-orange-800 leading-none">{routeInfo.customerName}</p>
                  <p className="text-[11px] text-orange-600 mt-0.5">{routeInfo.distance} · {routeInfo.duration} in auto</p>
                </div>
              </div>
              <button
                onClick={clearRoute}
                className="text-xs font-bold text-orange-400 hover:text-orange-700 transition-colors px-3 py-1 rounded-full hover:bg-orange-100"
              >
                Chiudi percorso
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Clicca un pin 🍕 per visualizzare il percorso in auto dalla pizzeria. Clicca sulla mappa per chiuderlo.
          </p>
          {loading && <p className="mt-1 text-xs text-gray-400">Caricamento mappa...</p>}
        </>
      )}
    </div>
  );
}
