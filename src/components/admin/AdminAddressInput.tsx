"use client";

import { useRef } from "react";

const CALLBACK_NAME = "_mapsPlacesReady";
const SCRIPT_ID = "google-maps-places-script";
let scriptLoading = false;
let scriptReady = false;
const pendingCallbacks: (() => void)[] = [];

function loadMapsPlaces(apiKey: string, onReady: () => void): void {
  // Already loaded by another module instance (e.g. AddressAutocomplete)
  if (window.google?.maps?.places?.Autocomplete) { scriptReady = true; onReady(); return; }
  if (scriptReady) { onReady(); return; }
  pendingCallbacks.push(onReady);
  if (scriptLoading || document.getElementById(SCRIPT_ID)) return;
  scriptLoading = true;

  (window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => {
    scriptReady = true;
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks.length = 0;
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${CALLBACK_NAME}&language=it`;
  script.async = true;
  script.onerror = () => { scriptLoading = false; pendingCallbacks.length = 0; };
  document.head.appendChild(script);
}

function setupAutocomplete(input: HTMLInputElement, onChange: (v: string) => void): void {
  if (!window.google?.maps?.places?.Autocomplete) return;

  const livornoCenter = new window.google.maps.LatLng(43.5485, 10.3106);
  const livornoBounds = new window.google.maps.Circle({
    center: livornoCenter,
    radius: 15000,
  }).getBounds();

  const ac = new window.google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "it" },
    bounds: livornoBounds,
    strictBounds: true,
    fields: ["formatted_address"],
    types: ["address"],
  });

  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (place?.formatted_address) onChange(place.formatted_address);
  });
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export default function AdminAddressInput({ value, onChange, required, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function handleFocus() {
    if (initialized.current || !apiKey || !inputRef.current) return;
    initialized.current = true;
    const input = inputRef.current;
    loadMapsPlaces(apiKey, () => setupAutocomplete(input, onChange));
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      required={required}
      autoComplete="off"
      className={className}
    />
  );
}
