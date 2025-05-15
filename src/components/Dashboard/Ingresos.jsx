import React, { useEffect, useState } from "react";

function Ingresos(props) {
  const [totalAbonado, setTotalAbonado] = useState(0);

  useEffect(() => {
    if (!Array.isArray(props.tratamientos) || props.tratamientos.length === 0) {
      setTotalAbonado(0);
      return;
    }

    let total = 0;
    props.tratamientos.forEach((tratamiento) => {
      const cobrosManuales = tratamiento.cobrosManuales;

      if (cobrosManuales && cobrosManuales.fechaCobro) {
        cobrosManuales.fechaCobro.forEach((fecha, index) => {
          if (fecha >= props.fechaInicio && fecha <= props.fechaFin) {
            const importeAbonado = cobrosManuales.importeAbonado[index] || "";
            const importe = Number(importeAbonado) || 0;
            total += importe;
          }
        });
      }
    });
    setTotalAbonado(total);
  }, [props.tratamientos, props.fechaInicio, props.fechaFin]);

  return (
    <div>
      <span>${totalAbonado?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

export default Ingresos;