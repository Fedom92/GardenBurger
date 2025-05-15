import React, { useEffect, useState, useRef } from "react";

function PacientesAtendidos(props) {
  const [pacientesAtendidos, setPacientesAtendidos] = useState(0);
  const [porcentajeComparadoPeriodoAnterior, setPorcentajeComparadoPeriodoAnterior] = useState(0);
  const [consultaEnProgreso, setConsultaEnProgreso] = useState(true);
  const pacientesAtendidosRef = useRef(pacientesAtendidos);

  useEffect(() => {
    if (!Array.isArray(props.citas) || props.citas.length === 0) {
      setPacientesAtendidos(0);
      setPorcentajeComparadoPeriodoAnterior(0);
      setConsultaEnProgreso(false);
      return;
    }

    const contador = props.citas.filter(
      (cita) => cita.estado === "Finalizada" && cita.fecha >= props.fechaInicio && cita.fecha <= props.fechaFin).length || 0;

    setPacientesAtendidos(contador);
    pacientesAtendidosRef.current = contador;

    const contador2 = props.citas.filter(
      (cita) =>
        cita.estado === "Finalizada" && cita.fecha >= props.fechaInicioBalance && cita.fecha <= props.fechaFinBalance).length || 0;

    setPorcentajeComparadoPeriodoAnterior(contador2 > 0 ? Math.round((contador / contador2) * 100) : 0);
    setConsultaEnProgreso(false);
  }, [props.citas, props.fechaInicio, props.fechaFin, props.fechaInicioBalance, props.fechaFinBalance]);



  return (
    <div className="d-flex justify-content-between">
      {consultaEnProgreso ? (
        <span>...</span>
      ) : (
        <>
          <span>{pacientesAtendidos}</span>
          <span className={`fs-6 me-3 mt-2 ${porcentajeComparadoPeriodoAnterior > 0 ? 'text-success' : porcentajeComparadoPeriodoAnterior < 0 ? 'text-warning' : ''}`}>
            {porcentajeComparadoPeriodoAnterior > 0 && "+"}{porcentajeComparadoPeriodoAnterior}%
          </span>
        </>
      )}
    </div>
  );
}

export default PacientesAtendidos;
