import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { fetchSucursales, invalidarSucursales } from "../../../Utils/sucursales";
import { marcarMenuPendiente } from "../../../Utils/menuPublico";
import { HORARIO } from "../../../Utils/Constantes";
import { horaEnJornada, horaCorteWeb, NOMBRES_DIAS } from "../../../Utils/fechaComercial";
import { useForm } from "react-hook-form";

// ABM de sucursales (colección global "sucursales"). El id es un slug que forma
// las URLs públicas (/crear-solicitud/{id}) y los paths sucursales/{id}/...
// No hay borrado: se desactiva con "activa" para no dejar huérfanas las subcolecciones.

// Deriva el identificador URL-safe desde el nombre: minúsculas, sin tildes/ñ,
// espacios → guion. Ej: "Sucursal Güemes Nº2" → "sucursal-guemes-n2"
const slugify = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Las horas que se pueden elegir: las de la jornada comercial (19 a 02). El horario
// de una sucursal tiene que caer adentro, o sus pedidos quedarían fuera de la noche.
const HORAS_JORNADA = Array.from(
  { length: horaEnJornada(HORARIO.horaCierre) + 1 },
  (_, i) => (HORARIO.horaAbre + i) % 24
);

// Los días en el orden en que se leen, desde el lunes. Los valores son los de
// moment: 0 = domingo.
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0];

// Lo que trae el formulario de una sucursal nueva: el horario de hoy.
const VALORES_INICIALES = {
  nombre: "", direccion: "", telefono: "",
  dias: ["3", "4", "5", "6", "0"], abre: "20", cierra: "0", horasCorte: 1,
};

// Lo que le falta a una sucursal para funcionar bien en la web. Las sucursales
// anteriores al horario por sucursal no lo tienen, y sin él la web la muestra cerrada.
const faltantes = (s) => [
  !s.horario && "horario (web figura cerrada)",
  !s.telefono && "teléfono (no llega WhatsApp)",
  !s.direccion && "dirección",
].filter(Boolean);

