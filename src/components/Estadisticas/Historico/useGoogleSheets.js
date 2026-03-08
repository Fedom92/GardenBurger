import { useState, useEffect, useCallback } from "react";

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

async function fetchTSV(filename, keyMap) {
    const response = await fetch(`${process.env.PUBLIC_URL}/${filename}`);
    const text = await response.text();
    return parseTSV(text, keyMap);
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
 * Carga ventas.tsv y pagos.tsv desde public/CSV/ una sola vez al montar.
 *
 * Retorna: { ventas, pagos, loading }
 *
 * Propiedades de cada objeto en `pagos`:
 *   timestamp, nroTicket, total, metodoPago, montoEfectivo,
 *   envio, nombre, direccion, entreCalles, telefono,
 *   observaciones, delivery, cancelado, quienElimino, sucursal
 *
 * Propiedades de cada objeto en `ventas`:
 *   timestamp, nroTicket, idArticulo, descripcion,
 *   categoria, cantidad, precioUnitario
 */
export function useSheetData() {
    const [ventas, setVentas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);

    const cargarDatos = useCallback(async () => {
        try {
            const [datosVentas, datosPagos] = await Promise.all([
                fetchTSV("CSV/ventas.tsv", VENTAS_KEYS),
                fetchTSV("CSV/pagos.tsv", PAGOS_KEYS),
            ]);
            setVentas(datosVentas);
            setPagos(datosPagos);
        } catch (err) {
            console.error("[useSheetData]", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    return { ventas, pagos, loading };
}
