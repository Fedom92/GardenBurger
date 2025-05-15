import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";

const CreateTarifa = (props) => {
  const { agregartarifa, ...propsModal } = props;
  const [codigo, setCodigo] = useState('');
  const [tratamiento, setTratamiento] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [error, setError] = useState("");

  const tarifasCollection = collection(db, "tarifas");

  useEffect(() => {
    const getCodigo = async () => {
      const querySnapshot = await getDocs(
        query(tarifasCollection, orderBy("codigo", "desc"), limit(1))
      );
      if (!querySnapshot.empty) {
        const maxCodigo = querySnapshot.docs[0].data().codigo;
        setCodigo(Number(maxCodigo) + 1);
      } else {
        setCodigo(1);
      }
    };
    getCodigo();
  }, [tarifasCollection]);

  const store = async (e) => {
    e.preventDefault();
    if (tratamiento === "" || tarifa.trim() === "") {
      setError("El Tratamiento/Tarifa no puede estar vacío");
      setTimeout(clearError, 2000);
      return;
    }
    if (tarifaExiste(tratamiento)) {
      setError("El tratamiento ya existe");
      setTimeout(clearError, 2000);
      return;
    }
    const nuevaTarifa = {
      codigo: codigo,
      tratamiento: tratamiento,
      tarifa: tarifa,
      eliminado: false,
    };

    try {
      const docRef = await addDoc(tarifasCollection, nuevaTarifa);
      props.agregartarifa({ id: docRef.id, ...nuevaTarifa });
      props.onHide();
    } catch (error) {
      console.error("Error al agregar tarifa: ", error);
    }
  };

  const tarifaExiste = (tratamientoParam) => {
    return props.tarifas.some(
      (tratamiento) => quitarAcentos(tratamiento.tratamiento) === quitarAcentos(tratamientoParam));
  };

  const clearError = () => {
    setError("");
  };

  function quitarAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => {
        props.onHide();
        setTratamiento("")
        setTarifa("")
        setError("")
      }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Crear Tarifa</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <form style={{ transform: "scale(0.98)" }}>
            {error && <small className="text-danger">{error}</small>}
            <div className="mb-2">
              <label className="form-label">Codigo</label>
              <input
                value={codigo}
                type="number"
                className="form-control"
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Tratamiento</label>
              <input
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                type="text"
                className="form-control"
                required
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Tarifa</label>
              <input
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                type="text"
                className="form-control"
                required
              />
            </div>
            <button
              type="submit"
              onClick={store}
              className="btn button-main"
            >
              Agregar
            </button>
          </form>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CreateTarifa;