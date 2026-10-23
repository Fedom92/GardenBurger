import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { ENVIOS_LOCALES } from "../../../Utils/Constantes";
import { rangoDeZona } from "../../../Utils/zonasEnvio";
import { publicarEnvios, marcarMenuPendiente } from "../../../Utils/menuPublico";
import { fmtPesos } from "../../../Utils/formato";
import { useAccionUnica } from "../../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../../Utils/avisos";
import TablaGenerica from "../../../Utils/TablaGenerica";

// "Retira" y "Espera Afuera" no son zonas cualquiera: el codigo las compara POR
// TEXTO contra ENVIOS_LOCALES para decidir el ruteo de cocina (mostrador vs
// reparto), el desglose del arqueo (efectivoLocal vs efectivoEnvio) y los tabs de
// la Caja. Renombrarlas o borrarlas desde aca rompia las tres cosas en silencio,
// asi que ni se muestran. Siguen en `envios` para el chequeo de repetidas: no se
// puede crear otra "Retira".
const esZonaLocal = (envio) => ENVIOS_LOCALES.includes(envio.zona_envio);

const FORMULARIO_VACIO = { zona_envio: "", costo_envio: "" };

// El formulario del modal, con su propio useForm: Envios lo monta de cero en cada
// apertura (key), así que arranca siempre con `valoresIniciales`, sin depender de
// reset(). Con un solo useForm y reset(), en Sucursales lo de una edición quedaba
// en el alta siguiente; ver FormularioSucursal.
const FormularioEnvio = ({ valoresIniciales, esEdicion, error, procesando, onGuardar, onCancelar }) => {
  const { register, handleSubmit } = useForm({ defaultValues: valoresIniciales });

  return (
    <form name="envios" onSubmit={handleSubmit(onGuardar)}>
      <div className="mb-3">
        <label className="form-label">Zona Envío*</label>
        <input type="text" className="form-control" required placeholder="Desde-hasta, en km. Ej: 3-4" {...register("zona_envio")} />
      </div>

      <div className="mb-3">
        <label className="form-label">Costo Envío*</label>
        <input type="number" className="form-control" required min={0} {...register("costo_envio")} />
      </div>

      {error && <small className="text-danger d-block mb-2">{error}</small>}

      <div className="d-flex justify-content-between">
        {/* type="button": sin eso, dentro del form, "Cancelar" enviaba el formulario. */}
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-success" disabled={procesando}>
          {esEdicion ? "Guardar cambios" : "Agregar"}
        </button>
      </div>
    </form>
  );
};

