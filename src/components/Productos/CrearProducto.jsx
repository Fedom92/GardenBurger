import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import 'moment/locale/es';
import moment from "moment";

function CrearProducto(props) {
  const { agregar_producto, categorias_options, ...propsModal } = props;
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState("");
  const [error, setError] = useState("");

  const productosCollection = collection(db, "productos");

  const store = async (e) => {
    e.preventDefault();
    moment.locale('es')

    const nuevoProducto = {
      categoria,
      descripcion,
      precio,
      imagen,
    };

    try {
      const docRef = await addDoc(productosCollection, nuevoProducto);
      agregar_producto({ id: docRef.id, ...nuevoProducto });

    } catch (error) {
      console.error("Error al agregar producto: ", error);
    }

    clearFields();
    props.onHide();
  };

  const clearFields = () => {
    setCategoria("");
    setDescripcion("");
    setPrecio("");
    setImagen("");
  };

  const validateFields = (e) => {
    e.preventDefault();
    if (
      categoria.trim() === "" ||
      descripcion.trim() === "" ||
      precio.trim() === "") {
      setError("Respeta los campos obligatorios *");
      setTimeout(clearError, 2000);
      return false;
    } else {
      setError("");
      store(e);
    }
    return true;
  };

  const clearError = () => {
    setError("");
  };
  console.log(categorias_options)
console.log(props.categorias_options)
  return (
    <Modal {...propsModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => {
        clearFields();
      }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Nuevo Producto</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <div className="container">
          <div className="col">
            <div className="row">
              <form>
                <div className="row">
                  <div className="col-8 mb-2">
                    <label className="form-label">Descripción*</label>
                    <input
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      type="text"
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="col-4 mb-2">
                    <label className="form-label">Precio*</label>
                    <input
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      type="number"
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">Categoria*</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="form-control"
                      multiple={false}
                      required
                    >
                      {categorias_options}
                    </select>
                  </div>

                  <div className="col-6 mb-2">
                    <label className="form-label">Link Imagen</label>
                    <input
                      value={imagen}
                      onChange={(e) => setImagen(e.target.value)}
                      type="text"
                      className="form-control"
                    />
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
                    onClick={validateFields}
                    className="btn button-main"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default CrearProducto;
