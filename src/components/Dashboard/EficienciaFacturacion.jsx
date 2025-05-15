import React, { useEffect, useState } from "react";

function EficienciaFacturacion(props) {
  const [, setTotalPagos] = useState(0);
  const [, setPagados] = useState(0);
  const [porcentajePagados, setPorcentajePagados] = useState(0);

  useEffect(() => {
    if (!Array.isArray(props.tratamientos) || props.tratamientos.length === 0) {
      setPorcentajePagados(0);
      return;
    }

    const tratamientosFiltrados = props.tratamientos.filter((item) => {
      return item.fecha >= props.fechaInicio && item.fecha <= props.fechaFin;
    });

    let total = tratamientosFiltrados.length || 0;
    let pagados = tratamientosFiltrados.filter((item) => item.estadoPago === "Cancelado").length || 0;

    setTotalPagos(total);
    setPagados(pagados);
    calcularPorcentaje(pagados, total);

  }, [props.tratamientos, props.fechaInicio, props.fechaFin]);

  const calcularPorcentaje = (pagados, total) => {
    if (total > 0) {
      const porcentaje = (pagados / total) * 100;
      setPorcentajePagados(porcentaje.toFixed(0));
    } else {
      setPorcentajePagados(0);
    }
  };

  return (
    <div>
      <span>{porcentajePagados}%</span>
    </div>
  );
}

export default EficienciaFacturacion;