import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase.js";
import "../../style/Main.css";

const Estados = ({ show, estadosParam, onHide }) => {
  const [idAEditar, setIdAEditar] = useState(null);
  const [nroOrden, setNroOrden] = useState(0);
  const [estado, setEstado] = useState("");
  const [error, setError] = useState("");
  const [estados, setEstados] = useState([]);
  const estadosCollection = collection(db, "estados");
  const [color, setColor] = useState("");

  const getEstados = (estadosParam) => {
    const estadosArray = estadosParam.slice().sort((a, b) => a.nroOrden - b.nroOrden);
    setEstados(estadosArray);
  }

  useEffect(() => {
    getEstados(estadosParam);

  }, [estadosParam]);

  const estadoExiste = (name) => {
    return estados.some(
      (estado) => estado.name.toLowerCase() === name.toLowerCase());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (nroOrden === "" || estado.trim() === "") {
      setError("El Estado/N° Orden no puede estar vacío");
      setTimeout(clearError, 2000);
      return;
    }
    if (estadoExiste(estado)) {
      setError("El estado ya existe");
      setTimeout(clearError, 2000);
      return;
    }
    if (!color) {
      setColor("#000000")
    }
    const newState = { nroOrden: nroOrden, name: estado, color: color };
    try {
      const docRef = await addDoc(estadosCollection, newState)
      const newId = docRef.id;

      setEstado("");
      setNroOrden(0);
      setError("");
      setColor("")
      setEstados([...estados, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar el Estado: ", error);
    }
  };

  const handleEdit = (estado) => {
    setIdAEditar(estado.id);
    setNroOrden(estado.nroOrden);
    setEstado(estado.name);
    setColor(estado.color);
    setError("");
  };

  const clearError = () => {
    setError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (estado.trim() === "") {
      setError("El estado no puede estar vacío");
      setTimeout(clearError, 2000);
      return;
    }
    if (!color) {
      setColor("#000000")
    }
    const stateToUpdate = estados.filter((item) => item.id === idAEditar);
    const newState = { nroOrden: nroOrden, name: estado, color: color };

    const estadosActualizados = estados.map((estado) =>
      estado.id === idAEditar ? { ...estado, ...newState } : estado
    );
    setEstados(estadosActualizados);

    setDoc(doc(estadosCollection, stateToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      setNroOrden(0);
      setEstado("");
      setError("");
      setColor("")
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(estadosCollection, id));
    const newStates = estados.filter((estado) => estado.id !== id);
    setEstados(newStates);
    setNroOrden(0);
    setEstado("");
    setError("");
    setColor("")
  };

  const clear = () => {
    setIdAEditar(null);
    setEstado("");
    setNroOrden(0);
    setError("");
    setColor("")
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => { clear() }}>
        <Modal.Title>Crear/Editar/Eliminar Estado</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
          <div className="row">
            <div className="col-3 sm-1" style={{ textAlign: "center" }}>
              <label className="form-label">N° Orden</label>
              <input
                type="number"
                className="form-control"
                value={nroOrden}
                onChange={(e) => setNroOrden(e.target.value)}
                style={{ textAlign: "center" }}
              />
              {error && <small className="text-danger">{error}</small>}
            </div>
            <div className="col-9 mb-1">
              <label className="form-label">Estado</label>
              <input
                type="text"
                className="form-control"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              />
              {error && <small className="text-danger">{error}</small>}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Color:</label>
            <div className="justify-content-center align-items-center" style={{ display: "flex" }}>
              <label className="form-label" style={{ marginRight: "8px" }}>Selecciona un color para el Estado:</label>
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
            {idAEditar !== null ? "Actualizar" : "Crear"}
          </button>

          {idAEditar !== null && (
            <button
              className="btn btn-secondary mx-2"
              onClick={() => clear()}
            >
              Cancelar
            </button>
          )}
        </form>
        <div className="mt-3">
          {estados.map((state, index) => (
            <div
              key={state.id + index}
              className="d-flex align-items-center justify-content-between border p-2"
            >
              <div className="col-1">{state.nroOrden}</div>
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
                <button
                  className="btn button-main mx-1 btn-sm"
                  onClick={() => handleEdit(state)}
                >
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(state.id)}
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal >
  );
};

export default Estados;
