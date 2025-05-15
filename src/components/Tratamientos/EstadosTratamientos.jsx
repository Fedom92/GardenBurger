import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase.js";

const EstadosTratamientos = ({ show, estadotratamientoparam, onHide }) => {
  const [idAEditar, setIdAEditar] = useState(null);
  const [estadoTratamiento, setEstadoTratamiento] = useState('');
  const [error, setError] = useState('');
  const [estadosTratamientos, setEstadosTratamientos] = useState([]);
  const [color, setColor] = useState("");
  const estadosTratamientosCollection = collection(db, "estadosTratamientos");

  const getEstadosTratamientos = (estadotratamientoparam) => {
    const estadosTratamientosArray = estadotratamientoparam.slice().sort((a, b) => a.name - b.name);
    setEstadosTratamientos(estadosTratamientosArray);
  }

  useEffect(() => {
    getEstadosTratamientos(estadotratamientoparam);

  }, [estadotratamientoparam]);

  const inputRef = useRef(null);

  const estadoTratamientosExiste = (name) => {
    return estadosTratamientos.some((estadoTratamientos) => estadoTratamientos.name.toLowerCase() === name.toLowerCase());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (estadoTratamiento.trim() === '') {
      setError('El estado no puede estar vacío');
      return;
    }
    if (estadoTratamientosExiste(estadoTratamiento)) {
      setError('El estado ya existe');
      return;
    }
    if (!color) {
      setColor("#000000")
    }

    const newState = { name: estadoTratamiento, color: color };
    try {
      const docRef = await addDoc(estadosTratamientosCollection, newState)
      const newId = docRef.id;

      setEstadoTratamiento('');
      setError("");
      setColor("")
      setEstadosTratamientos([...estadosTratamientos, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar el Estado Tratamiento: ", error);
    }
  };

  const handleEdit = (estadoTratamiento) => {
    setIdAEditar(estadoTratamiento.id);
    setEstadoTratamiento(estadoTratamiento.name);
    setColor(estadoTratamiento.color);
    setError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (estadoTratamiento.trim() === '') {
      setError('El estado no puede estar vacío');
      return;
    }
    if (color.trim() === '') {
      setError('El color no puede estar vacío');
      return;
    }
    const stateToUpdate = estadosTratamientos.filter((item) => item.id === idAEditar);
    const newState = { name: estadoTratamiento, color: color };

    const estadosTratamientosActualizados = estadosTratamientos.map((estado) =>
      estado.id === idAEditar ? { ...estado, ...newState } : estado
    );
    setEstadosTratamientos(estadosTratamientosActualizados);

    setDoc(doc(estadosTratamientosCollection, stateToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      setEstadoTratamiento('');
      setError('');
      setColor("")
    })
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(estadosTratamientosCollection, id));
    const newStates = estadosTratamientos.filter((estado) => estado.id !== id);
    setEstadosTratamientos(newStates);
    setError('');
    setColor("")
  };

  const clear = () => {
    setIdAEditar(null);
    setEstadoTratamiento('');
    setError("");
    setColor("")
  };

  return (
    <Modal show={show} onHide={onHide} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => { clear() }}>
        <Modal.Title>Gestión Estados Tratamientos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
          <div className="mb-3">
            <label className="form-label">Estado Tratamiento</label>
            <input
              type="text"
              className="form-control"
              value={estadoTratamiento}
              onChange={(e) => setEstadoTratamiento(e.target.value)}
              ref={inputRef}
            />
            {error && <small className="text-danger">{error}</small>}
          </div>
          <div className="mb-3">
            <label className="form-label">Color</label>
            <div className="justify-content-center align-items-center" style={{ display: "flex" }}>
              <label className="form-label" style={{ marginRight: "8px" }}>Elige color para Estado Tratamiento:</label>
              <div className="color-input-container">
                <input
                  type="color"
                  className="color-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button className="btn button-main" type="submit">
            {idAEditar !== null ? 'Actualizar' : 'Crear'}
          </button>

          {idAEditar !== null && (
            <button className="btn btn-secondary mx-2" onClick={() => clear()}>
              Cancelar
            </button>
          )}
        </form>
        <div className="mt-3">
          {estadosTratamientos.map((state, index) => (
            <div key={state.id} className="d-flex align-items-center justify-content-between border p-2">
              <div className="col-3">{state.name}</div>
              <div className="col-1"
              ><input
                  type="color"
                  className="color-preview"
                  style={{ 
                    backgroundColor: state.color,
                    border: `10px solid ${state.color}`
                  }}
                  value={state.color}
                  readOnly
                /></div>
              <div className="col-2">
                <button className="btn button-main mx-1 btn-sm" onClick={() => handleEdit(state)}>
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(state.id)}>
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default EstadosTratamientos;
