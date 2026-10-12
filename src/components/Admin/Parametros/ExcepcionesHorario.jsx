import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import moment from "moment";
import Swal from "sweetalert2";
import TablaGenerica from "../../../Utils/TablaGenerica";
import { excepcionDeJornada, getFechaComercial, textoRangoWeb } from "../../../Utils/fechaComercial";

// El modal de excepciones de horario de UNA sucursal: cargar una para cualquier
// día —un feriado que se abre, un día que se cierra—, las próximas y el historial.
// Modal y no un panel debajo de la tabla: con muchas sucursales, la tabla y el
// panel no entraban juntos.
//
// Lecturas: abrir el modal no lee nada. Las próximas salen de
// `sucursal.excepcionesWeb`, que ya está en memoria; el historial se lee recién al
// tocar "Ver historial", de a 20.
//
// Una excepción de apertura usa siempre el horario de la sucursal: no se elige
// otro. Las escrituras y el historial los maneja Sucursales, que también los usa
// desde los botones de "hoy": así la tabla, estas listas y la web quedan iguales.
// Ver Utils/excepcionesHorario.js.

const aFechaInput = (jornada) => moment(jornada, "DD-MM-YYYY").format("YYYY-MM-DD");
const fechaHora = (ts) => (ts?.toDate ? moment(ts.toDate()).format("DD/MM/YY HH:mm") : "recién");
const aMoment = (jornada) => moment(jornada, "DD-MM-YYYY");

