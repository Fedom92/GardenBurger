import React from "react";

// Mientras baja menu.json: bloques del tamaño de lo que viene, con un pulso leve
// (quieto si el sistema pide menos movimiento). Reemplaza al "Cargando..." suelto
// que tenía cada pantalla.
const CargandoWeb = ({ bloques = 2, alto = 104 }) => (
    <div className="d-grid gap-3" role="status" aria-label="Cargando">
        {Array.from({ length: bloques }, (_, i) => (
            <div key={i} className="gb-esqueleto" style={{ height: alto }} />
        ))}
    </div>
);

export default CargandoWeb;
