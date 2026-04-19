"use client";

import { useEffect, useRef, useState } from "react";

export type GeoPosition = { lat: number; lng: number };

export function useRiderGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRef = useRef<GeoPosition | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocalizzazione non supportata dal browser.");
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        // Skip trivial updates (< ~10m) to avoid unnecessary re-renders
        const prev = lastRef.current;
        if (prev && Math.abs(prev.lat - next.lat) < 0.0001 && Math.abs(prev.lng - next.lng) < 0.0001) {
          return;
        }
        lastRef.current = next;
        setPosition(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Permesso geolocalizzazione negato."
            : "Impossibile ottenere la posizione."
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error, loading };
}
