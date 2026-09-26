import { useState, useEffect, useCallback } from "react";
import { ref, getBytes } from "firebase/storage";
import { storage } from "../../../firebaseConfig/firebase";

// Carpeta privada de Storage: la regla es `allow read: if esAdmin()`, y está
// excluida del wildcard para que el `read` más laxo de ahí no le gane.
const RUTA = "privado/estadisticas";

/**
 * Parsea un archivo TSV (separado por tabulaciones) y devuelve
 * un array de objetos con claves normalizadas (camelCase).
 *
 * @param {string} tsvText   - Contenido crudo del archivo TSV
 * @param {Object} keyMap    - Mapa { "Header Original": "camelCaseKey" }
 * @returns {Object[]}
 */
function parseTSV(tsvText, keyMap) {
    const lines = tsvText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    if (lines.length < 2) return [];

    const headers = lines[0].split("\t");

    return lines
        .slice(1)
        .filter(line => line.trim() !== "")
        .map(line => {
            const values = line.split("\t");
            const obj = {};
            headers.forEach((header, i) => {
                const key = keyMap[header.trim()] ?? header.trim();
                obj[key] = (values[i] ?? "").trim();
            });
            return obj;
        });
}

// getBytes y no la URL de descarga: la URL con token de descarga SALTEA las
// reglas, así que serviría el archivo a cualquiera que la tuviera. getBytes va
// por el SDK con el token del usuario y pasa por `allow read: if esAdmin()`.
//
// Los TSV están en UTF-8 (verificado: "Dirección" viene como C3 B3).
async function leerTSV(archivo, keyMap) {
    const bytes = await getBytes(ref(storage, `${RUTA}/${archivo}`));
    return parseTSV(new TextDecoder("utf-8").decode(bytes), keyMap);
}

// ── Mapas de columnas ─────────────────────────────────────────────────────────

const PAGOS_KEYS = {
    "TimeStamp": "timestamp",
    "ID_NRO_TICKET": "nroTicket",
    "Total": "total",
    "Metodo Pago": "metodoPago",
    "MontoEfectivo %": "montoEfectivo",
    "Envio": "envio",
    "Nombre": "nombre",
    "Dirección": "direccion",
    "Entre Calles": "entreCalles",
    "Telefono": "telefono",
    "Observaciones": "observaciones",
    "Delivery": "delivery",
    "¿Ticket cancelado?": "cancelado",
    "¿Quien eliminó?": "quienElimino",
    "ID_SUCURSAL": "sucursal",
    "Zona Envio": "zonaEnvio",
};

const VENTAS_KEYS = {
    "TimeStamp": "timestamp",
    "ID_NRO_TICKET": "nroTicket",
    "ID_ARTICULO": "idArticulo",
    "Descripcion": "descripcion",
    "Categoria": "categoria",
    "Cantidad": "cantidad",
    "Precio Unitario": "precioUnitario",
};

// ── Hook público ──────────────────────────────────────────────────────────────

/**
 * Carga ventas.tsv y pagos.tsv de `privado/estadisticas` en Storage, una sola vez
 * al montar. Los sube el admin a mano desde la Consola de Firebase.
 *
 * Antes vivían en `public/CSV/` y se leían con fetch. Eso los publicaba: todo lo
 * que está en `public/` se copia al build y el hosting lo sirve sin sesión, así
 * que la base entera de clientes —nombre, dirección y teléfono de 43.000
 * pedidos— quedaba descargable por cualquiera que supiera la URL.
 *
 * Retorna: { ventas, pagos, loading, error }
 */
export function useSheetData() {
    const [ventas, setVentas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const cargarDatos = useCallback(async () => {
        try {
            const [datosVentas, datosPagos] = await Promise.all([
                leerTSV("ventas.tsv", VENTAS_KEYS),
                leerTSV("pagos.tsv", PAGOS_KEYS),
            ]);
            setVentas(datosVentas);
            setPagos(datosPagos);
        } catch (err) {
            console.error("[useSheetData]", err);
            // Los tres casos que realmente pasan, cada uno con lo que hay que hacer.
            if (err.code === "storage/object-not-found") {
                setError(`Faltan los exports en Storage. Subí ventas.tsv y pagos.tsv a ${RUTA}/ desde la Consola de Firebase.`);
            } else if (err.code === "storage/unauthorized") {
                setError("No tenés permiso para leer los exports. Hace falta el rol admin: si te lo asignaron recién, cerrá sesión y volvé a entrar.");
            } else {
                setError("No se pudieron cargar los exports. Revisá la conexión e intentá de nuevo.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    return { ventas, pagos, loading, error };
}
