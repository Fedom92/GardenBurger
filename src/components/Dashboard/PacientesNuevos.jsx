import React, { useEffect, useState, useRef } from "react";

function PacientesNuevos(props) {
  const [contadorClientes, setContadorClientes] = useState(0);
  const contadorClientesRef = useRef(contadorClientes);
  const [contadorClientesComparadoPeriodoAnterior, setContadorClientesComparadoPeriodoAnterior] = useState(0);
  const [consultaEnProgreso, setConsultaEnProgreso] = useState(true);

  useEffect(() => {
    if (!Array.isArray(props.clients) || props.clients.length === 0) {
      setContadorClientes(0);
      setContadorClientesComparadoPeriodoAnterior(0);
      setConsultaEnProgreso(false);
      return;
    }

    const cantClientsFiltrados = props.clients.filter((item) => {
      return item.fechaAlta >= props.fechaInicio && item.fechaAlta <= props.fechaFin;
    }).length || 0;

    setContadorClientes(cantClientsFiltrados);
    contadorClientesRef.current = cantClientsFiltrados;

    const cantClientsFiltradosBalance = props.clients.filter((cliente) => {
      return cliente.fechaAlta >= props.fechaInicioBalance && cliente.fechaAlta <= props.fechaFinBalance;
    }).length || 0;

    setContadorClientesComparadoPeriodoAnterior(cantClientsFiltradosBalance > 0 ? Math.round((cantClientsFiltrados / cantClientsFiltradosBalance) * 100) : 0);
    setConsultaEnProgreso(false);
  }, [props.clients, props.fechaInicio, props.fechaFin, props.fechaInicioBalance, props.fechaFinBalance]);


  return (
    <div className="d-flex justify-content-between">
      {consultaEnProgreso ? (
        <span>...</span>
      ) : (
        <>
          <span>{contadorClientes}</span>
          <span className={`fs-6 ms-4 mt-2 ${contadorClientesComparadoPeriodoAnterior > 0 ? 'text-success' : contadorClientesComparadoPeriodoAnterior < 0 ? 'text-warning' : ''}`}>
            {contadorClientesComparadoPeriodoAnterior > 0 && "+"}{contadorClientesComparadoPeriodoAnterior}%
          </span>
        </>
      )}
    </div>
  );
}

export default PacientesNuevos;