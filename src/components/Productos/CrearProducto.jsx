import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const CrearProducto = (props) => {
  const { register, handleSubmit, reset, watch } = useForm();
  const { agregar_producto, categorias_options, ...propsModal } = props;
  const [error, setError] = useState("");
  const [modoImagen, setModoImagen] = useState("link"); // "link" | "upload"
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const categoriaSeleccionada = watch("categoria");

  const productosCollection = collection(db, "productos");

  const subirImagenStorage = async (archivo) => {
    const nombreArchivo = `productos/${Date.now()}_${archivo.name}`;
    const storageRef = ref(storage, nombreArchivo);
    const metadata = { cacheControl: "public, max-age=31536000" };
    await uploadBytes(storageRef, archivo, metadata);
    return await getDownloadURL(storageRef);
  };

  const guardarBD = async (data) => {
    try {
      setSubiendoImagen(true);
      let urlImagen = data.imagen;

      if (modoImagen === "upload") {
        if (!archivoImagen) {
          setError("Seleccioná una imagen para subir.");
          setSubiendoImagen(false);
          return;
        }
        urlImagen = await subirImagenStorage(archivoImagen);
      }

      if (!urlImagen) {
        setError("La imagen es requerida.");
        setSubiendoImagen(false);
        return;
      }

      const nuevoProducto = {
        categoria: data.categoria,
        descripcion: data.descripcion,
        precio: Number(data.precio),
        imagen: urlImagen,
        ingredientes: data.ingredientes,
        visible: true,
        oferta: data.oferta || false,
        tipoExtra: data.categoria === "EXTRA" ? data.tipoExtra : "",
      };

      const docRef = await addDoc(productosCollection, nuevoProducto);
      agregar_producto({ id: docRef.id, ...nuevoProducto });
      clearForm();
    } catch (err) {
      console.error("Error al agregar producto: ", err);
      setError("Error al guardar el producto.");
    } finally {
      setSubiendoImagen(false);
    }
  };

  const clearForm = () => {
    reset();
    setError("");
    setArchivoImagen(null);
    setModoImagen("link");
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
                      onChange={(e) => {
                        const archivo = e.target.files[0] || null;
                        if (archivo && archivo.size > 5 * 1024 * 1024) {
                          setError("La imagen es pesada, no puede superar los 5MB.");
                          e.target.value = "";
                          setArchivoImagen(null);
                        } else {
                          setError("");
                          setArchivoImagen(archivo);
                        }
                      }}
                    />
                  )}
                </div>

                <div className="col-3 text-center">
                  <label className="form-check-label" htmlFor="ofertaCrear">¿Oferta?</label>
                  <input
                    className="form-check-input mt-2 p-3"
                    type="checkbox"
                    id="ofertaCrear"
                    {...register("oferta")}
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-12">
                  <label className="form-label">Ingredientes</label>
                  <textarea className="form-control" rows="3" autoComplete="off" {...register("ingredientes")}></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end align-items-baseline mt-2">
                {error && (
                  <div className="alert alert-danger p-0 me-2 px-2" role="alert">
                    {error}
                  </div>
                )}
                <button type="submit" className="btn btn-success" disabled={subiendoImagen}>
                  {subiendoImagen ? "Subiendo..." : "Agregar"}
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
