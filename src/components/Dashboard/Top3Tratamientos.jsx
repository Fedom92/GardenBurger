import React, { useEffect, useState } from "react";

function Top3Tratamientos(props) {
  const [top1, setTop1] = useState("");
  const [top2, setTop2] = useState("");
  const [top3, setTop3] = useState("");

  useEffect(() => {
    if (!Array.isArray(props.tratamientos) || props.tratamientos.length === 0) {
      setTop1("");
      setTop2("");
      setTop3("");
      return;
    }

    const tratamientosFiltrados = props.tratamientos.filter((item) => {
      return item.fecha >= props.fechaInicio && item.fecha <= props.fechaFin;
    });

    const tratamientosCount = {};
    tratamientosFiltrados.forEach((tratamiento) => {
      const tarifaTratamiento = tratamiento.tarifasTratamientos;
      if (tarifaTratamiento in tratamientosCount) {
        tratamientosCount[tarifaTratamiento] += 1;
      } else {
        tratamientosCount[tarifaTratamiento] = 1;
      }
    });

    const sortedTratamientos = Object.keys(tratamientosCount).sort(
      (a, b) => tratamientosCount[b] - tratamientosCount[a]
    );

    setTop1(sortedTratamientos[0] || "");
    setTop2(sortedTratamientos[1] || "");
    setTop3(sortedTratamientos[2] || "");


  }, [props.tratamientos, props.fechaInicio, props.fechaFin]);

  return (
    <p className="text-start">
      <div className="mt-2">
        <span className="mt-2">1. {top1}</span>
      </div>
      <div className="mt-2">
        <span className="mt-2">2. {top2}</span>
      </div>
      <div className="mt-2">
        <span className="mt-2">3. {top3}</span>
      </div>
    </p>
  );
}

export default Top3Tratamientos;