import React, { useEffect, useState } from "react";

function CitasPorConfirmar(props) {
  const [cantCitas, setCantCitas] = useState(0);

  useEffect(() => {
    const citasFiltradas = props.citas.filter((item) => {
      return item.fecha >= props.fechaInicio && item.fecha <= props.fechaFin;
    });
    let citasPorConfirmar = citasFiltradas.filter((item) => item.estado === "Por Confirmar").length || 0;

    setCantCitas(citasPorConfirmar);

  }, [props.citas, props.fechaInicio, props.fechaFin]);

  return (
    <div>
      <span>{cantCitas}</span>
    </div>
  );
}

export default CitasPorConfirmar;