import React, { useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import { db } from "../../../firebaseConfig/firebase.js";
import { invalidarSucursales } from "../../../Utils/sucursales";
import { publicarSucursales, marcarMenuPendiente } from "../../../Utils/menuPublico";
import {
  errorDeHorario, excepcionDeJornada, getFechaComercial, textoRangoWeb, momentDeJornada,
} from "../../../Utils/fechaComercial";
import { guardarExcepcion, levantarExcepcion, leerExcepciones } from "../../../Utils/excepcionesHorario";
import { esUbicacion, leerUbicacion, textoUbicacion } from "../../../Utils/zonasEnvio";
import { useAuth } from "../../../context/AuthContext";
import { useAccionUnica } from "../../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../../Utils/avisos";
import ExcepcionesHorario from "./ExcepcionesHorario";
import FormularioSucursal from "./FormularioSucursal";

// Pestaña Sucursales del Panel Admin (colección global "sucursales"). El id es un
// slug que forma las URLs públicas (/crear-solicitud/{id}) y los paths
// sucursales/{id}/... No hay borrado: se desactiva con "activa" para no dejar
// huérfanas las subcolecciones.
//
// Todo cambio se publica solo en la web (publicarSucursales): "Publicar Menú", en
// Productos, quedó para el catálogo.

// Deriva el identificador URL-safe desde el nombre: minúsculas, sin tildes/ñ,
// espacios → guion. Ej: "Sucursal Güemes Nº2" → "sucursal-guemes-n2"
const slugify = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Lo que trae el formulario de una sucursal nueva: sin días, para que se vea vacío
// (con miércoles a domingo prendidos, igual que las sucursales de hoy, parecía que
// no se había limpiado), y el horario de siempre en las horas.
const VALORES_INICIALES = {
  nombre: "", direccion: "", ubicacion: "", telefono: "",
  dias: [], abre: "20", cierra: "0", horasCorte: 1,
};

const porNombre = (a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id);

// Lo que le falta a una sucursal para funcionar bien en la web. Las sucursales
// anteriores al horario por sucursal no lo tienen, y sin él la web la muestra cerrada.
// El teléfono y la dirección avisan en su propia columna.
const faltantes = (s) => [
  !s.horario && "Falta horario (la web figura cerrada)",
  !esUbicacion(s.ubicacion) && "Falta ubicación (la web no calcula el envío)",
].filter(Boolean);

// Lo que la web hace hoy con una sucursal, para la columna "Estado Web": junta el
// encendido, la excepción del día y el horario semanal, en ese orden. `abierta`
// pinta la leyenda de verde o rojo. Solo informa: encender o apagar va por
// Acciones, y abrir o cerrar un día, por el modal de excepciones.
const estadoDeHoy = (s, jornada) => {
  if (s.activa === false) return { texto: "Cerrada", abierta: false };
  const excepcion = excepcionDeJornada(s, jornada);
  if (excepcion) {
    return {
      texto: excepcion.abierta ? `Abre por excepción, ${textoRangoWeb(excepcion)}` : "Cerrada por excepción",
      motivo: excepcion.motivo,
      abierta: excepcion.abierta,
    };
  }
  if (!s.horario) return { texto: "(Sin horario-cerrado)", abierta: false };
  return s.horario.dias?.includes(momentDeJornada(jornada).day())
    ? { texto: `Abre ${textoRangoWeb(s.horario)}`, abierta: true }
    : { texto: "No abre hoy", abierta: false };
};

// El historial en pantalla, de la fecha más nueva a la más vieja. Dentro de una
// misma noche, lo último cargado arriba (creadoEl null es lo recién guardado).
const ordenarHistorial = (registros) => [...registros].sort((a, b) =>
  (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0)
  || (b.creadoEl?.toMillis?.() ?? Infinity) - (a.creadoEl?.toMillis?.() ?? Infinity));

// `cargado`: si el admin ya pidió ver el historial. Hasta entonces no se lee nada.
const HISTORIAL_VACIO = { registros: [], ultimo: null, hayMas: false, cargando: false, cargado: false };

// `sucursales` y `setSucursales` son de PanelAdmin, que las comparte con Personal.
const Sucursales = ({ sucursales, setSucursales }) => {
  const { userData } = useAuth();
  const { procesando, ejecutar } = useAccionUnica();

  const [formAbierto, setFormAbierto] = useState(false);
  const [idAEditar, setIdAEditar] = useState(null);
  const [error, setError] = useState("");
  // Con qué valores arranca el formulario, y un número por apertura: es la key de
  // FormularioSucursal, así que cada apertura lo monta de cero. Ver ese archivo.
  const [valoresForm, setValoresForm] = useState(VALORES_INICIALES);
  const [aperturaForm, setAperturaForm] = useState(0);

  // La sucursal cuyas excepciones están abiertas en el modal, y su historial.
  const [idExcepciones, setIdExcepciones] = useState(null);
  const [historial, setHistorial] = useState(HISTORIAL_VACIO);
  // Con dos clicks seguidos en sucursales distintas, la respuesta vieja no pisa a la nueva.
  const historialPedido = useRef(null);

  // "Hoy" es la jornada: a la 01:00 todavía es la noche anterior.
  const hoy = getFechaComercial();

  // Después de cada escritura. La web lee las sucursales de menu.json: si no se
  // pudo republicar, lo guardado vale igual pero la web muestra lo viejo, así que
  // se avisa y queda prendida la bandera de "Publicar Menú".
  const publicarEnLaWeb = async () => {
    invalidarSucursales();
    try {
      await publicarSucursales();
    } catch (error) {
      console.error("No se pudo publicar las sucursales en menu.json:", error);
      marcarMenuPendiente();
      Swal.fire({
        title: "Guardado, pero la web no se actualizó",
        text: "Usá «Publicar Menú» en Productos para que la web lo vea.",
        icon: "warning",
        confirmButtonColor: "#198754",
      });
    }
  };

  // ── Alta y edición ──────────────────────────────────────────────────────────

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
    const errorHorario = errorDeHorario(horario);
    if (errorHorario) {
      setError(errorHorario);
      return;
    }

    // Las coordenadas del local, para el envío por distancia de la web. Opcional: sin
    // ellas, el cliente escribe la dirección a mano y la zona la elige el cajero.
    const ubicacion = leerUbicacion(data.ubicacion);
    if ((data.ubicacion || "").trim() && !ubicacion) {
      setError("La ubicación va como la copia Google Maps: latitud, longitud. Ej: -34.7455, -58.5909");
      return;
    }

    const datos = { nombre: data.nombre, direccion: data.direccion || "", ubicacion, telefono, horario };

    try {
      // Editar va con updateDoc: toca solo estos campos, así que no se lleva puestos
      // `activa` ni las excepciones vigentes. Antes era un setDoc sin merge, que
      // reemplazaba el documento entero.
      if (idAEditar !== null) {
        await updateDoc(doc(db, "sucursales", id), datos);
        setSucursales((prev) => prev.map((s) => (s.id === id ? { ...s, ...datos } : s)));
      } else {
        await setDoc(doc(db, "sucursales", id), { ...datos, activa: true });
        setSucursales((prev) => [...prev, { id, ...datos, activa: true }].sort(porNombre));
      }
      cerrarFormulario();
      await publicarEnLaWeb();
    } catch (error) {
      console.error("Error al guardar la Sucursal: ", error);
      setError("No se pudo guardar la sucursal. Revisá la conexión e intentá de nuevo.");
    }
  };

  const cerrarFormulario = () => {
    setFormAbierto(false);
    setError("");
  };

  const abrirFormulario = (id, valores) => {
    setIdAEditar(id);
    setValoresForm(valores);
    setAperturaForm((n) => n + 1);
    setError("");
    setFormAbierto(true);
  };

  const abrirNueva = () => abrirFormulario(null, VALORES_INICIALES);

  const handleEdit = (item) => {
    // Una sucursal anterior al horario por sucursal no tiene el campo: el
    // formulario le propone las horas de siempre, y los días los elige el admin.
    const horario = item.horario || {};
    abrirFormulario(item.id, {
      nombre: item.nombre || "",
      direccion: item.direccion || "",
      ubicacion: textoUbicacion(item.ubicacion),
      telefono: item.telefono || "",
      dias: (horario.dias || VALORES_INICIALES.dias).map(String),
      abre: String(horario.abre ?? VALORES_INICIALES.abre),
      cierra: String(horario.cierra ?? VALORES_INICIALES.cierra),
      horasCorte: horario.horasCorte ?? VALORES_INICIALES.horasCorte,
    });
  };

  // Prender o apagar una sucursal, con confirmación, como los productos. Activa es
  // `activa !== false`, igual que para la web: una sucursal vieja sin el campo
  // figura encendida (antes el botón la mostraba "Inactiva" aunque la web la usara).
  const toggleActiva = async (item) => {
    const activa = item.activa !== false;
    const { isConfirmed } = await Swal.fire({
      titleText: activa ? `¿Cerrar web ${item.nombre}?` : `¿Abrir web ${item.nombre}?`,
      text: activa
        ? "(Cierra para que NO se puedan tomar pedidos)"
        : "(Vuelve a abrir la sucursal para los clientes)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      confirmButtonText: "Sí",
      cancelButtonText: "No",
    });
    if (!isConfirmed) return;

    ejecutar(async () => {
      try {
        await setDoc(doc(db, "sucursales", item.id), { activa: !activa }, { merge: true });
        setSucursales((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, activa: !activa } : s))
        );
        await publicarEnLaWeb();
      } catch (error) {
        console.error("Error al actualizar la Sucursal: ", error);
        Swal.fire({ title: "Error", text: "No se pudo actualizar la sucursal. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#d33" });
      }
    });
  };

  // ── Excepciones ─────────────────────────────────────────────────────────────
  // Las escrituras pasan todas por acá —los botones de hoy y el modal—
  // para que la tabla, el historial en pantalla y la web queden iguales.

  const aplicarExcepciones = (sucursalId, excepcionesWeb) =>
    setSucursales((prev) => prev.map((s) => (s.id === sucursalId ? { ...s, excepcionesWeb } : s)));

  // El registro que se levantó, marcado en pantalla sin volver a leerlo.
  const marcarLevantado = (registros, registroId) => registros.map((r) =>
    r.id === registroId ? { ...r, levantadaPor: userData.nombreCompleto, levantadaEl: null } : r);

  // Devuelve true si se guardó, para que el formulario sepa si limpiarse.
  const guardarExcepcionDe = (sucursal, datos) => ejecutar(async () => {
    try {
      const { excepcionesWeb, registro, levantadoId } = await guardarExcepcion(sucursal, datos, userData);
      aplicarExcepciones(sucursal.id, excepcionesWeb);
      if (idExcepciones === sucursal.id) {
        setHistorial((prev) => (prev.cargado
          ? { ...prev, registros: ordenarHistorial([registro, ...marcarLevantado(prev.registros, levantadoId)]) }
          : prev));
      }
      await publicarEnLaWeb();
      return true;
    } catch (error) {
      console.error("Error al guardar la excepción:", error);
      Swal.fire({ title: "Error", text: "No se pudo guardar la excepción. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#d33" });
      return false;
    }
  });

  const quitarExcepcion = async (sucursal, jornada) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Quitar la excepción?",
      text: `La web de ${sucursal.nombre} vuelve a su horario de siempre para el ${momentDeJornada(jornada).format("dddd DD/MM")}. En el historial queda como quitada.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;

    ejecutar(async () => {
      try {
        const { excepcionesWeb, levantadoId } = await levantarExcepcion(sucursal, jornada, userData);
        aplicarExcepciones(sucursal.id, excepcionesWeb);
        if (idExcepciones === sucursal.id) {
          setHistorial((prev) => (prev.cargado ? { ...prev, registros: marcarLevantado(prev.registros, levantadoId) } : prev));
        }
        await publicarEnLaWeb();
      } catch (error) {
        console.error("Error al quitar la excepción:", error);
        Swal.fire({ title: "Error", text: "No se pudo quitar la excepción. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#d33" });
      }
    });
  };

  // Abrir el modal no lee nada: las próximas salen de `excepcionesWeb`, que ya está
  // en memoria. El historial se lee recién con "Ver historial".
  const verExcepciones = (s) => {
    setIdExcepciones(s.id);
    setHistorial(HISTORIAL_VACIO);
    historialPedido.current = s.id;
  };

  // La primera página con "Ver historial", y las siguientes con "Ver anteriores".
  const cargarHistorial = async () => {
    const id = idExcepciones;
    setHistorial((prev) => ({ ...prev, cargando: true }));
    try {
      const pagina = await leerExcepciones(id, historial.ultimo);
      if (historialPedido.current === id) {
        setHistorial((prev) => ({ ...pagina, registros: [...prev.registros, ...pagina.registros], cargando: false, cargado: true }));
      }
    } catch (error) {
      console.error("Error al leer las excepciones:", error);
      setHistorial((prev) => ({ ...prev, cargando: false }));
      avisarErrorDeCarga("el historial de excepciones");
    }
  };

  const sucursalExcepciones = sucursales.find((s) => s.id === idExcepciones);

  return (
    <div className="container mw-100 py-3">
      <div className="d-flex justify-content-end mb-2">
        <button type="button" className="btn-contorno m-1" onClick={abrirNueva}>
          + Nueva sucursal
        </button>
      </div>

      {/* Tabla simple y no TablaGenerica: son dos o tres filas, y un buscador y un
          paginador estorban más de lo que ayudan. */}
      {sucursales.length === 0 ? (
        <p className="text-body-secondary text-center py-3 mb-0">Todavía no hay sucursales cargadas.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th className="text-center">Estado Web</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((sucursal) => {
                const falta = faltantes(sucursal);
                const estado = estadoDeHoy(sucursal, hoy);
                return (
                  <tr key={sucursal.id}>
                    <td>
                      <div className="fw-bold">{sucursal.nombre}</div>
                      {/* Un faltante por línea. Un join con "<br />" no sirve: React
                          lo muestra como texto. */}
                      {falta.length > 0 && (
                        <small className="text-danger d-block">
                          {falta.map((f) => <span key={f} className="d-block">- {f}</span>)}
                        </small>
                      )}
                    </td>
                    <td>
                      {sucursal.direccion || <small className="text-danger">Falta dirección</small>}
                    </td>
                    {/* Sin teléfono, el pedido web se registra pero no se abre el WhatsApp. */}
                    <td>
                      {sucursal.telefono || <small className="text-danger">Falta teléfono (no llega WhatsApp)</small>}
                    </td>
                    <td className="text-center">
                      <span className={`fw-semibold ${estado.abierta ? "text-success" : "text-danger"}`}>
                        {estado.texto}
                      </span>
                      {estado.motivo && <small className="text-body-secondary d-block">{estado.motivo}</small>}
                    </td>
                    <td className="text-end text-nowrap">
                      {/* Encender o apagar: el color dice lo que hace el botón, verde
                          enciende una apagada y rojo apaga una encendida. */}
                      <button
                        type="button"
                        className={`btn btn-sm me-1 ${sucursal.activa !== false ? "btn-danger" : "btn-success"}`}
                        title={sucursal.activa !== false ? "APAGAR" : "ENCENDER"}
                        disabled={procesando}
                        onClick={() => toggleActiva(sucursal)}
                      >
                        <i className="fa-solid fa-power-off"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm me-1"
                        title="Excepciones de horario"
                        onClick={() => verExcepciones(sucursal)}
                      >
                        <i className="fa-solid fa-calendar-days"></i>
                      </button>
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
        </div>
      )}

      {sucursalExcepciones && (
        <ExcepcionesHorario
          key={sucursalExcepciones.id}
          sucursal={sucursalExcepciones}
          historial={historial}
          procesando={procesando}
          onGuardar={(datos) => guardarExcepcionDe(sucursalExcepciones, datos)}
          onQuitar={(jornada) => quitarExcepcion(sucursalExcepciones, jornada)}
          onCargarHistorial={cargarHistorial}
          onCerrar={() => setIdExcepciones(null)}
        />
      )}

      <Modal show={formAbierto} onHide={cerrarFormulario} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {idAEditar !== null
              ? `Editar ${sucursales.find((s) => s.id === idAEditar)?.nombre || "sucursal"}`
              : "Nueva sucursal"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormularioSucursal
            key={aperturaForm}
            valoresIniciales={valoresForm}
            esEdicion={idAEditar !== null}
            error={error}
            onGuardar={guardar}
            onCancelar={cerrarFormulario}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Sucursales;
