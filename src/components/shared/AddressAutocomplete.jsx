import React, { useRef, useEffect, useState, useCallback } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import Swal from "sweetalert2";

const GOOGLE_MAPS_LIBRARIES = ["places"];
const BASE_LAT = -34.74537300277807;
const BASE_LNG = -58.616586830685236;
const MAX_DISTANCE_KM = 10;

/**
 * Genera un session token único usando AutocompleteSessionToken de Google Maps
 * Esto reduce costos agrupando múltiples requests de autocomplete y place details en una sola facturación
 */
function generateSessionToken() {
    if (window.google && window.google.maps && window.google.maps.places) {
        return new window.google.maps.places.AutocompleteSessionToken();
    }
    // Fallback si Google Maps no está cargado aún
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calcula la distancia en km entre dos puntos usando la fórmula de Haversine
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Crea los bounds para restringir búsqueda a ~10km del local base
 * Aproximación: 1° lat ≈ 111km, 1° lng en -34° ≈ 92km
 */
function getSearchBounds() {
    const latDelta = 0.09;  // ~10km
    const lngDelta = 0.11;  // ~10km
    return {
        south: BASE_LAT - latDelta,
        west: BASE_LNG - lngDelta,
        north: BASE_LAT + latDelta,
        east: BASE_LNG + lngDelta,
    };
}

/**
 * Componente reutilizable de autocompletado de direcciones con Google Places.
 * - Solo permite seleccionar direcciones del desplegable (previene errores humanos)
 * - Restringe resultados a 10km del local base
 * - Devuelve dirección + coordenadas al seleccionar
 * - Muestra alerta si el usuario no encuentra su dirección en el listado
 * - Usa session tokens para reducir costos agrupando requests de autocomplete y place details
 *
 * IMPORTANTE: Los session tokens agrupan múltiples requests (autocomplete + place details)
 * en una sola facturación, reduciendo significativamente los costos de la API de Google.
 * El token se crea cuando el usuario empieza a escribir y se usa en todas las requests
 * relacionadas hasta que se selecciona un lugar.
 *
 * @param {Object} props
 * @param {string} props.value - Valor actual del input (dirección)
 * @param {Function} props.onChange - Callback al seleccionar: ({ direccion, latitud, longitud }) => void
 * @param {string} props.placeholder - Placeholder del input
 * @param {string} props.className - Clases CSS adicionales
 * @param {boolean} props.required - Si el campo es requerido
 * @param {boolean} props.disabled - Si el input está deshabilitado
 */
const AddressAutocomplete = ({
    value = "",
    onChange,
    placeholder = "Buscar dirección...",
    className = "",
    required = false,
    disabled = false,
}) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [inputValue, setInputValue] = useState(value);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState("");
    const lastValidValueRef = useRef(value);
    const blurTimeoutRef = useRef(null);
    const sessionTokenRef = useRef(null);
    const placesServiceRef = useRef(null);

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    const { isLoaded: mapsLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        setIsLoaded(mapsLoaded && !loadError && !!apiKey);
        
        // Inicializar session token cuando se carga Google Maps y el usuario empieza a escribir
        // No crear token aquí, solo cuando el usuario empieza a escribir
    }, [mapsLoaded, loadError, apiKey]);

    useEffect(() => {
        setInputValue(value);
        if (value) {
            lastValidValueRef.current = value;
        }
    }, [value]);

    // Cleanup del timeout al desmontar
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    const handlePlaceChanged = useCallback(() => {
        if (!autocompleteRef.current || !window.google) return;

        const place = autocompleteRef.current.getPlace();
        if (!place || !place.geometry || !place.geometry.location) {
            setError("Selecciona una dirección del listado");
            return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const distancia = haversineDistance(BASE_LAT, BASE_LNG, lat, lng);

        if (distancia > MAX_DISTANCE_KM) {
            const mensaje = `La dirección seleccionada está a ${distancia.toFixed(1)}km del local. No realizamos entregas a más de ${MAX_DISTANCE_KM}km.`;
            setError(`La dirección debe estar a máximo ${MAX_DISTANCE_KM}km del local`);
            setInputValue("");
            onChange?.({ direccion: "", latitud: null, longitud: null });
            
            // Invalidar session token después de obtener place details (aunque sea inválido)
            if (sessionTokenRef.current && place.place_id) {
                // Obtener place details con el session token para completar la sesión
                if (!placesServiceRef.current && window.google.maps.places) {
                    placesServiceRef.current = new window.google.maps.places.PlacesService(
                        document.createElement('div')
                    );
                }
                
                if (placesServiceRef.current) {
                    placesServiceRef.current.getDetails({
                        placeId: place.place_id,
                        fields: ['formatted_address', 'geometry'],
                        sessionToken: sessionTokenRef.current
                    }, () => {
                        // Después de obtener detalles, invalidar el token
                        sessionTokenRef.current = null;
                    });
                } else {
                    sessionTokenRef.current = null;
                }
            } else {
                sessionTokenRef.current = null;
            }
            
            Swal.fire({
                title: 'Zona fuera de cobertura',
                html: `${mensaje}<br><br><small>Por favor, selecciona una dirección dentro de nuestra zona de entrega.</small>`,
                icon: 'warning',
                confirmButtonColor: '#ffc107',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const direccion = place.formatted_address || place.name || "";
        setError("");
        setInputValue(direccion);
        lastValidValueRef.current = direccion;
        
        // Obtener place details con el session token para completar la sesión y reducir costos
        if (sessionTokenRef.current && place.place_id) {
            if (!placesServiceRef.current && window.google.maps.places) {
                placesServiceRef.current = new window.google.maps.places.PlacesService(
                    document.createElement('div')
                );
            }
            
            if (placesServiceRef.current) {
                placesServiceRef.current.getDetails({
                    placeId: place.place_id,
                    fields: ['formatted_address', 'geometry'],
                    sessionToken: sessionTokenRef.current
                }, (details, status) => {
                    // Después de obtener detalles, invalidar el token y generar uno nuevo
                    sessionTokenRef.current = null;
                    
                    // Si hay un error, usar los datos del place original
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
                        const finalLat = details.geometry?.location?.lat() || lat;
                        const finalLng = details.geometry?.location?.lng() || lng;
                        const finalDireccion = details.formatted_address || direccion;
                        
                        onChange?.({ 
                            direccion: finalDireccion, 
                            latitud: finalLat, 
                            longitud: finalLng 
                        });
                    } else {
                        onChange?.({ direccion, latitud: lat, longitud: lng });
                    }
                });
            } else {
                onChange?.({ direccion, latitud: lat, longitud: lng });
                sessionTokenRef.current = null;
            }
        } else {
            onChange?.({ direccion, latitud: lat, longitud: lng });
        }
    }, [onChange]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        
        // Si el usuario empieza a escribir y no hay session token, crear uno nuevo
        if (newValue && !sessionTokenRef.current && isLoaded && window.google && window.google.maps && window.google.maps.places) {
            sessionTokenRef.current = generateSessionToken();
            // Actualizar el autocomplete con el nuevo session token
            if (autocompleteRef.current) {
                const bounds = getSearchBounds();
                autocompleteRef.current.setOptions({
                    bounds: bounds,
                    strictBounds: true,
                    componentRestrictions: { country: "ar" },
                    fields: ["formatted_address", "geometry", "name", "place_id"],
                    sessionToken: sessionTokenRef.current
                });
            }
        }
        
        if (newValue === "") {
            setError("");
            onChange?.({ direccion: "", latitud: null, longitud: null });
            // Resetear session token cuando se limpia el campo
            sessionTokenRef.current = null;
        }
    };

    const handleFocus = () => {
        setError("");
        // Limpiar timeout si existe
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
    };

    const handleBlur = () => {
        // Limpiar timeout anterior si existe
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
        }

        // Esperar un momento para que el autocomplete procese la selección
        blurTimeoutRef.current = setTimeout(() => {
            // Si hay texto pero no hay valor válido seleccionado, limpiar el campo
            if (!value && inputValue) {
                setInputValue("");
            }
        }, 300); // Delay para permitir que el autocomplete procese la selección
    };

    // Función para obtener las opciones del autocomplete con session token
    // Debe estar antes de los returns condicionales para cumplir con las reglas de hooks
    const getAutocompleteOptions = useCallback(() => {
        const bounds = getSearchBounds();
        const options = {
            bounds: bounds,
            strictBounds: true,
            componentRestrictions: { country: "ar" },
            fields: ["formatted_address", "geometry", "name", "place_id"],
        };
        
        // Agregar session token si existe (se crea cuando el usuario empieza a escribir)
        if (sessionTokenRef.current) {
            options.sessionToken = sessionTokenRef.current;
        }
        
        return options;
    }, []);

    // Sin API key: fallback a input normal (para desarrollo o si no configuran la key)
    if (!apiKey) {
        return (
            <div className="address-autocomplete-wrapper">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className={`form-control fs-6 p-1 mb-1 ${className}`}
                    required={required}
                    disabled={disabled}
                    autoComplete="off"
                />
                <small className="text-warning d-block">
                    Configura REACT_APP_GOOGLE_MAPS_API_KEY para autocompletado de direcciones
                </small>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="address-autocomplete-wrapper">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className={`form-control fs-6 p-1 mb-1 ${className}`}
                    required={required}
                    disabled={disabled}
                    autoComplete="off"
                />
                <small className="text-danger d-block">Error al cargar Google Maps</small>
            </div>
        );
    }

    return (
        <div className="address-autocomplete-wrapper">
            {isLoaded ? (
                <Autocomplete
                    onLoad={(autocomplete) => {
                        autocompleteRef.current = autocomplete;
                        // No crear session token aquí, solo cuando el usuario empieza a escribir
                        // Configurar opciones iniciales sin session token
                        autocomplete.setOptions(getAutocompleteOptions());
                    }}
                    onUnmount={() => {
                        autocompleteRef.current = null;
                        // Limpiar session token al desmontar
                        sessionTokenRef.current = null;
                    }}
                    options={getAutocompleteOptions()}
                    onPlaceChanged={handlePlaceChanged}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        className={`form-control fw-bold fs-6 p-1 mb-1 ${className} ${error ? "is-invalid" : ""}`}
                        required={required}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </Autocomplete>
            ) : (
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className={`form-control fs-6 p-1 mb-1 ${className}`}
                    required={required}
                    disabled={disabled}
                    autoComplete="off"
                />
            )}
            {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
    );
};

export default AddressAutocomplete;
export { BASE_LAT, BASE_LNG, MAX_DISTANCE_KM };
