import React from "react";
import { useForm } from "react-hook-form";
import { HORAS_JORNADA, errorDeHorario, textoHorarioWeb } from "../../../Utils/fechaComercial";
import { DIAS_CORTOS } from "../../../Utils/formato";

// El formulario de alta y edición de una sucursal, dentro del modal de Sucursales.
//
// Es un componente aparte, con su propio useForm, a propósito: Sucursales lo monta
// de nuevo en cada apertura (key), así que arranca siempre con `valoresIniciales`.
// Antes había un solo useForm en Sucursales, limpiado con reset() al abrir y
// cerrar el modal, y editar una sucursal y después tocar "+ Nueva" mostraba el
// formulario con lo de la editada (12-10-2026). Montado de cero no depende de que
// reset() alcance a los inputs de un modal que se monta y desmonta.
//
// Las validaciones y la escritura las hace Sucursales (`onGuardar`); acá solo los
// campos y el resumen en vivo del horario.

// Los días en el orden en que se leen, desde el lunes. Los valores son los de
// moment: 0 = domingo.
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0];

const FormularioSucursal = ({ valoresIniciales, esEdicion, error, onGuardar, onCancelar }) => {
  const { register, handleSubmit, watch } = useForm({ defaultValues: valoresIniciales });

  // El horario armado en el formulario, contado como lo va a ver el cliente ("de
  // miércoles a domingo, de 20 a 23 hs"), o qué le falta. Sale de las mismas
  // funciones que deciden si la web abre, así que lo que dice es lo que pasa.
  // `dias` puede venir false sin ningún día prendido: de ahí el `|| []`.
  const [dias, abre, cierra, horasCorte] = watch(["dias", "abre", "cierra", "horasCorte"]);
  const horario = {
    dias: [].concat(dias || []).map(Number),
    abre: Number(abre),
    cierra: Number(cierra),
    horasCorte: Number(horasCorte),
  };
  const problemaHorario = horario.dias.length ? errorDeHorario(horario) : "Elegí al menos un día de atención";

  return (
    <form name="sucursales" onSubmit={handleSubmit(onGuardar)}>
      <div className="mb-3">
        <label className="form-label">Nombre*</label>
        <input type="text" className="form-control" required placeholder="..." {...register("nombre")} />

        {/* El identificador del link se genera solo desde el nombre: al admin no le
            sirve verlo. */}
        <label className="form-label">Dirección*</label>
        <input type="text" className="form-control" required placeholder="..." {...register("direccion")} />

        {/* De acá mide la web la distancia hasta el cliente para calcular el envío. */}
        <label className="form-label">Ubicación</label>
        <input type="text" className="form-control" placeholder="Ej: -34.7455, -58.5909" {...register("ubicacion")} />
        <small className="text-body-secondary d-block mb-2">
          En Google Maps, click derecho sobre el local y click en las coordenadas.
        </small>

        {/* El de atención al público: la web manda ahí el WhatsApp de cada pedido. */}
        <label className="form-label">Teléfono de atención*</label>
        <input type="tel" className="form-control" required placeholder="10 dígitos, sin 0 ni 15. Ej: 1134567890" {...register("telefono")} />

        {/* El horario de la web pública. El F4 no depende de esto: se habilita a la
            misma hora en todas las sucursales (HORA_HABILITA_STATS). Los días son
            botones que se prenden y apagan, no checkboxes sueltos: el día que se
            atiende queda relleno y se lee de un vistazo. */}
        <label className="form-label mt-2 d-block">Días de atención*</label>
        <div className="btn-group w-100" role="group" aria-label="Días de atención">
          {DIAS_SEMANA.map((d) => (
            <React.Fragment key={d}>
              <input type="checkbox" className="btn-check" id={`dia-atencion-${d}`} value={String(d)} autoComplete="off" {...register("dias")} />
              <label className="btn btn-outline-primario" htmlFor={`dia-atencion-${d}`}>{DIAS_CORTOS[d]}</label>
            </React.Fragment>
          ))}
        </div>

        <div className="row g-2 mt-1">
          <div className="col-4">
            <label className="form-label">Abre*</label>
            <select className="form-select" {...register("abre")}>
              {HORAS_JORNADA.map((h) => <option key={h} value={String(h)}>{String(h).padStart(2, "0")} hs</option>)}
            </select>
          </div>
          <div className="col-4">
            <label className="form-label">Cierra*</label>
            <select className="form-select" {...register("cierra")}>
              {HORAS_JORNADA.map((h) => <option key={h} value={String(h)}>{String(h).padStart(2, "0")} hs</option>)}
            </select>
          </div>
          <div className="col-4">
            <label className="form-label" title="Cuántas horas antes del cierre la web deja de tomar pedidos">Corte web*</label>
            <div className="input-group">
              <input type="number" className="form-control" min={0} step={1} required {...register("horasCorte")} />
              <span className="input-group-text">hs antes</span>
            </div>
          </div>
        </div>

        <div className="border rounded bg-body-tertiary px-3 py-2 mt-2 small">
          {problemaHorario
            ? <span className="text-danger">{problemaHorario}</span>
            : <>La web toma pedidos <strong>{textoHorarioWeb({ horario })}</strong>.</>}
        </div>
        <small className="text-body-secondary d-block mt-1">
          (Para feriados u otras fechas especiales, usá las excepciones)
          (<i className="fa-solid fa-calendar-days"></i>).
        </small>

        {error && <small className="text-danger d-block">{error}</small>}
      </div>

      <div className="d-flex justify-content-between">
        {/* type="button": sin eso, dentro del form, "Cancelar" enviaba el formulario. */}
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-success">
          {esEdicion ? "Guardar cambios" : "Crear sucursal"}
        </button>
      </div>
    </form>
  );
};

export default FormularioSucursal;
