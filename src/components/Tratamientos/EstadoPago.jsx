import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase.js";

const EstadoPago = ({ show, estadopagoparam, onHide }) => {
  const [idAEditar, setIdAEditar] = useState(null);
  const [estadoPago, setEstadoPago] = useState('');
  const [error, setError] = useState('');
  const [estadosPagos, setEstadosPagos] = useState([]);
  const estadosPagosCollection = collection(db, "estadoPago");
  const [color, setColor] = useState("");

  const getEstadosPagos = (estadopagoparam) => {
    const estadosPagosArray = estadopagoparam.slice().sort((a, b) => a.name - b.name);
    setEstadosPagos(estadosPagosArray);
  }

  useEffect(() => {
    getEstadosPagos(estadopagoparam);
  }, [estadopagoparam]);

  const inputRef = useRef(null);

  const estadoPagoExiste = (name) => {
    return estadosPagos.some((estadoPago) => estadoPago.name.toLowerCase() === name.toLowerCase());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (estadoPago.trim() === '') {
      setError('El estado no puede estar vacío');
      return;
    }
    if (estadoPagoExiste(estadoPago)) {
      setError('El estadoPago ya existe');
      return;
    }
    if (!color) {
      setColor("#000000")
    }
    const newState = { name: estadoPago, color: color };

    try {
      const docRef = await addDoc(estadosPagosCollection, newState)
      const newId = docRef.id;

      setEstadoPago('');
      setError("");
      setColor("")
      setEstadosPagos([...estadosPagos, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar el Estado Pago: ", error);
    }
  };

  const handleEdit = (estadoPago) => {
    setIdAEditar(estadoPago.id);
    setEstadoPago(estadoPago.name);
    setColor(estadoPago.color);
    setError('');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (estadoPago.trim() === '') {
      setError('El estado no puede estar vacío');
      return;
    }
    if (color.trim() === '') {
      setError('El color no puede estar vacío');
      return;
    }
    const stateToUpdate = estadosPagos.filter((item) => item.id === idAEditar);
    const newState = { name: estadoPago, color: color };

    const estadosPagosActualizados = estadosPagos.map((estado) =>
      estado.id === idAEditar ? { ...estado, ...newState } : estado
    );
    setEstadosPagos(estadosPagosActualizados);

    setDoc(doc(estadosPagosCollection, stateToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      setEstadoPago('');
      setError('');
      setColor("")
    })
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(estadosPagosCollection, id));
    const newStates = estadosPagos.filter((estado) => estado.id !== id);
    setEstadosPagos(newStates);
    setError('');
    setColor("")
  };

  const clear = () => {
    setIdAEditar(null);
    setEstadoPago('');
    setError("");
    setColor("")
  };

  return (
    <Modal show={show} onHide={onHide} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => { clear() }}>
        <Modal.Title>Gestión Estados Pago</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
          <div className="mb-3">
            <label className="form-label">Estado Pago</label>
            <input
              type="text"
              className="form-control"
              value={estadoPago}
              onChange={(e) => setEstadoPago(e.target.value)}
              ref={inputRef}
            />
            {error && <small className="text-danger">{error}</small>}
          </div>
          <div className="mb-3">
            <label className="form-label">Color</label>
            <div className="justify-content-center align-items-center" style={{ display: "flex" }}>
              <label className="form-label" style={{ marginRight: "8px" }}>Selecciona un color para Estado Pago:</label>
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
          {estadosPagos.map((state, index) => (
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

export default EstadoPago;
