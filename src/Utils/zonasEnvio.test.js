// Tests del envío por distancia de la web pública. Se corren con `npm test`.
import {
    rangoDeZona, alcanceKm, radioSugerenciasKm, zonaPorDistancia, distanciaKm, limitesDeBusqueda,
    leerUbicacion, textoUbicacion,
} from "./zonasEnvio";

// Las zonas de hoy, desordenadas como vienen de Firestore.
const ENVIOS = [
    { zona_envio: "Retira", costo_envio: 0 },
    { zona_envio: "4-5", costo_envio: 3000 },
    { zona_envio: "0-1", costo_envio: 1300 },
    { zona_envio: "6-7", costo_envio: 4800 },
    { zona_envio: "5-6", costo_envio: 3500 },
    { zona_envio: "3-4", costo_envio: 2300 },
    { zona_envio: "Espera Afuera", costo_envio: 0 },
    { zona_envio: "1-2", costo_envio: 1800 },
    { zona_envio: "2-3", costo_envio: 2100 },
    { zona_envio: "7-8", costo_envio: 5800 },
];

describe("las zonas", () => {
    test("un rango en km se lee; Retira, Espera Afuera y lo mal escrito, no", () => {
        expect(rangoDeZona("3-4")).toEqual({ desde: 3, hasta: 4 });
        expect(rangoDeZona(" 2,5 - 3 ")).toEqual({ desde: 2.5, hasta: 3 });
        expect(rangoDeZona("Retira")).toBeNull();
        expect(rangoDeZona("Espera Afuera")).toBeNull();
        expect(rangoDeZona("3 a 4 km")).toBeNull();
        expect(rangoDeZona("4-3")).toBeNull();
    });

    test("el reparto llega hasta la última zona, y se sugiere 4 km más allá", () => {
        expect(alcanceKm(ENVIOS)).toBe(8);
        expect(radioSugerenciasKm(ENVIOS)).toBe(12);
        expect(alcanceKm([{ zona_envio: "Retira", costo_envio: 0 }])).toBe(0);
    });

    test("cada distancia cae en su zona, con el costo de esa zona", () => {
        expect(zonaPorDistancia(0.4, ENVIOS)).toEqual({ zona_envio: "0-1", costo_envio: 1300 });
        expect(zonaPorDistancia(3.4, ENVIOS)).toEqual({ zona_envio: "3-4", costo_envio: 2300 });
        expect(zonaPorDistancia(7.9, ENVIOS)).toEqual({ zona_envio: "7-8", costo_envio: 5800 });
    });

    test("un borde exacto cae en la zona más barata", () => {
        expect(zonaPorDistancia(3, ENVIOS).zona_envio).toBe("2-3");
        expect(zonaPorDistancia(8, ENVIOS).zona_envio).toBe("7-8");
    });

    test("pasada la última zona, no hay envío", () => {
        expect(zonaPorDistancia(8.01, ENVIOS)).toBeNull();
        expect(zonaPorDistancia(14, ENVIOS)).toBeNull();
        expect(zonaPorDistancia(1, [])).toBeNull();
    });

    test("si falta una zona en el medio, cobra la siguiente", () => {
        const sinTres = ENVIOS.filter((e) => e.zona_envio !== "3-4");
        expect(zonaPorDistancia(3.5, sinTres).zona_envio).toBe("4-5");
    });
});

describe("las distancias", () => {
    test("en línea recta, en km", () => {
        const a = { lat: -38.0, lng: -57.55 };
        expect(distanciaKm(a, a)).toBe(0);
        // Un grado de latitud son ~111 km.
        expect(distanciaKm(a, { lat: -39.0, lng: -57.55 })).toBeCloseTo(111.2, 0);
        expect(distanciaKm(a, { lat: -38.03, lng: -57.55 })).toBeCloseTo(3.34, 1);
    });

    test("el rectángulo de búsqueda contiene el círculo", () => {
        const centro = { lat: -38.0, lng: -57.55 };
        const r = limitesDeBusqueda(centro, 12);
        expect(distanciaKm(centro, { lat: r.north, lng: centro.lng })).toBeCloseTo(12, 0);
        expect(distanciaKm(centro, { lat: centro.lat, lng: r.east })).toBeCloseTo(12, 0);
        expect(r.south).toBeLessThan(centro.lat);
        expect(r.west).toBeLessThan(centro.lng);
    });
});

describe("la ubicación de la sucursal", () => {
    test("se lee como la copia Google Maps", () => {
        expect(leerUbicacion("-38.00553839420577, -57.54261627395019"))
            .toEqual({ lat: -38.00553839420577, lng: -57.54261627395019 });
        expect(leerUbicacion("-38.0,-57.5")).toEqual({ lat: -38, lng: -57.5 });
    });

    test("vacía o inválida, null", () => {
        expect(leerUbicacion("")).toBeNull();
        expect(leerUbicacion("Av. Luro 3300")).toBeNull();
        expect(leerUbicacion("-138.0, -57.5")).toBeNull();
    });

    test("se vuelve a mostrar como se pegó", () => {
        expect(textoUbicacion({ lat: -38.0055, lng: -57.5426 })).toBe("-38.0055, -57.5426");
        expect(textoUbicacion(null)).toBe("");
    });
});
