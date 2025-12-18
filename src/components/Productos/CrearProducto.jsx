import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const CrearProducto = (props) => {
  const { register, handleSubmit, reset, watch } = useForm();
  const { agregar_producto, categorias_options, ...propsModal } = props;
  const [error, setError] = useState("");
  const categoriaSeleccionada = watch("categoria");

  const productosCollection = collection(db, "productos");

  const guardarBD = async (data) => {
    const nuevoProducto = {
      categoria: data.categoria,
      descripcion: data.descripcion,
      precio: Number(data.precio),
      imagen: data.imagen,
      ingredientes: data.ingredientes,
      visible: true,
      oferta: data.oferta || false,
      tipoExtra: data.categoria === "EXTRA" ? data.tipoExtra : "",
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
    <Modal {...propsModal} size="md" aria-labelledby="contained-modal-title-vcenter" centered>
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
                <div className="col-9">
                  <label className="form-label">Descripción*</label>
                  <input type="text" className="form-control" autoComplete="off" required {...register("descripcion")} />
                </div>

                <div className="col-3">
                  <label className="form-label">Precio*</label>
                  <input type="number" className="form-control" autoComplete="off" required {...register("precio")} min={0} onInput={e => e.target.value = e.target.value.slice(0, 6)} />
                </div>
              </div>

              <div className="row mt-1">
                <div className="col-7">
                  <label className="form-label">Categoria*</label>
                  <select className="form-control" multiple={false} required {...register("categoria")}>
                    <option value="">Selecciona acá....</option>
                    {categorias_options}
                  </select>
                </div>

                {categoriaSeleccionada === "EXTRA" && (
                  <div className="col-5">
                    <label className="form-label">Tipo de Extra*</label>
                    <select className="form-control" required {...register("tipoExtra")}>
                      <option value="">Selecciona acá....</option>
                      <option value="GENERAL">GENERAL</option>
                      <option value="HAMBURGUESA">HAMBURGUESA</option>
                      <option value="PAPAS">PAPAS</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="row mt-2">
                <div className="col-9">
                  <label className="form-label">Link Imagen*</label>
                  <input type="text" className="form-control" autoComplete="off" required {...register("imagen")} />
                </div>

                <div className="col-3 text-center mt-1">
                  <label className="form-label align-middle" htmlFor="oferta">¿Oferta?</label>
                  <div className="form-check ">
                    <input
                      className="form-check-input m-auto p-3"
                      type="checkbox"
                      id="oferta"
                      {...register("oferta")}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <label className="form-label">Ingredientes</label>
                  <textarea className="form-control" rows="3" autoComplete="off" {...register("ingredientes")}></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end align-items-baseline mt-2">
                {error && (
                  <div
                    className="alert alert-danger p-0 me-1"
                    role="alert">
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
