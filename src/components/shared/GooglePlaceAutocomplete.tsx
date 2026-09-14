"use client";

import { useEffect, useRef, useState } from "react";
import { loadPlacesLibrary } from "@/lib/google-maps-loader";

type Coordinates = { lat: number; lng: number };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (coordinates: Coordinates | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

const LIVORNO_BOUNDS = {
  north: 43.6835,
  south: 43.4135,
  east: 10.4956,
  west: 10.1256,
};

export default function GooglePlaceAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder,
  className,
  required,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const valueRef = useRef(value);
  const [loadError, setLoadError] = useState("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onCoordinatesChangeRef.current = onCoordinatesChange; }, [onCoordinatesChange]);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;

    async function init() {
      if (!apiKey || !hostRef.current) {
        setLoadError("Servizio indirizzi non configurato.");
        return;
      }

      try {
        const { PlaceAutocompleteElement } = await loadPlacesLibrary(apiKey);
        if (cancelled || !hostRef.current) return;

        autocomplete = new PlaceAutocompleteElement({
          includedRegionCodes: ["it"],
          includedPrimaryTypes: ["street_address", "route", "premise", "subpremise"],
          locationRestriction: LIVORNO_BOUNDS,
          requestedLanguage: "it",
          requestedRegion: "it",
          placeholder: placeholder ?? "Via, Piazza, Numero civico",
          value: valueRef.current,
          noInputIcon: true,
        });
        autocomplete.className = `google-place-autocomplete ${className ?? ""}`.trim();
        autocomplete.setAttribute("aria-label", placeholder ?? "Indirizzo");
        if (required) autocomplete.setAttribute("aria-required", "true");

        autocomplete.addEventListener("input", () => {
          onChangeRef.current(autocomplete?.value ?? "");
          onCoordinatesChangeRef.current?.(null);
        });
        autocomplete.addEventListener("gmp-select", async (event) => {
          const prediction = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction;
          const place = prediction.toPlace();
          await place.fetchFields({ fields: ["formattedAddress", "location"] });
          if (cancelled) return;
          const address = place.formattedAddress ?? autocomplete?.value ?? "";
          if (autocomplete) autocomplete.value = address;
          onChangeRef.current(address);
          const location = place.location;
          onCoordinatesChangeRef.current?.(
            location ? { lat: location.lat(), lng: location.lng() } : null,
          );
        });
        autocomplete.addEventListener("gmp-error", () => {
          if (!cancelled) setLoadError("Impossibile caricare i suggerimenti degli indirizzi.");
        });

        hostRef.current.replaceChildren(autocomplete);
        elementRef.current = autocomplete;
      } catch (error) {
        console.error("[Google Maps] caricamento autocomplete fallito", error);
        if (!cancelled) setLoadError("Impossibile caricare i suggerimenti degli indirizzi.");
      }
    }

    void init();
    return () => {
      cancelled = true;
      autocomplete?.remove();
      if (elementRef.current === autocomplete) elementRef.current = null;
    };
  }, [apiKey, className, placeholder, required]);

  useEffect(() => {
    if (elementRef.current && elementRef.current.value !== value) {
      elementRef.current.value = value;
    }
  }, [value]);

  return (
    <>
      <div ref={hostRef} className="w-full" />
      {loadError && <p className="mt-1 ml-2 text-xs text-red-500">{loadError}</p>}
    </>
  );
}
