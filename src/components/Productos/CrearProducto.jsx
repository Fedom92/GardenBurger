import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const CrearProducto = (props) => {
  const { register, handleSubmit, reset } = useForm();
  const { agregar_producto, categorias_options, ...propsModal } = props;
  const [error, setError] = useState("");

  const productosCollection = collection(db, "productos");

  const guardarBD = async (data) => {
    const nuevoProducto = {
      categoria: data.categoria,
      descripcion: data.descripcion,
      precio: Number(data.precio),
      imagen: data.imagen,
    };

    try {
      const docRef = await addDoc(productosCollection, nuevoProducto);
      agregar_producto({ id: docRef.id, ...nuevoProducto });
      clearForm();
    } catch (error) {
      console.error("Error al agregar producto: ", error);
    }
  };

  const clearForm = () => {
    reset();
    setError("");
    props.onHide();
  };

  return (
    <Modal {...propsModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => clearForm()}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Nuevo Producto</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <div className="container">
          <div className="col">
            <form name="crearProducto" onSubmit={handleSubmit(guardarBD)}>
              <div className="row">
                <div className="col-8 mb-2">
                  <label className="form-label">Descripción*</label>
                  <input type="text" className="form-control" autoComplete="off" required {...register("descripcion")} />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Precio*</label>
                  <input type="number" className="form-control" autoComplete="off" required {...register("precio")} min={0} />
                </div>
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Categoria*</label>
                  <select className="form-control" multiple={false} required {...register("categoria")}>
                    <option value="">Selecciona acá....</option>
                    {categorias_options}
                  </select>
                </div>

                <div className="col-6 mb-2">
                  <label className="form-label">Link Imagen</label>
                  <input type="text" className="form-control" autoComplete="off" {...register("imagen")} />
                </div>
              </div>

              <div className="d-flex justify-content-end align-items-baseline">
                {error && (
                  <div
                    className="alert alert-danger p-0 me-1"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-success"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default CrearProducto;
