import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useAccionUnica } from "../../../Utils/useAccionUnica";

// Las categorias vienen del listener de Productos: este modal no hace ninguna
// lectura propia (antes releia la coleccion entera al montar) ni toca la lista a
// mano. Cada escritura llega sola por el listener, asi que la lista de aca y los
// <option> de Crear/Editar producto se enteran al instante. onCambio avisa que el
// menu publico quedo desactualizado.
//
// Dos vistas en el mismo modal, como Sucursales: la lista, y el formulario solo al
// crear o editar una categoria.
const VALORES_INICIALES = { nroOrden: "", nombre: "" };

const Categorias = ({ show, onHide, categorias, onCambio }) => {
  const { register, handleSubmit, reset } = useForm({ defaultValues: VALORES_INICIALES });

  const [modo, setModo] = useState("lista"); // "lista" | "formulario"
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
      await addDoc(categoriasCollection, newState);
      onCambio?.();
      volverALaLista();
    } catch (error) {
      console.error("Error al agregar la Categoría: ", error);
      setError("No se pudo agregar la categoría. Revisá la conexión e intentá de nuevo.");
    }
  });

  const volverALaLista = () => {
    setIdAEditar(null);
    reset(VALORES_INICIALES);
    setError("");
    setModo("lista");
  };

  const cerrar = () => {
    volverALaLista();
    onHide();
  };

  const abrirNueva = () => {
    setIdAEditar(null);
    reset(VALORES_INICIALES);
    setError("");
    setModo("formulario");
  };

  // Con reset y no con setValue: el formulario todavía no está montado (se ve la
  // lista), y reset deja los valores listos para cuando aparezca.
  const handleEdit = (item) => {
    reset({ nombre: item.nombre, nroOrden: Number(item.nroOrden) });
    setIdAEditar(item.id);
    setError("");
    setModo("formulario");
  };

  // El formulario se limpia DESPUES de que la escritura salio bien: antes no habia
  // catch, y un fallo pasaba en silencio.
  const handleUpdate = async (data) => {
    const categoriaToUpdate = categorias.find((item) => item.id === idAEditar);
    if (!categoriaToUpdate) return;

    const newState = {
      nombre: data.nombre,
      nroOrden: Number(data.nroOrden)
    };

    try {
      await setDoc(doc(categoriasCollection, categoriaToUpdate.id), newState);
      onCambio?.();
      volverALaLista();
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

  const titulo = modo === "lista"
    ? "Categorías"
    : idAEditar !== null
      ? `Editar ${categorias.find((c) => c.id === idAEditar)?.nombre || "categoría"}`
      : "Nueva categoría";

  return (
    <Modal
      show={show}
      onHide={cerrar}
      aria-labelledby="contained-modal-title-vcenter"
      centered
      scrollable
    >
      <Modal.Header closeButton>
        {/* "+ Nueva" va pegado al título; la X queda sola a la derecha, porque
            Bootstrap le pone margin-left: auto. */}
        <Modal.Title>{titulo}</Modal.Title>
        {modo === "lista" && (
          <button type="button" className="btn btn-success btn-sm ms-3" onClick={abrirNueva}>
            + Nueva
          </button>
        )}
      </Modal.Header>
      <Modal.Body>
        {modo === "lista" ? (
          categorias.length === 0 ? (
            <p className="text-body-secondary text-center py-3 mb-0">Todavía no hay categorías cargadas.</p>
          ) : (
            // Tabla simple y no TablaGenerica: son pocas filas dentro de un modal, ya
            // ordenadas por nroOrden desde el listener.
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th className="text-center">Orden</th>
                  <th>Nombre</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria) => (
                  <tr key={categoria.id}>
                    <td className="text-center">{categoria.nroOrden}</td>
                    <td>{categoria.nombre}</td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-success btn-sm me-1"
                        title="Editar"
                        onClick={() => handleEdit(categoria)}
                      >
                        <i className="fa-solid fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Borrar"
                        onClick={() => handleDelete(categoria)}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <form name="categorias" onSubmit={handleSubmit(idAEditar !== null ? handleUpdate : handleCreate)}>
            <div className="mb-3">
              <label className="form-label">Nro Orden*</label>
              <input type="number" className="form-control" required {...register("nroOrden")} min={0} />

              <label className="form-label">Nombre Categoria*</label>
              <input type="text" className="form-control" required {...register("nombre")} />
              {error && <small className="text-danger">{error}</small>}
            </div>

            <div className="d-flex justify-content-between">
              {/* type="button": sin eso, dentro del form, "Volver" enviaba el formulario. */}
              <button type="button" className="btn btn-secondary" onClick={volverALaLista}>
                <i className="fa-solid fa-arrow-left me-1"></i> Volver
              </button>
              <button type="submit" className="btn btn-success">
                {idAEditar !== null ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default Categorias;
