import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];
const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export function GoogleMapsProvider({ children }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  if (!isLoaded) return null;

  return children;
}