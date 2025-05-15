import React, { useEffect, useState } from "react";

function Ausencia(props) {
  const [porcentajeCanceladas, setPorcentajeCanceladas] = useState(0);

  useEffect(() => {
    if (!Array.isArray(props.citas) || props.citas.length === 0) {
      setPorcentajeCanceladas(0);
      return;
    }

    const citasFiltradas = props.citas.filter((item) => {
      return item.fecha >= props.fechaInicio && item.fecha <= props.fechaFin;
    });

    let total = citasFiltradas.length || 0;
    let canceladas = citasFiltradas.filter((item) => item.estado === "Cancelada").length || 0;

    calcularPorcentaje(canceladas, total);
  }, [props.citas, props.fechaInicio, props.fechaFin]);

  const calcularPorcentaje = (canceladas, total) => {
    const porcentaje = total > 0 ? Math.round((canceladas / total) * 100) : 0;
    setPorcentajeCanceladas(porcentaje);
  };

  return (
    <div>
      <span>{porcentajeCanceladas}%</span>
    </div>
  );
}

export default Ausencia;