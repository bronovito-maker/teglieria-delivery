"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RiderVehicleValue = "BIKE" | "SCOOTER" | "CAR";

type Props = {
  address: string;
  addressDetail?: string | null;
  vehicle?: RiderVehicleValue | null;
};

type GeoPos = { lat: number; lng: number };

declare global {
  interface Window {
    google?: any;
  }
}

const MAP_SCRIPT_ID = "google-maps-script";
const STORE_POSITION: GeoPos = {
  lat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? "43.5261962"),
  lng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? "10.3371522"),
};

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
    script.onerror = () => reject(new Error("Errore caricamento Google Maps"));
    document.head.appendChild(script);
  });
}

/** Parse Routes API v2 duration string like "123s" → 123 */
function parseDuration(d: string | undefined | null): number {
  if (!d) return 0;
  return parseInt(d.replace("s", ""), 10) || 0;
}

/** Decode Google encoded polyline → array of {lat, lng} */
function decodePolyline(encoded: string): GeoPos[] {
  const points: GeoPos[] = [];
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

function routesTravelMode(vehicle?: RiderVehicleValue | null): "DRIVE" | "BICYCLE" {
  return vehicle === "BIKE" ? "BICYCLE" : "DRIVE";
}

function deepLinkMode(vehicle?: RiderVehicleValue | null) {
  return vehicle === "BIKE" ? "bicycling" : "driving";
}

export default function RiderRouteMap({ address, addressDetail, vehicle }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const fullDestination = useMemo(
    () => (addressDetail ? `${address}, ${addressDetail}` : address),
    [address, addressDetail]
  );

  const mapsDeepLink = useMemo(() => {
    const origin = `${STORE_POSITION.lat},${STORE_POSITION.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(fullDestination)}&travelmode=${deepLinkMode(vehicle)}`;
  }, [fullDestination, vehicle]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) {
        setError("Manca NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
        setLoading(false);
        return;
      }
      if (!containerRef.current) return;

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        // Init map
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
        mapRef.current = new maps.Map(containerRef.current, {
          center: STORE_POSITION,
          zoom: 13,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
        });

        // Store marker
        const storePin = document.createElement("div");
        storePin.style.cssText =
          "width:28px;height:28px;border-radius:50%;background:#ef4444;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.25)";
        storePin.textContent = "🏠";
        new maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: STORE_POSITION,
          title: "La Teglieria",
          content: storePin,
        });

        // Routes API v2 — accepts address text as destination
        const mode = routesTravelMode(vehicle);
        const res = await fetch(
          "https://routes.googleapis.com/directions/v2:computeRoutes",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
            },
            body: JSON.stringify({
              origin: {
                location: {
                  latLng: {
                    latitude: STORE_POSITION.lat,
                    longitude: STORE_POSITION.lng,
                  },
                },
              },
              destination: { address: fullDestination },
              travelMode: mode,
              routingPreference:
                mode === "DRIVE" ? "TRAFFIC_AWARE" : "ROUTING_PREFERENCE_UNSPECIFIED",
            }),
          }
        );

        if (cancelled) return;

        const data = await res.json();
        const route = data?.routes?.[0];

        if (!route) {
          setError("Percorso non disponibile per questo indirizzo.");
          setLoading(false);
          return;
        }

        const durationSec = parseDuration(route.duration);
        setDistanceKm(((route.distanceMeters ?? 0) / 1000).toFixed(1));
        setDurationMin(String(Math.round(durationSec / 60)));

        // Draw polyline
        const path = decodePolyline(route.polyline?.encodedPolyline ?? "");
        if (path.length > 0) {
          if (polylineRef.current) polylineRef.current.setMap(null);
          polylineRef.current = new maps.Polyline({
            path,
            strokeColor: "#e66a26",
            strokeWeight: 5,
            strokeOpacity: 0.85,
            map: mapRef.current,
          });

          // Destination marker at last polyline point
          const dest = path[path.length - 1];
          const destPin = document.createElement("div");
          destPin.style.cssText =
            "width:32px;height:32px;border-radius:50%;background:white;border:2.5px solid #e66a26;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.2)";
          destPin.textContent = "📍";
          new maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: dest,
            title: address,
            content: destPin,
          });

          // Fit map to route
          const bounds = new maps.LatLngBounds();
          path.forEach((p: GeoPos) => bounds.extend(p));
          mapRef.current.fitBounds(bounds, 48);
        }

        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Impossibile caricare la mappa.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey, fullDestination, vehicle]);

  return (
    <section className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
      <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20 flex items-center justify-between">
        <h2 className="text-[9px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal">
          Percorso Consegna
        </h2>
        {(distanceKm || durationMin) && (
          <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-terracotta">
            {distanceKm ? `${distanceKm} km` : ""}
            {distanceKm && durationMin ? " • " : ""}
            {durationMin ? `${durationMin}′` : ""}
          </span>
        )}
      </div>
      <div className="p-6 md:p-8 space-y-4">
        {error ? (
          <div className="rounded-2xl border border-terracotta/20 bg-terracotta/5 text-terracotta text-[11px] font-brand font-bold uppercase tracking-widest p-4">
            {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-[260px] md:h-[360px] w-full rounded-[2rem] border border-charcoal/5 bg-warm-light/40"
          />
        )}
        {loading && !error && (
          <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/30 animate-pulse">
            Caricamento percorso...
          </p>
        )}
        <a
          href={mapsDeepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-5 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-terracotta transition-all active:scale-95"
        >
          Apri in Google Maps
        </a>
      </div>
    </section>
  );
}