// ABM de zonas de envío, pestaña del Panel Admin. Colección global: las zonas las
// centraliza el admin y son iguales para todas las sucursales. La tabla y, al
// tocar "Agregar Envío" o Editar, el formulario en un modal.
const Envios = () => {
  const [envios, setEnvios] = useState([]);
  // getDocs va siempre al servidor: hasta que vuelve, la tabla vacía parecía lenta.
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idAEditar, setIdAEditar] = useState(null);
  const [error, setError] = useState("");
  // Con qué valores arranca el formulario, y un número por apertura que es su key.
  const [valoresForm, setValoresForm] = useState(FORMULARIO_VACIO);
  const [aperturaForm, setAperturaForm] = useState(0);

  const enviosCollection = collection(db, "envios");

  // Se lee al abrir la pestaña por primera vez: PanelAdmin la monta recién ahí.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, "envios"), orderBy("zona_envio")));
        setEnvios(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data Envíos:", error);
        avisarErrorDeCarga("las zonas de envío");
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, []);

  // Contra todas, las locales incluidas: no se puede crear ni renombrar otra
  // "Retira". Al editar, la propia no cuenta.
  const zonaRepetida = (zona_envio, id) => envios.some(
    (envio) => envio.id !== id && envio.zona_envio.toLowerCase() === zona_envio.trim().toLowerCase()
  );

  const abrirModal = (id, valores) => {
    setIdAEditar(id);
    setValoresForm(valores);
    setAperturaForm((n) => n + 1);
    setError("");
    setModalAbierto(true);
  };

  const abrirNuevo = () => abrirModal(null, FORMULARIO_VACIO);
  const abrirEdicion = (envio) => abrirModal(envio.id, { zona_envio: envio.zona_envio, costo_envio: envio.costo_envio });

  const cerrarModal = () => {
    setModalAbierto(false);
    setError("");
  };

  // addDoc genera un id por llamada: un doble click daba dos zonas, porque el
  // chequeo de repetida mira un estado que todavía no se actualizó.
  const { procesando, ejecutar } = useAccionUnica();

  // El estado local se toca DESPUES de que la escritura salio bien: antes se
  // actualizaba primero y sin catch, asi que un fallo dejaba la pantalla
  // mostrando un dato que Firestore nunca guardo.
  // Después de cada escritura, con la lista ya actualizada: la web lee las zonas de
  // menu.json. Si no se pudo republicar, lo guardado vale igual (la Caja lee
  // Firestore), pero la web calcula con las zonas viejas: se avisa y queda prendida
  // la bandera de "Publicar Menú". Como en Sucursales.
  const publicarEnLaWeb = async (lista) => {
    try {
      await publicarEnvios(lista);
    } catch (error) {
      console.error("No se pudo publicar las zonas en menu.json:", error);
      marcarMenuPendiente();
      Swal.fire({
        title: "Guardado, pero la web no se actualizó",
        text: "Usá «Publicar Menú» en Productos para que la web lo vea.",
        icon: "warning",
        confirmButtonColor: "#198754",
      });
    }
  };

  const guardar = (data) => ejecutar(async () => {
    // La web calcula el envío leyendo este texto como un rango en km
    // (Utils/zonasEnvio.js): "3 a 4" o "3-4 km" la dejarían afuera sin aviso.
    if (!rangoDeZona(data.zona_envio)) {
      setError("La zona va en kilómetros, desde-hasta: por ejemplo 3-4");
      return;
    }
    if (zonaRepetida(data.zona_envio, idAEditar)) {
      setError("Ya existe una zona con ese nombre");
      return;
    }
    const datos = {
      zona_envio: data.zona_envio.trim(),
      costo_envio: Number(data.costo_envio),
    };

    try {
      let lista;
      if (idAEditar !== null) {
        await setDoc(doc(enviosCollection, idAEditar), datos);
        lista = envios.map((item) => (item.id === idAEditar ? { ...item, ...datos } : item));
      } else {
        const docRef = await addDoc(enviosCollection, datos);
        lista = [...envios, { id: docRef.id, ...datos }];
      }
      setEnvios(lista);
      cerrarModal();
      await publicarEnLaWeb(lista);
    } catch (error) {
      console.error("Error al guardar el Envío: ", error);
      setError("No se pudo guardar la zona. Revisá la conexión e intentá de nuevo.");
    }
  });

  const handleDelete = async (envio) => {
    const result = await Swal.fire({
      title: '¿Borrar la zona?',
      text: `Se elimina "${envio.zona_envio}". Los pedidos ya cargados conservan su copia.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(enviosCollection, envio.id));
      const lista = envios.filter((item) => item.id !== envio.id);
      setEnvios(lista);
      await publicarEnLaWeb(lista);
    } catch (error) {
      console.error("Error al borrar el Envío: ", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo borrar la zona de envío.',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const columnas = [
    { accessorKey: "zona_envio", header: "Zona" },
    {
      accessorKey: "costo_envio",
      header: "Costo",
      cell: ({ getValue }) => fmtPesos(getValue()),
    },
    {
      id: "acciones",
      header: "Acción",
      cell: ({ row }) => (
        <>
          <button type="button" className="btn btn-success mx-1" title="EDITAR" onClick={() => abrirEdicion(row.original)}>
            <i className="fa-solid fa-edit"></i>
          </button>
          <button type="button" className="btn btn-danger" title="BORRAR" onClick={() => handleDelete(row.original)}>
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </>
      ),
    },
  ];

  return (
    <div className="container mw-100 py-3">
      <div className="d-flex justify-content-end mb-2">
        <button type="button" className="btn-contorno m-1" onClick={abrirNuevo}>
          + Agregar Envío
        </button>
      </div>

      {cargando ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <TablaGenerica
          data={envios.filter((envio) => !esZonaLocal(envio))}
          columnas={columnas}
          sortBy="zona_envio"
          ordenDescendente={false}
          camposBusqueda={["zona_envio"]}
        />
      )}

      <Modal show={modalAbierto} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{idAEditar !== null ? "Editar envío" : "Agregar envío"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormularioEnvio
            key={aperturaForm}
            valoresIniciales={valoresForm}
            esEdicion={idAEditar !== null}
            error={error}
            procesando={procesando}
            onGuardar={guardar}
            onCancelar={cerrarModal}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Envios;
