import React, { useEffect, useState } from "react";

function CasosOrtodoncia(props) {
  const [casosEnCurso, setCasosEnCurso] = useState(0);
  const [casosEnCursoComparadoPeriodoAnterior, setCasosEnCursoComparadoPeriodoAnterior] = useState(0);
  const [consultaEnProgreso, setConsultaEnProgreso] = useState(true);

  useEffect(() => {
    if (!Array.isArray(props.tratamientos) || props.tratamientos.length === 0) {
      setCasosEnCurso(0);
      setCasosEnCursoComparadoPeriodoAnterior(0);
      setConsultaEnProgreso(false);
      return;
    }

    // Filtrar tratamientos por estado "En Curso" y tarifa "Ortodoncia"
    const tratamientosEnCursoOrtodoncia = props.tratamientos.filter((tratamiento) => {
      return tratamiento.tarifasTratamientos === "Ortodoncia" && tratamiento.estadosTratamientos === "En Curso";
    });

    // Filtrar por fechas de props.fechaInicio y props.fechaFin
    const tratamientosFiltrados = tratamientosEnCursoOrtodoncia.filter((item) => {
      return item.fecha >= props.fechaInicio && item.fecha <= props.fechaFin;
    });

    // Filtrar por fechas de props.fechaInicioBalance y props.fechaFinBalance
    const tratamientosFiltradosBalance = tratamientosEnCursoOrtodoncia.filter((item) => {
      return item.fecha >= props.fechaInicioBalance && item.fecha <= props.fechaFinBalance;
    });


    const cantidadCasosEnCurso = tratamientosFiltrados.length;
    const cantidadCasosEnCursoComparadoPeriodoAnterior = tratamientosFiltradosBalance.length > 0
      ? Math.round((cantidadCasosEnCurso / tratamientosFiltradosBalance.length) * 100)
      : 0;

    setCasosEnCurso(cantidadCasosEnCurso);
    setCasosEnCursoComparadoPeriodoAnterior(cantidadCasosEnCursoComparadoPeriodoAnterior);
    setConsultaEnProgreso(false);
  }, [props.tratamientos, props.fechaInicio, props.fechaFin, props.fechaInicioBalance, props.fechaFinBalance]);

  return (
    <div className="d-flex justify-content-between">
      {consultaEnProgreso ? (
        <span>...</span>
      ) : (
        <>
          <span>{casosEnCurso}</span>
          <span className={`fs-6 ms-4 mt-2 ${casosEnCursoComparadoPeriodoAnterior > 0 ? 'text-success' : casosEnCursoComparadoPeriodoAnterior < 0 ? 'text-warning' : ''}`}>
            {casosEnCursoComparadoPeriodoAnterior > 0 && "+"}{casosEnCursoComparadoPeriodoAnterior}%
          </span>
        </>
      )}
    </div>
  );
}

export default CasosOrtodoncia;