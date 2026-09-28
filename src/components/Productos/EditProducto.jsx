import React, { useEffect, useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { soloEnteros } from "../../Utils/formato";
import { subirImagenProducto, IMAGEN_ILEGIBLE } from "../../Utils/imagenes";

const EditProducto = (props) => {
  // onGuardado solo avisa que hubo un cambio (el menú queda sin publicar): la tabla
  // de Productos se entera sola por su listener.
  const { onGuardado, categorias_options, producto, ...propsModal } = props;
  const { register, handleSubmit, reset, watch } = useForm();
  const categoriaSeleccionada = watch("categoria");

  const [modoImagen, setModoImagen] = useState("link"); // "link" | "upload"
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  useEffect(() => {
    setModoImagen("link");
    setArchivoImagen(null);
    reset({
      categoria: producto.categoria || "",
      descripcion: producto.descripcion || "",
      precio: Number(producto.precio) || "",
      imagen: producto.imagen || "",
      ingredientes: producto.ingredientes || "",
      oferta: producto.oferta || false,
      tipoExtra: producto.tipoExtra || ""
    });
  }, [producto, reset]);

  const update = async (data) => {
    try {
      setSubiendoImagen(true);
      // El producto ya está en memoria: es la fila de la tabla. Releerlo acá costaba
      // una lectura y un viaje al servidor en cada edición.
      let urlImagen = producto.imagen; // conservar la actual por defecto

      if (modoImagen === "link" && data.imagen) {
        urlImagen = data.imagen;
      } else if (modoImagen === "upload" && archivoImagen) {
        urlImagen = await subirImagenProducto(archivoImagen);
      }

      const newData = {
        categoria: data.categoria || producto.categoria,
        descripcion: (data.descripcion || producto.descripcion).trim(),
        precio: Number(data.precio) || Number(producto.precio),
        imagen: urlImagen,
        ingredientes: data.ingredientes || producto.ingredientes,
        oferta: data.oferta || false,
        tipoExtra: data.categoria === "EXTRA" ? (data.tipoExtra || producto.tipoExtra) : "",
      };

      await updateDoc(doc(db, "productos", producto.id), newData);
      onGuardado();
      clearForm();
    } catch (err) {
      console.error("Error al editar producto: ", err);
      // Sin esto el modal quedaba abierto sin decir nada, y el precio viejo seguía.
      const texto = err.message === IMAGEN_ILEGIBLE ? IMAGEN_ILEGIBLE : 'No se pudo guardar el producto. Revisá la conexión e intentá de nuevo.';
      Swal.fire({ title: 'Error', text: texto, icon: 'error', confirmButtonColor: '#dc3545' });
    } finally {
      setSubiendoImagen(false);
    }
  };

  const clearForm = () => {
    reset();
    setArchivoImagen(null);
    setModoImagen("link");
    props.onHide();
  };

  return (
    <Modal {...propsModal} size="md" aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => clearForm()}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Editar Producto</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <div className="container">
          <div className="col">
            <form name="editarProducto" onSubmit={handleSubmit(update)}>
              <div className="row">
                <div className="col-9">
                  <label className="form-label">Descripción*</label>
                  <input type="text" className="form-control" autoComplete="off" required {...register("descripcion")} />
                </div>

                <div className="col-3">
                  <label className="form-label">Precio*</label>
                  <input type="number" className="form-control" autoComplete="off" required {...register("precio")} min={0} step={1} onKeyDown={soloEnteros} onInput={e => e.target.value = e.target.value.slice(0, 6)} />
                </div>
              </div>

              <div className="row mt-1">
                <div className="col-7">
                  <label className="form-label">Categoria*</label>
                  <select className="form-control" multiple={false} required {...register("categoria")}>
                    <option value="">Selecciona acá...</option>
                    {categorias_options}
                  </select>
                </div>

                {categoriaSeleccionada === "EXTRA" && (
                  <div className="col-5">
                    <label className="form-label">Tipo de Extra*</label>
                    <select className="form-control" required {...register("tipoExtra")}>
                      <option value="">Seleccione....</option>
                      <option value="GENERAL">GENERAL</option>
                      <option value="HAMBURGUESA">HAMBURGUESA</option>
                      <option value="PAPAS">PAPAS</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Imagen: toggle Link / Subir archivo */}
              <div className="row mt-2">
                <div className="col-9">
                  <label className="form-label me-3">Imagen*</label>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm btn-upload ${modoImagen === "link" ? "btn-dark" : "btn-outline-dark"}`}
                      onClick={() => setModoImagen("link")}
                    >
                      🔗 Link URL
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm btn-upload ${modoImagen === "upload" ? "btn-dark" : "btn-outline-dark"}`}
                      onClick={() => setModoImagen("upload")}
                    >
                      📁 Subir archivo
                    </button>
                  </div>

                  {modoImagen === "link" ? (
                    <input
                      type="text"
                      className="form-control"
                      autoComplete="off"
                      {...register("imagen")}
                    />
                  ) : (
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      // Sin tope de peso: la foto se achica antes de subirla (Utils/imagenes.js).
                      onChange={(e) => setArchivoImagen(e.target.files[0] || null)}
                    />
                  )}
                </div>

                <div className="col-3 text-center">
                  <label className="form-check-label" htmlFor="ofertaEditar">¿Oferta?</label>
                  <input
                    className="form-check-input mt-2 p-3"
                    type="checkbox"
                    id="ofertaEditar"
                    {...register("oferta")}
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-12">
                  <label className="form-label">Ingredientes <span className="fs-7 fst-italic">(es lo que verán los clientes)</span></label>
                  <textarea className="form-control" rows="3" autoComplete="off" {...register("ingredientes")}></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end mt-2">
                <button type="submit" className="btn btn-success" disabled={subiendoImagen}>
                  {subiendoImagen ? "Subiendo..." : "Editar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default EditProducto;