// Dos vistas en el mismo modal: la lista de sucursales, y el formulario solo al
// crear o editar una. Las dos juntas no entraban en pantalla.
const Sucursales = ({ show, onHide }) => {
  const { register, handleSubmit, reset } = useForm({ defaultValues: VALORES_INICIALES });

  const [modo, setModo] = useState("lista"); // "lista" | "formulario"
  const [idAEditar, setIdAEditar] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState("");

  const sucursalesCollection = collection(db, "sucursales");

  // La misma lista cacheada que usan los selectores: si el Panel Admin ya la cargó,
  // abrir el modal no lee nada. Guardar la invalida (más abajo), así que la próxima
  // apertura trae la lista nueva.
  const getSucursales = useCallback(async () => {
    try {
      setSucursales(await fetchSucursales());
    } catch (error) {
      console.error("Error fetching data Sucursales:", error);
      setError("No se pudieron cargar las sucursales. Revisá la conexión.");
    }
  }, []);

  useEffect(() => {
    if (show) {
      getSucursales();
    }
  }, [show, getSucursales]);

  const guardar = async (data) => {
    const id = idAEditar !== null ? idAEditar : slugify(data.nombre);

    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      setError("El nombre debe contener al menos una letra o número para generar el identificador");
      return;
    }
    if (idAEditar === null && sucursales.some((s) => s.id === id)) {
      setError("Ya existe una sucursal con ese identificador");
      return;
    }

    // WhatsApp necesita el número sin 0 ni 15: característica más número, 10
    // dígitos. La web le antepone el 549.
    const telefono = String(data.telefono || "").replace(/\D/g, "");
    if (telefono.length !== 10) {
      setError("El teléfono tiene que tener 10 dígitos, sin 0 ni 15. Ej: 1134567890");
      return;
    }

    // El horario de la web: días de atención, apertura, cierre, y cuántas horas
    // antes del cierre deja de tomar pedidos. Ver webRecibePedidos().
    const horario = {
      dias: [].concat(data.dias || []).map(Number).sort((a, b) => a - b),
      abre: Number(data.abre),
      cierra: Number(data.cierra),
      horasCorte: Number(data.horasCorte),
    };
    if (!horario.dias.length) {
      setError("Elegí al menos un día de atención");
      return;
    }
    if (horaEnJornada(horario.cierra) <= horaEnJornada(horario.abre)) {
      setError("El cierre tiene que ser después de la apertura");
      return;
    }
    const corte = horaCorteWeb(horario);
    if (!Number.isInteger(horario.horasCorte) || horario.horasCorte < 0
      || horaEnJornada(corte) <= horaEnJornada(horario.abre)
      || horaEnJornada(corte) > horaEnJornada(horario.cierra)) {
      setError("Con ese corte la web no tomaría pedidos: tiene que quedar entre la apertura y el cierre");
      return;
    }

    // setDoc sin merge reemplaza el documento entero: todo campo de la sucursal
    // tiene que viajar acá, o editarla lo borra.
    const newState = {
      nombre: data.nombre,
      direccion: data.direccion || "",
      telefono,
      horario,
      activa: idAEditar !== null
        ? sucursales.find((s) => s.id === id)?.activa ?? true
        : true,
    };

    try {
      await setDoc(doc(sucursalesCollection, id), newState);
      invalidarSucursales();
      // La web lee las sucursales —horario, dirección, teléfono— de menu.json: hasta
      // publicar el menú sigue viendo los datos viejos. Hace parpadear el botón.
      marcarMenuPendiente();

      setSucursales((prev) =>
        idAEditar !== null
          ? prev.map((s) => (s.id === id ? { ...s, ...newState } : s))
          : [...prev, { id, ...newState }]
      );
      volverALaLista();
    } catch (error) {
      console.error("Error al guardar la Sucursal: ", error);
      setError("No se pudo guardar la sucursal. Revisá la conexión e intentá de nuevo.");
    }
  };

  const volverALaLista = () => {
    setIdAEditar(null);
    reset(VALORES_INICIALES);
    setError("");
    setModo("lista");
  };

  const cerrar = () => {
    volverALaLista();
    onHide();
  };

  const abrirNueva = () => {
    setIdAEditar(null);
    reset(VALORES_INICIALES);
    setError("");
    setModo("formulario");
  };

  // Con reset y no con setValue: el formulario todavía no está montado (se ve la
  // lista), y reset deja los valores listos para cuando aparezca.
  const handleEdit = (item) => {
    // Una sucursal anterior al horario por sucursal no tiene el campo: el
    // formulario le propone el de hoy.
    const horario = item.horario || {};
    reset({
      nombre: item.nombre || "",
      direccion: item.direccion || "",
      telefono: item.telefono || "",
      dias: (horario.dias || VALORES_INICIALES.dias).map(String),
      abre: String(horario.abre ?? VALORES_INICIALES.abre),
      cierra: String(horario.cierra ?? VALORES_INICIALES.cierra),
      horasCorte: horario.horasCorte ?? VALORES_INICIALES.horasCorte,
    });
    setIdAEditar(item.id);
    setError("");
    setModo("formulario");
  };

  const toggleActiva = async (item) => {
    try {
      await setDoc(doc(sucursalesCollection, item.id), { activa: !item.activa }, { merge: true });
      invalidarSucursales();
      marcarMenuPendiente();
      setSucursales((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, activa: !item.activa } : s))
      );
    } catch (error) {
      console.error("Error al actualizar la Sucursal: ", error);
      setError("No se pudo actualizar la sucursal. Revisá la conexión e intentá de nuevo.");
    }
  };

  const titulo = modo === "lista"
    ? "Sucursales"
    : idAEditar !== null
      ? `Editar ${sucursales.find((s) => s.id === idAEditar)?.nombre || "sucursal"}`
      : "Nueva sucursal";

  return (
    <Modal
      show={show}
      onHide={cerrar}
      aria-labelledby="contained-modal-title-vcenter"
      centered
      scrollable
    >
      <Modal.Header closeButton>
        {/* "+ Nueva" va pegado al título; la X queda sola a la derecha, porque
            Bootstrap le pone margin-left: auto. */}
        <Modal.Title>{titulo}</Modal.Title>
        {modo === "lista" && (
          <button type="button" className="btn btn-success btn-sm ms-3" onClick={abrirNueva}>
            + Nueva
          </button>
        )}
      </Modal.Header>
      <Modal.Body>
        {modo === "lista" ? (
          <>
            {error && <small className="text-danger d-block mb-2">{error}</small>}

            {/* Tabla simple y no TablaGenerica: son dos o tres filas dentro de un modal,
                y un buscador y un paginador estorban más de lo que ayudan. */}
            {sucursales.length === 0 ? (
              <p className="text-body-secondary text-center py-3 mb-0">Todavía no hay sucursales cargadas.</p>
            ) : (
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th className="text-center">Estado</th>
                    <th className="text-end">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {sucursales.map((sucursal) => {
                    const falta = faltantes(sucursal);
                    return (
                      <tr key={sucursal.id}>
                        <td>
                          <div className="fw-bold">{sucursal.nombre}</div>
                          {/* Un faltante por línea. Un join con "<br />" no sirve: React
                              lo muestra como texto. */}
                          {falta.length > 0 && (
                            <small className="text-danger d-block">
                              Falta:
                              {falta.map((f) => <span key={f} className="d-block">· {f}</span>)}
                            </small>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${sucursal.activa ? "btn-outline-success" : "btn-outline-danger"}`}
                            onClick={() => toggleActiva(sucursal)}
                          >
                            {sucursal.activa ? "Activa" : "Inactiva"}
                          </button>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            title="Editar"
                            onClick={() => handleEdit(sucursal)}
                          >
                            <i className="fa-solid fa-edit"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        ) : (
        <form name="sucursales" onSubmit={handleSubmit(guardar)}>
          <div className="mb-3">
            <label className="form-label">Nombre*</label>
            <input type="text" className="form-control" required placeholder="..." {...register("nombre")} />

            {/* El identificador del link se genera solo desde el nombre: al admin no le
                sirve verlo. */}
            <label className="form-label">Dirección*</label>
            <input type="text" className="form-control" required placeholder="..." {...register("direccion")} />

            {/* El de atención al público: la web manda ahí el WhatsApp de cada pedido. */}
            <label className="form-label">Teléfono de atención*</label>
            <input type="tel" className="form-control" required placeholder="10 dígitos, sin 0 ni 15. Ej: 1134567890" {...register("telefono")} />

            {/* El horario de la web pública. El F4 no depende de esto: se habilita
                a la misma hora en todas las sucursales (HORA_HABILITA_STATS). */}
            <label className="form-label mt-2">Días de atención*</label>
            <div className="d-flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => (
                <label key={d} className="form-check-label d-flex align-items-center gap-1">
                  <input type="checkbox" className="form-check-input mt-0" value={String(d)} {...register("dias")} />
                  {NOMBRES_DIAS[d].slice(0, 3)}
                </label>
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
            <small className="text-body-secondary d-block mt-1">
              <strong>Publicar menú</strong> para actualizar!
            </small>

            {error && <small className="text-danger d-block">{error}</small>}
          </div>

          <div className="d-flex justify-content-between">
            {/* type="button": sin eso, dentro del form, "Volver" enviaba el formulario. */}
            <button type="button" className="btn btn-secondary" onClick={volverALaLista}>
              <i className="fa-solid fa-arrow-left me-1"></i> Volver
            </button>
            <button type="submit" className="btn btn-success">
              {idAEditar !== null ? "Guardar cambios" : "Crear sucursal"}
            </button>
          </div>
        </form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default Sucursales;
