"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RiderVehicleValue = "BIKE" | "SCOOTER" | "CAR";

type Props = {
  address: string;
  addressDetail?: string | null;
  vehicle?: RiderVehicleValue | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

const MAP_SCRIPT_ID = "google-maps-script";
const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };

function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
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

function parseNumber(value?: string) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function travelModeFor(vehicle?: RiderVehicleValue | null, maps?: any) {
  if (!maps) return null;
  if (vehicle === "BIKE") return maps.TravelMode.BICYCLING;
  return maps.TravelMode.DRIVING;
}

function deepLinkMode(vehicle?: RiderVehicleValue | null) {
  if (vehicle === "BIKE") return "bicycling";
  return "driving";
}

export default function RiderRouteMap({ address, addressDetail, vehicle }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const storeLat = parseNumber(process.env.NEXT_PUBLIC_STORE_LAT);
  const storeLng = parseNumber(process.env.NEXT_PUBLIC_STORE_LNG);
  const storePosition = useMemo(
    () => (storeLat !== null && storeLng !== null ? { lat: storeLat, lng: storeLng } : DEFAULT_CENTER),
    [storeLat, storeLng]
  );

  const fullDestination = useMemo(() => {
    return addressDetail ? `${address} ${addressDetail}` : address;
  }, [address, addressDetail]);

  const mapsDeepLink = useMemo(() => {
    const origin = `${storePosition.lat},${storePosition.lng}`;
    const destination = encodeURIComponent(fullDestination);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${deepLinkMode(vehicle)}`;
  }, [storePosition, fullDestination, vehicle]);

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

        mapRef.current = new maps.Map(containerRef.current, {
          center: storePosition,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        rendererRef.current = new maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: false,
          polylineOptions: { strokeColor: "#e66a26", strokeWeight: 5 },
        });

        const directionsService = new maps.DirectionsService();
        directionsService.route(
          {
            origin: storePosition,
            destination: fullDestination,
            travelMode: travelModeFor(vehicle, maps),
          },
          (result: any, status: any) => {
            if (cancelled) return;
            if (status === "OK" && result) {
              rendererRef.current.setDirections(result);
              const leg = result.routes?.[0]?.legs?.[0];
              if (leg) {
                if (leg.distance?.value != null) {
                  setDistanceKm((leg.distance.value / 1000).toFixed(1));
                }
                if (leg.duration?.value != null) {
                  setDurationMin(String(Math.round(leg.duration.value / 60)));
                }
              }
            } else {
              setError("Percorso non disponibile per questo indirizzo.");
            }
            setLoading(false);
          }
        );
      } catch {
        if (!cancelled) {
          setError("Impossibile caricare Google Maps.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey, storePosition, fullDestination, vehicle]);

  return (
    <section className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
      <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20 flex items-center justify-between">
        <h2 className="text-[9px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal">Percorso Consegna</h2>
        {(distanceKm || durationMin) && (
          <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-terracotta">
            {distanceKm ? `${distanceKm} km` : ""}{distanceKm && durationMin ? " • " : ""}{durationMin ? `${durationMin}′` : ""}
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
          <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/30">
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
