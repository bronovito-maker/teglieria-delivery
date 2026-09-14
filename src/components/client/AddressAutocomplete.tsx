"use client";

import { useState } from "react";
import GooglePlaceAutocomplete from "@/components/shared/GooglePlaceAutocomplete";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (coordinates: { lat: number; lng: number } | null) => void;
  required?: boolean;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChange, onCoordinatesChange, required, placeholder }: Props) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  async function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("Geolocalizzazione non disponibile");
      return;
    }
    setLocating(true);
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}&language=it&result_type=street_address`
          );
          const data = await res.json();
          const address = data.results?.[0]?.formatted_address;
          if (address) {
            onChange(address);
            onCoordinatesChange?.({ lat: coords.latitude, lng: coords.longitude });
          } else {
            setGeoError("Indirizzo non trovato");
          }
        } catch {
          setGeoError("Errore nel recupero dell'indirizzo");
        }
        setLocating(false);
      },
      () => {
        setGeoError("Accesso alla posizione negato");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <GooglePlaceAutocomplete
          value={value}
          onChange={onChange}
          onCoordinatesChange={onCoordinatesChange}
          required={required}
          placeholder={placeholder ?? "Via, Piazza, Numero civico"}
          className="client-address-autocomplete"
        />
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={locating}
          title="Usa la mia posizione"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-charcoal/10 text-charcoal/50 hover:text-terracotta hover:border-terracotta/30 transition-all disabled:opacity-40 shadow-sm"
        >
          {locating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          )}
        </button>
      </div>
      {geoError && (
        <p className="text-xs text-red-400 ml-2">{geoError}</p>
      )}
    </div>
  );
}
