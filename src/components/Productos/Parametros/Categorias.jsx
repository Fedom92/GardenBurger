import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";

const Categorias = ({ show, onHide }) => {
  const { register, handleSubmit, setValue, reset } = useForm();

  const [idAEditar, setIdAEditar] = useState(null);
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

  const categoriaExiste = (nombre) => {
    return categorias.some(
      (categoria) => categoria.nombre.toLowerCase() === nombre.toLowerCase()
    );
  };

  const handleCreate = async (data) => {
    if (categoriaExiste(data.categoria)) {
      setError("La Categoría ya existe");
      return;
    }
    const newState = { nombre: data.categoria };

    try {
      const docRef = await addDoc(categoriasCollection, newState)
      const newId = docRef.id;

      setError("");
      reset();
      setCategorias([...categorias, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar la Categoría: ", error);
    }
  };

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("categoria", item.nombre)
    setError("");
  };

  const handleUpdate = (data) => {
    if (data.categoria.trim() === "") {
      setError("La categoria no puede estar vacía");
      return;
    }
    const categoriaToUpdate = categorias.filter((item) => item.id === idAEditar);

    const newState = { nombre: data.categoria };

    const categoriasActualizadas = categorias.map((item) =>
      item.id === idAEditar ? { ...item, ...newState } : item
    );
    setCategorias(categoriasActualizadas);

    setDoc(doc(categoriasCollection, categoriaToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      reset();
      setError("");
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(categoriasCollection, id));
    const newStates = categorias.filter((item) => item.id !== id);
    setCategorias(newStates);
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
        <Modal.Title>Crear/Editar/Eliminar Categorias</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form name="categorias" onSubmit={handleSubmit(idAEditar !== null ? handleUpdate : handleCreate)}>
          <div className="mb-3">
            <label className="form-label">Nombre Categoria</label>
            <input type="text" className="form-control" required {...register("categoria")} />
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

        <div className="mt-3">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="d-flex align-items-center justify-content-between border p-2"
            >
              <div>{categoria.nombre}</div>
              <div>
                <button
                  type="button"
                  className="btn button-main mx-1 btn-sm"
                  onClick={() => handleEdit(categoria)}
                >
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button
                  type="button"
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
