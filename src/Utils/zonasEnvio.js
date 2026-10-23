// Utils/zonasEnvio.js
// El envío por distancia de la web pública: de la dirección que el cliente elige en
// Google Maps a una zona de `envios`. Todo puro (con tests en zonasEnvio.test.js);
// lo que habla con Google está en Utils/googleMaps.js.
//
// Las zonas son los documentos de `envios` cuyo nombre es un rango en km, "3-4":
// la web lee ese texto, así que el ABM de Envíos no deja guardar otro formato.
// "Retira" y "Espera Afuera" (ENVIOS_LOCALES) no son rangos y quedan afuera solas.
//
// La distancia es en línea recta desde la sucursal, gratis y sin pedirle nada a
// Google. Por calle siempre es igual o más: un cliente a 8,5 km en línea recta está
// fuera del reparto por cualquier camino.

// Cuánto más allá de la última zona se sugieren direcciones. Con la última en 8 km,
// el buscador propone hasta 12: el que está a 8,5 encuentra su calle y lee "No
// llegamos hasta tu dirección" en vez de pensar que la web no la conoce.
const MARGEN_SUGERENCIAS_KM = 4;

const RADIO_TIERRA_KM = 6371;
const KM_POR_GRADO = 111.32;

// "3-4" → { desde: 3, hasta: 4 }. Acepta decimales ("2.5-3" o "2,5-3") y espacios.
// Cualquier otra cosa, null.
export const rangoDeZona = (zona) => {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*$/.exec(zona || "");
    if (!m) return null;
    const [desde, hasta] = [m[1], m[2]].map((n) => Number(n.replace(",", ".")));
    return hasta > desde ? { desde, hasta } : null;
};

// Las zonas con rango, de la más cercana a la más lejana.
const zonasConRango = (envios = []) => envios
    .map((e) => ({ envio: e, rango: rangoDeZona(e.zona_envio) }))
    .filter((z) => z.rango)
    .sort((a, b) => a.rango.hasta - b.rango.hasta);

// Hasta dónde llega el reparto: el `hasta` de la última zona. 0 sin zonas.
export const alcanceKm = (envios) => {
    const zonas = zonasConRango(envios);
    return zonas.length ? zonas[zonas.length - 1].rango.hasta : 0;
};

export const radioSugerenciasKm = (envios) => alcanceKm(envios) + MARGEN_SUGERENCIAS_KM;

// La zona que cubre `km`, como la guarda la Caja ({ zona_envio, costo_envio }), o
// null si queda fuera del reparto. La primera cuyo `hasta` alcanza: un borde exacto
// (3 km justos) cae en la más barata, y si faltara una zona en el medio, cobra la
// siguiente en vez de dejar al cliente sin delivery.
export const zonaPorDistancia = (km, envios) => {
    const zona = zonasConRango(envios).find((z) => km <= z.rango.hasta);
    return zona ? { zona_envio: zona.envio.zona_envio, costo_envio: Number(zona.envio.costo_envio) || 0 } : null;
};

const radianes = (grados) => (grados * Math.PI) / 180;

// Distancia en línea recta (haversine) entre dos { lat, lng }, en km.
export const distanciaKm = (a, b) => {
    const dLat = radianes(b.lat - a.lat);
    const dLng = radianes(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
};

// El rectángulo que contiene el círculo de `radioKm` alrededor de `centro`: el
// buscador de Google restringe a un rectángulo, no a un círculo. Las esquinas
// sobrantes se descartan después por distancia.
export const limitesDeBusqueda = (centro, radioKm) => {
    const dLat = radioKm / KM_POR_GRADO;
    const dLng = radioKm / (KM_POR_GRADO * Math.cos(radianes(centro.lat)));
    return { north: centro.lat + dLat, south: centro.lat - dLat, east: centro.lng + dLng, west: centro.lng - dLng };
};

export const esUbicacion = (u) =>
    Number.isFinite(u?.lat) && Number.isFinite(u?.lng) && Math.abs(u.lat) <= 90 && Math.abs(u.lng) <= 180;

// Las coordenadas que el admin pega desde Google Maps (clic derecho sobre el local):
// "-34.74550, -58.59092" → { lat, lng }. Vacío o inválido, null.
export const leerUbicacion = (texto) => {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(texto || "");
    if (!m) return null;
    const ubicacion = { lat: Number(m[1]), lng: Number(m[2]) };
    return esUbicacion(ubicacion) ? ubicacion : null;
};

export const textoUbicacion = (u) => (esUbicacion(u) ? `${u.lat}, ${u.lng}` : "");
