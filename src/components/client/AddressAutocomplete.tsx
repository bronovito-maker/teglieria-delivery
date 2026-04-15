"use client";

import { useRef, useState } from "react";

const CALLBACK_NAME = "_mapsPlacesReady";
let scriptLoading = false;
let scriptReady = false;
const pendingCallbacks: (() => void)[] = [];

function loadMapsPlaces(apiKey: string, onReady: () => void): void {
  if (scriptReady) {
    onReady();
    return;
  }

  pendingCallbacks.push(onReady);

  if (scriptLoading) return;
  scriptLoading = true;

  (window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => {
    scriptReady = true;
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks.length = 0;
  };

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${CALLBACK_NAME}&language=it`;
  script.async = true;
  script.onerror = () => {
    scriptLoading = false;
    pendingCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

function setupAutocomplete(input: HTMLInputElement, onChange: (value: string) => void): void {
  if (!window.google?.maps?.places?.Autocomplete) return;

  // Bounding box centrato su Livorno (~15km raggio)
  const livornoCenter = new window.google.maps.LatLng(43.5485, 10.3106);
  const livornoBounds = new window.google.maps.Circle({
    center: livornoCenter,
    radius: 15000,
  }).getBounds();

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "it" },
    bounds: livornoBounds,
    strictBounds: true,
    fields: ["formatted_address"],
    types: ["address"],
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place?.formatted_address) {
      onChange(place.formatted_address);
    }
  });
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChange, required, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteInitialized = useRef(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function handleFocus() {
    if (autocompleteInitialized.current || !apiKey || !inputRef.current) return;
    autocompleteInitialized.current = true;

    const input = inputRef.current;
    loadMapsPlaces(apiKey, () => setupAutocomplete(input, onChange));
  }

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
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          required={required}
          placeholder={placeholder ?? "Via, Piazza, Numero civico"}
          autoComplete="off"
          className="w-full px-6 py-4 pr-14 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 transition-all outline-none text-sm"
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
