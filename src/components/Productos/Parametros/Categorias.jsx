import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";

// Las categorias vienen de Productos, que ya las leyo: este modal no hace ninguna
// lectura propia (antes releia la coleccion entera al montar). Editar aca actualiza
// el estado del padre, asi que los <option> de Crear/Editar producto se enteran al
// instante. onCambio avisa que el menu publico quedo desactualizado.
const Categorias = ({ show, onHide, categorias, setCategorias, onCambio }) => {
  const { register, handleSubmit, setValue, reset } = useForm();

  const [idAEditar, setIdAEditar] = useState(null);
  const [error, setError] = useState("");

  const categoriasCollection = collection(db, "categorias");

  const categoriaExiste = (nombre) => {
    return categorias.some(
      (categoria) => categoria.nombre.toLowerCase() === nombre.toLowerCase()
    );
  };

  const handleCreate = async (data) => {
    if (categoriaExiste(data.nombre)) {
      setError("La Categoría ya existe");
      return;
    }
    const newState = {
      nombre: data.nombre,
      nroOrden: Number(data.nroOrden)
    };

    try {
      const docRef = await addDoc(categoriasCollection, newState)
      const newId = docRef.id;

      setError("");
      reset();
      setCategorias([...categorias, { id: newId, ...newState }]);
      onCambio?.();

    } catch (error) {
      console.error("Error al agregar la Categoría: ", error);
    }
  };

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("nombre", item.nombre);
    setValue("nroOrden", Number(item.nroOrden));
    setError("");
  };

  const handleUpdate = (data) => {
    const categoriaToUpdate = categorias.filter((item) => item.id === idAEditar);

    const newState = {
      nombre: data.nombre,
      nroOrden: Number(data.nroOrden)
    };

    const categoriasActualizadas = categorias.map((item) =>
      item.id === idAEditar ? { ...item, ...newState } : item
    );
    setCategorias(categoriasActualizadas);

    setDoc(doc(categoriasCollection, categoriaToUpdate[0].id), newState).then(() => {
      setIdAEditar(null);
      reset();
      setError("");
      onCambio?.();
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(categoriasCollection, id));
    const newStates = categorias.filter((item) => item.id !== id);
    setCategorias(newStates);
    setError("");
    onCambio?.();
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
            <label className="form-label">Nro Orden*</label>
            <input type="number" className="form-control" required {...register("nroOrden")} min={0} />

            <label className="form-label">Nombre Categoria*</label>
            <input type="text" className="form-control" required {...register("nombre")} />
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
              <div className="col-1">{categoria.nroOrden}</div>
              <div className="col-8">{categoria.nombre}</div>
              <div className="col-2">
                <button
                  type="button"
                  className="btn btn-success mx-1 btn-sm"
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
