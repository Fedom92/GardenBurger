// Utils/googleMaps.js
// El buscador de direcciones de la web pública, con Places API (New) de Google. Lo
// único que se le pide a Google son las sugerencias mientras el cliente escribe y,
// cuando elige una, su dirección y sus coordenadas; la distancia y la zona las
// calcula Utils/zonasEnvio.js sin Google.
//
// Lo que se factura es por consulta, no por sugerencia mostrada. Para que sean pocas:
// - el script se carga recién cuando el cliente elige Delivery, no al entrar;
// - el buscador espera a que deje de escribir y a que haya al menos 3 letras
//   (BuscadorDireccion);
// - todas las consultas hasta que elige una van en una SESIÓN (sessionToken), que
//   Google cobra como una sola búsqueda al pedir los datos del lugar elegido.
//
// La clave (REACT_APP_googleMapsKey) es pública por diseño: va en el navegador. La
// protege su restricción por dominio y por API en la consola de Google Cloud. Sin
// clave, o si Google no responde, la web vuelve a la dirección en texto libre y la
// zona la elige el cajero, como antes.

const CLAVE = process.env.REACT_APP_googleMapsKey;

export const hayGoogleMaps = () => Boolean(CLAVE);

let carga = null;

// El script con `loading=async`: cuando Google llama al callback, existe
// google.maps.importLibrary. Una sola carga por página; si falla, se puede
// reintentar en la próxima.
const cargarGoogleMaps = () => {
    if (!CLAVE) return Promise.reject(new Error("Falta REACT_APP_googleMapsKey"));
    if (!carga) {
        carga = new Promise((resolve, reject) => {
            const callback = "__gbGoogleMapsListo";
            window[callback] = () => {
                delete window[callback];
                resolve(window.google.maps);
            };
            const parametros = new URLSearchParams({
                key: CLAVE, v: "weekly", loading: "async", language: "es", region: "AR", callback,
            });
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?${parametros}`;
            script.async = true;
            script.onerror = () => {
                carga = null;
                script.remove();
                reject(new Error("No se pudo cargar Google Maps"));
            };
            document.head.appendChild(script);
        });
    }
    return carga;
};

const places = async () => (await cargarGoogleMaps()).importLibrary("places");

// Una sesión nueva por búsqueda: se crea con la primera consulta y se cierra al
// elegir una dirección.
export const nuevaSesion = async () => {
    const { AutocompleteSessionToken } = await places();
    return new AutocompleteSessionToken();
};

// Las sugerencias para `texto`, dentro del rectángulo `limites` (ver
// limitesDeBusqueda) y a no más de `radioKm` de `centro`. `distanceMeters` es en
// línea recta desde `origin`: con eso se descartan las esquinas del rectángulo.
export const sugerirDirecciones = async (texto, { centro, limites, radioKm, sesion }) => {
    const { AutocompleteSuggestion } = await places();
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: texto,
        sessionToken: sesion,
        locationRestriction: limites,
        origin: centro,
        includedRegionCodes: ["ar"],
        language: "es",
        region: "ar",
    });
    return suggestions
        .map((s) => s.placePrediction)
        .filter((p) => p && (p.distanceMeters == null || p.distanceMeters <= radioKm * 1000))
        .map((p) => ({
            id: p.placeId,
            principal: p.mainText?.text || p.text.text,
            secundario: p.secondaryText?.text || "",
            prediccion: p,
        }));
};

// Los datos de la sugerencia elegida. Cierra la sesión. Los tres campos son de la
// categoría básica (Essentials) de Place Details: pedir otros sube el precio.
//
// La dirección se guarda corta ("Jara 1250, Localidad"), que es lo que lee el
// repartidor; la larga de Google trae código postal, provincia y país.
// `tieneAltura`: una calle sin número da el punto medio de la calle, y la zona
// saldría de cualquier lado.
export const datosDeDireccion = async (sugerencia) => {
    const lugar = sugerencia.prediccion.toPlace();
    await lugar.fetchFields({ fields: ["formattedAddress", "location", "addressComponents"] });
    const componente = (tipo) => (lugar.addressComponents || []).find((c) => c.types.includes(tipo));
    const calle = componente("route")?.shortText;
    const altura = componente("street_number")?.longText;
    const ciudad = componente("locality")?.longText;
    return {
        direccion: calle && altura ? `${calle} ${altura}${ciudad ? `, ${ciudad}` : ""}` : lugar.formattedAddress,
        ubicacion: { lat: lugar.location.lat(), lng: lugar.location.lng() },
        tieneAltura: Boolean(altura),
    };
};
