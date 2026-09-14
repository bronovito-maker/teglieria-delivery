import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configuredKey: string | null = null;

function configureGoogleMaps(apiKey: string) {
  if (configuredKey) {
    if (configuredKey !== apiKey) {
      throw new Error("Google Maps è già stato inizializzato con una API key diversa.");
    }
    return;
  }

  setOptions({
    key: apiKey,
    v: "weekly",
    language: "it",
    region: "IT",
    authReferrerPolicy: "origin",
  });
  configuredKey = apiKey;
}

export async function loadMapsLibrary(apiKey: string) {
  configureGoogleMaps(apiKey);
  return importLibrary("maps");
}

export async function loadMarkerLibrary(apiKey: string) {
  configureGoogleMaps(apiKey);
  return importLibrary("marker");
}

export async function loadPlacesLibrary(apiKey: string) {
  configureGoogleMaps(apiKey);
  return importLibrary("places");
}