const ExcepcionesHorario = ({ sucursal, historial, procesando, onGuardar, onQuitar, onCargarHistorial, onCerrar }) => {
  const hoy = getFechaComercial();
  const horario = sucursal.horario;

  const valoresIniciales = { fecha: aFechaInput(hoy), tipo: "cerrada", motivo: "", motivoPublico: false };
  const { register, handleSubmit, watch, reset } = useForm({ defaultValues: valoresIniciales });
  const tipo = watch("tipo");
  const [error, setError] = useState("");

  const enviar = async (data) => {
    setError("");
    const fecha = moment(data.fecha, "YYYY-MM-DD", true);
    if (!fecha.isValid() || fecha.isBefore(aMoment(hoy), "day")) {
      setError("Elegí un día de hoy en adelante");
      return;
    }
    // La de cierre lleva motivo; la de apertura, el horario de la sucursal.
    const abierta = data.tipo === "abierta";
    const motivo = (data.motivo || "").trim();
    if (!abierta && !motivo) {
      setError("Escribí por qué se cierra");
      return;
    }
    if (abierta && !horario) {
      setError("Para abrir, primero cargá el horario de la sucursal");
      return;
    }

    // El día del input es la jornada: el 12/10 es la que arranca ese día.
    const jornada = fecha.format("DD-MM-YYYY");
    if (excepcionDeJornada(sucursal, jornada)) {
      const { isConfirmed } = await Swal.fire({
        title: "Ese día ya tiene una excepción",
        text: "La anterior queda como quitada en el historial y esta toma su lugar.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#198754",
        confirmButtonText: "Reemplazar",
        cancelButtonText: "Cancelar",
      });
      if (!isConfirmed) return;
    }

    const guardado = await onGuardar({
      jornada,
      abierta,
      ...(abierta
        ? { abre: horario.abre, cierra: horario.cierra, horasCorte: horario.horasCorte }
        : { motivo, motivoPublico: data.motivoPublico }),
    });
    if (guardado) reset(valoresIniciales);
  };

  // ── Las próximas: de memoria, 0 lecturas ────────────────────────────────────
  const proximas = Object.entries(sucursal.excepcionesWeb || {})
    .filter(([jornada]) => !aMoment(jornada).isBefore(aMoment(hoy), "day"))
    .map(([jornada, excepcion]) => ({ jornada, ...excepcion }))
    .sort((a, b) => aMoment(a.jornada).diff(aMoment(b.jornada)));

  // Hoy o programada: lo que la web va a hacer. Ya pasó: nadie la quitó y la
  // noche terminó. Quitada: alguien la quitó, o la reemplazó otra.
  const estado = (r) => {
    if (r.levantadaPor) return `Quitada por ${r.levantadaPor} · ${fechaHora(r.levantadaEl)}`;
    const vigente = sucursal.excepcionesWeb?.[r.jornada]?.registroId === (r.registroId || r.id);
    if (!vigente) return "Ya pasó";
    return r.jornada === hoy ? "Se aplica hoy" : "Programada";
  };

  const colDia = {
    id: "dia",
    header: "Día Laboral",
    accessorFn: (r) => aMoment(r.jornada).toDate(),
    cell: ({ row }) => aMoment(row.original.jornada).format("ddd DD/MM/YYYY"),
  };
  const colHorario = {
    id: "horario",
    header: "Horario",
    cell: ({ row }) => (row.original.abierta
      ? <span className="text-success">Abierta {textoRangoWeb(row.original)}</span>
      : <span className="text-danger">Cerrada</span>),
  };
  const colEstado = { id: "estado", header: "Estado", cell: ({ row }) => estado(row.original) };

  const columnasProximas = [
    colDia,
    colHorario,
    {
      id: "motivo",
      header: "Motivo",
      // La copia de la web trae el motivo solo si es público: el interno está en el historial.
      cell: ({ row }) => (row.original.motivo
        ? row.original.motivo
        : !row.original.abierta && <span className="text-body-secondary">no se muestra en la web</span>),
    },
    colEstado,
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          title="Quitar excepción"
          disabled={procesando}
          onClick={() => onQuitar(row.original.jornada)}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      ),
    },
  ];

  const columnasHistorial = [
    colDia,
    colHorario,
    {
      accessorKey: "motivo",
      header: "Motivo",
      // Las de apertura no tienen motivo.
      cell: ({ row }) => (row.original.motivo ? (
        <>
          {row.original.motivo}{" "}
          <span className={`badge ${row.original.motivoPublico ? "bg-success" : "bg-secondary"}`}>
            {row.original.motivoPublico ? "público" : "interno"}
          </span>
        </>
      ) : "—"),
    },
    {
      accessorKey: "creadoPor",
      header: "Cargó",
      cell: ({ row }) => (
        <>
          {row.original.creadoPor}
          <small className="d-block text-body-secondary">{fechaHora(row.original.creadoEl)}</small>
        </>
      ),
    },
    colEstado,
  ];

  return (
    <Modal show onHide={onCerrar} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Excepciones de horario
          <small className="d-block fs-6 text-body-secondary">{sucursal.nombre} - (Temporales solo para el día que definas)</small>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form name="excepcion" onSubmit={handleSubmit(enviar)} className="border rounded p-3 mb-4 bg-body-tertiary">
          <h6 className="mb-3">Nueva excepción</h6>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Día Laboral*</label>
              <input type="date" className="form-control" min={aFechaInput(hoy)} required {...register("fecha")} />
            </div>
            <div className="col-md-8">
              <label className="form-label d-block">La web ese día*</label>
              <div className="btn-group w-100" role="group" aria-label="La web ese día">
                <input type="radio" className="btn-check" id="excepcion-cerrada" value="cerrada" {...register("tipo")} />
                <label className="btn btn-outline-danger" htmlFor="excepcion-cerrada">Cerrada</label>
                <input type="radio" className="btn-check" id="excepcion-abierta" value="abierta" disabled={!horario} {...register("tipo")} />
                <label className="btn btn-outline-success" htmlFor="excepcion-abierta">Abierta</label>
              </div>
            </div>

            {/* Abrir usa siempre el horario de la sucursal. */}
            {tipo === "abierta" && horario && (
              <div className="col-12">
                <span className="text-success">Toma pedidos {textoRangoWeb(horario)}</span>
                <small className="text-body-secondary"> · el horario de la sucursal</small>
              </div>
            )}
            {!horario && (
              <div className="col-12">
                <small className="text-body-secondary">Para abrir un día, primero cargá el horario de la sucursal.</small>
              </div>
            )}

            {/* El motivo, solo para cerrar: explica por qué ese día no se atiende. */}
            {tipo === "cerrada" && (
              <div className="col-12">
                <label className="form-label">Motivo del cierre*</label>
                <input type="text" className="form-control" maxLength={80} required placeholder="Ej: inventario, corte de luz, vacaciones" {...register("motivo")} />
              </div>
            )}

            <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-2">
              {tipo === "cerrada" ? (
                <div className="form-check mb-0">
                  <input type="checkbox" className="form-check-input" id="excepcion-publico" {...register("motivoPublico")} />
                  <label className="form-check-label" htmlFor="excepcion-publico">Mostrar el motivo en la web</label>
                </div>
              ) : <span />}
              <button type="submit" className="btn btn-success" disabled={procesando}>Guardar excepción</button>
            </div>
            {error && <small className="text-danger d-block">{error}</small>}
          </div>
        </form>

        {/* Sin excepciones de hoy en adelante, la sección no se muestra. */}
        {proximas.length > 0 && (
          <div className="mb-4">
            <h6>Excepciones desde hoy</h6>
            <TablaGenerica data={proximas} columnas={columnasProximas} />
          </div>
        )}

        {/* El botón va en la misma línea que el título, a la derecha. Hasta tocarlo
            no se lee nada; después desaparece y queda la tabla. */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Historial</h6>
          {!historial.cargado && (
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={historial.cargando} onClick={onCargarHistorial}>
              {historial.cargando ? "Cargando..." : "Ver historial completo"}
            </button>
          )}
        </div>
        {!historial.cargado ? null : historial.registros.length === 0 ? (
          <p className="text-body-secondary text-center py-2 mb-0">Esta sucursal todavía no tiene excepciones.</p>
        ) : (
          <>
            <TablaGenerica
              data={historial.registros}
              columnas={columnasHistorial}
              camposBusqueda={["motivo", "creadoPor"]}
            />
            {historial.hayMas && (
              <div className="text-center mt-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={historial.cargando} onClick={onCargarHistorial}>
                  {historial.cargando ? "Cargando..." : "Ver anteriores"}
                </button>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ExcepcionesHorario;
