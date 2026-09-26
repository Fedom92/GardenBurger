import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useAccionUnica } from "../../../Utils/useAccionUnica";

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

  // addDoc genera un id por llamada: un doble click daba dos categorías, porque
  // el chequeo de repetida mira un estado que todavía no se actualizó.
  const { ejecutar } = useAccionUnica();

  const handleCreate = (data) => ejecutar(async () => {
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
      setError("No se pudo agregar la categoría. Revisá la conexión e intentá de nuevo.");
    }
  });

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("nombre", item.nombre);
    setValue("nroOrden", Number(item.nroOrden));
    setError("");
  };

  // El estado local se toca DESPUES de que la escritura salio bien: antes se
  // actualizaba primero y sin catch, asi que un fallo dejaba la pantalla
  // mostrando un dato que Firestore nunca guardo.
  const handleUpdate = async (data) => {
    const categoriaToUpdate = categorias.find((item) => item.id === idAEditar);
    if (!categoriaToUpdate) return;

    const newState = {
      nombre: data.nombre,
      nroOrden: Number(data.nroOrden)
    };

    try {
      await setDoc(doc(categoriasCollection, categoriaToUpdate.id), newState);
      setCategorias(categorias.map((item) => (item.id === idAEditar ? { ...item, ...newState } : item)));
      setIdAEditar(null);
      reset();
      setError("");
      onCambio?.();
    } catch (error) {
      console.error("Error al actualizar la Categoría: ", error);
      setError("No se pudo guardar la categoría. Revisá la conexión.");
    }
  };

  const handleDelete = async (categoria) => {
    const result = await Swal.fire({
      title: '¿Borrar la categoría?',
      text: `Se elimina "${categoria.nombre}". Los productos que la usan quedan sin categoría.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(categoriasCollection, categoria.id));
      setCategorias(categorias.filter((item) => item.id !== categoria.id));
      setError("");
      onCambio?.();
    } catch (error) {
      console.error("Error al borrar la Categoría: ", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo borrar la categoría.',
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
                  onClick={() => handleDelete(categoria)}
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
