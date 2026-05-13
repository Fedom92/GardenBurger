import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Autocomplete } from "@react-google-maps/api";

const BASE_LAT = Number(process.env.REACT_APP_BASE_LATITUD);
const BASE_LNG = Number(process.env.REACT_APP_BASE_LONGITUD);
const MAX_DISTANCE_KM = Number(process.env.REACT_APP_MAXKM);

// Bounds aproximados para ~X km alrededor del local
function getSearchBounds() {
  const latDelta = MAX_DISTANCE_KM / 111;

  const lngDelta =
    MAX_DISTANCE_KM /
    (111 * Math.cos((BASE_LAT * Math.PI) / 180));

  return {
    south: BASE_LAT - latDelta,
    west: BASE_LNG - lngDelta,
    north: BASE_LAT + latDelta,
    east: BASE_LNG + lngDelta,
  };
}

const AutocompleteGoogle = ({
  value = "",
  onChange,
  placeholder = "Buscar dirección...",
  className = "",
  required = false,
  disabled = false,
}) => {
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState("");

  // Sincronizar con value externo
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const bounds = useMemo(() => getSearchBounds(), []);

  const autocompleteOptions = useMemo(
    () => ({
      bounds,
      strictBounds: true,
      types: ['address'], // Restringe para buscar solo direcciones exactas
      componentRestrictions: { country: "ar" },
      fields: ["address_components", "geometry"],
    }),
    [bounds]
  );

  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place?.geometry?.location) {
      setError("Selecciona una dirección válida del listado");
      setInputValue("");
      onChange?.({
        direccion: "",
        latitud: null,
        longitud: null,
      });
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const components = place.address_components;
    const street = components.find(c => c.types.includes("route"))?.long_name;
    const number = components.find(c => c.types.includes("street_number"))?.long_name;
    const neighborhood = components.find(c => c.types.includes("sublocality"))?.long_name;
    const city = components.find(c => c.types.includes("locality"))?.long_name;

    if (!number) {
      setError("Por favor ingresa una dirección exacta con altura/número");
      setInputValue(place.name || "");
      onChange?.({
        direccion: "",
        latitud: null,
        longitud: null,
      });
      return;
    }

    const direccion = [street + " " + number, neighborhood, city].filter(Boolean).join(", ");

    setInputValue(direccion);
    setError("");

    onChange?.({
      direccion,
      latitud: lat,
      longitud: lng,
    });
  }, [onChange]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Limpiar el error apenas el usuario empiece a escribir de nuevo
    if (error) {
      setError("");
    }

    if (newValue === "") {
      onChange?.({
        direccion: "",
        latitud: null,
        longitud: null,
      });
    }
  };

  return (
    <div>
      <Autocomplete
        onLoad={(autocomplete) => {
          autocompleteRef.current = autocomplete;
        }}
        onUnmount={() => {
          autocompleteRef.current = null;
        }}
        options={autocompleteOptions}
        onPlaceChanged={handlePlaceChanged}
      >
        <input
          type="text"
          value={inputValue}
          onPaste={(e) => e.preventDefault()}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`form-control fs-6 p-1 mb-1 ${className} ${error ? "is-invalid" : ""
            }`}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
      </Autocomplete>

      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </div>
  );
};

export default AutocompleteGoogle;
export { BASE_LAT, BASE_LNG, MAX_DISTANCE_KM };