import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";

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
      }
    };
    fetchData();
  }, [show]);

  const envioExiste = (zona_envio) => {
    return envios.some(
      (envio) => envio.zona_envio.toLowerCase() === zona_envio.toLowerCase()
    );
  };

  const handleCreate = async (data) => {
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
    }
  };

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("zona_envio", item.zona_envio)
    setValue("costo_envio", item.costo_envio);
    setError("");
  };

  const handleUpdate = (data) => {
    const envioToUpdate = envios.filter((item) => item.id === idAEditar);

    const newState = {
      zona_envio: data.zona_envio,
      costo_envio: Number(data.costo_envio)
    };

    const categoriasActualizadas = envios.map((item) =>
      item.id === idAEditar ? { ...item, ...newState } : item
    );
    setEnvios(categoriasActualizadas);

    setDoc(doc(enviosCollection, envioToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      reset();
      setError("");
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(enviosCollection, id));
    const newStates = envios.filter((item) => item.id !== id);
    setEnvios(newStates);
    setError("");
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
                  <div className="text-body-secondary">${envio.costo_envio}</div>
                </div>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => handleEdit(envio)}
                  >
                    <i className="fa-solid fa-edit"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(envio.id)}
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
