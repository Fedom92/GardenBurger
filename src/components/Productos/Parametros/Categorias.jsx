import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";

const Categorias = ({ show, onHide }) => {
  const [idAEditar, setIdAEditar] = useState(null);
  const [categoria, setCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState("");

  const categoriasCollection = collection(db, "categorias");
  const categoriasCollectionOrdenados = useRef(query(categoriasCollection, orderBy("nombre")));

  const getCategorias = useCallback((snapshot) => {
    const categoriasArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setCategorias(categoriasArray);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriasSnapshot = await getDocs(categoriasCollectionOrdenados.current);
        await getCategorias(categoriasSnapshot);

      } catch (error) {
        console.error('Error fetching data Categoría:', error);
      }
    };

    fetchData();

  }, [getCategorias]);

  const inputRef = useRef(null);

  const categoriaExiste = (nombre) => {
    return categorias.some(
      (categoria) => categoria.nombre.toLowerCase() === nombre.toLowerCase()
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (categoria.trim() === "") {
      setError("La Categoría no puede estar vacía");
      return;
    }
    if (categoriaExiste(categoria)) {
      setError("La Categoría ya existe");
      return;
    }
    const newState = { nombre: categoria };

    try {
      const docRef = await addDoc(categoriasCollection, newState)
      const newId = docRef.id;

      setCategoria("");
      setError("");
      setCategorias([...categorias, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar la Categoría: ", error);
    }
  };

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setCategoria(item.nombre);
    setError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (categoria.trim() === "") {
      setError("La categoria no puede estar vacía");
      return;
    }
    const categoriaToUpdate = categorias.filter((item) => item.id === idAEditar);

    const newState = { nombre: categoria };

    const categoriasActualizadas = categorias.map((item) =>
      item.id === idAEditar ? { ...item, ...newState } : item
    );
    setCategorias(categoriasActualizadas);

    setDoc(doc(categoriasCollection, categoriaToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      setCategoria("");
      setError("");
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(categoriasCollection, id));
    const newStates = categorias.filter((item) => item.id !== id);
    setCategorias(newStates);
    setCategoria("");
    setError("");
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Crear/Editar/Eliminar Categorias</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
          <div className="mb-3">
            <label className="form-label">Nombre Categoria</label>
            <input
              type="text"
              className="form-control"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              ref={inputRef}
            />
            {error && <small className="text-danger">{error}</small>}
          </div>
          <button className="btn button-main" type="submit">
            {idAEditar !== null ? "Actualizar" : "Crear"}
          </button>

          {idAEditar !== null && (
            <button
              className="btn btn-secondary mx-2"
              onClick={() => setIdAEditar(null)}
            >
              Cancelar
            </button>
          )}
        </form>
        <div className="mt-3">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="d-flex align-items-center justify-content-between border p-2"
            >
              <div>{categoria.nombre}</div>
              <div>
                <button
                  className="btn button-main mx-1 btn-sm"
                  onClick={() => handleEdit(categoria)}
                >
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(categoria.id)}
                >
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

export default Categorias;
