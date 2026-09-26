import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { ENVIOS_LOCALES } from "../../../Utils/Constantes";
import { fmtPesos } from "../../../Utils/formato";
import { useAccionUnica } from "../../../Utils/useAccionUnica";

// "Retira" y "Espera Afuera" no son zonas cualquiera: el codigo las compara POR
// TEXTO contra ENVIOS_LOCALES para decidir el ruteo de cocina (mostrador vs
// reparto), el desglose del arqueo (efectivoLocal vs efectivoEnvio) y los tabs de
// la Caja. Renombrarlas o borrarlas desde aca rompia las tres cosas en silencio.
const esZonaLocal = (envio) => ENVIOS_LOCALES.includes(envio.zona_envio);

// ABM de zonas de envío. Colección global: las zonas las centraliza el admin
// y son iguales para todas las sucursales.
const Envios = ({ show, onHide }) => {
  const { register, handleSubmit, setValue, reset } = useForm();

  const [idAEditar, setIdAEditar] = useState(null);
  const [envios, setEnvios] = useState([]);
  const [error, setError] = useState("");

  const enviosCollection = collection(db, "envios");

  useEffect(() => {
    if (!show) return;
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, "envios"), orderBy("zona_envio")));
        setEnvios(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data Envíos:", error);
        setError("No se pudieron cargar las zonas de envío. Revisá la conexión.");
      }
    };
    fetchData();
  }, [show]);

  const envioExiste = (zona_envio) => {
    return envios.some(
      (envio) => envio.zona_envio.toLowerCase() === zona_envio.toLowerCase()
    );
  };

  // addDoc genera un id por llamada: un doble click daba dos zonas, porque el
  // chequeo de repetida mira un estado que todavía no se actualizó.
  const { ejecutar } = useAccionUnica();

  const handleCreate = (data) => ejecutar(async () => {
    if (envioExiste(data.zona_envio)) {
      setError("El envío ya existe");
      return;
    }
    const newState = {
      zona_envio: data.zona_envio,
      costo_envio: Number(data.costo_envio)
    };

    try {
      const docRef = await addDoc(enviosCollection, newState)
      const newId = docRef.id;

      setError("");
      reset();
      setEnvios([...envios, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar el Envío: ", error);
      setError("No se pudo agregar la zona. Revisá la conexión e intentá de nuevo.");
    }
  });

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("zona_envio", item.zona_envio)
    setValue("costo_envio", item.costo_envio);
    setError("");
  };

  // El estado local se toca DESPUES de que la escritura salio bien: antes se
  // actualizaba primero y sin catch, asi que un fallo dejaba la pantalla
  // mostrando un dato que Firestore nunca guardo.
  const handleUpdate = async (data) => {
    const envioToUpdate = envios.find((item) => item.id === idAEditar);
    if (!envioToUpdate) return;

    const newState = {
      zona_envio: data.zona_envio,
      costo_envio: Number(data.costo_envio)
    };

    try {
      await setDoc(doc(enviosCollection, envioToUpdate.id), newState);
      setEnvios(envios.map((item) => (item.id === idAEditar ? { ...item, ...newState } : item)));
      setIdAEditar(null);
      reset();
      setError("");
    } catch (error) {
      console.error("Error al actualizar el Envío: ", error);
      setError("No se pudo guardar el envío. Revisá la conexión.");
    }
  };

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
      setEnvios(envios.filter((item) => item.id !== envio.id));
      setError("");
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

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => {
        reset();
      }}>
        <Modal.Title>Crear/Editar/Eliminar Envíos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form name="envios" onSubmit={handleSubmit(idAEditar !== null ? handleUpdate : handleCreate)}>
          <div className="mb-3">
            <label className="form-label">Zona Envío*</label>
            <input type="text" className="form-control" required {...register("zona_envio")} />
            {error && <small className="text-danger">{error}</small>}
          </div>

          <div className="mb-3">
            <label className="form-label">Costo Envío*</label>
            <input type="number" className="form-control" required {...register("costo_envio")} min={0} />
            {error && <small className="text-danger">{error}</small>}
          </div>

          <button type="submit" className=" btn btn-success">
            {idAEditar !== null ? "Actualizar" : "Crear"}
          </button>

          {idAEditar !== null && (
            <button
              className="btn btn-secondary mx-2"
              onClick={() => { setIdAEditar(null); reset(); setError(""); }}
            >
              Cancelar
            </button>
          )}
        </form>

        <div className="row g-2 mt-1">
          {envios.map((envio) => (
            <div key={envio.id} className="col-4">
              <div className="border p-1 d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{envio.zona_envio}</div>
                  <div className="text-body-secondary">{fmtPesos(envio.costo_envio)}</div>
                </div>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => handleEdit(envio)}
                    disabled={esZonaLocal(envio)}
                    title={esZonaLocal(envio)
                      ? "Zona fija del sistema: el nombre decide el ruteo de cocina y el arqueo"
                      : "Editar"}
                  >
                    <i className="fa-solid fa-edit"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(envio)}
                    disabled={esZonaLocal(envio)}
                    title={esZonaLocal(envio)
                      ? "Zona fija del sistema: no se puede borrar"
                      : "Borrar"}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default Envios;
