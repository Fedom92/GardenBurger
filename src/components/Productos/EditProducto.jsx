import React, { useEffect, useState } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const EditProducto = (props) => {
  const { editar_producto, categorias_options, producto, ...propsModal } = props;
  const { register, handleSubmit, reset, watch } = useForm();
  const categoriaSeleccionada = watch("categoria");

  const [modoImagen, setModoImagen] = useState("link"); // "link" | "upload"
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");

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

  const subirImagenStorage = async (archivo) => {
    const nombreArchivo = `productos/${Date.now()}_${archivo.name}`;
    const storageRef = ref(storage, nombreArchivo);
    const metadata = { cacheControl: "public, max-age=31536000" };
    await uploadBytes(storageRef, archivo, metadata);
    return await getDownloadURL(storageRef);
  };

  const update = async (data) => {
    try {
      setSubiendoImagen(true);
      const productoRef = doc(db, "productos", producto.id);
      const productoDoc = await getDoc(productoRef);
      const productoData = productoDoc.data();

      let urlImagen = productoData.imagen; // conservar la actual por defecto

      if (modoImagen === "link" && data.imagen) {
        urlImagen = data.imagen;
      } else if (modoImagen === "upload" && archivoImagen) {
        urlImagen = await subirImagenStorage(archivoImagen);
      }

      const newData = {
        categoria: data.categoria || productoData.categoria,
        descripcion: data.descripcion || productoData.descripcion,
        precio: Number(data.precio) || Number(productoData.precio),
        imagen: urlImagen,
        ingredientes: data.ingredientes || productoData.ingredientes,
        oferta: data.oferta || false,
        tipoExtra: data.categoria === "EXTRA" ? (data.tipoExtra || productoData.tipoExtra) : "",
      };

      await updateDoc(productoRef, newData);
      editar_producto({ id: producto.id, ...newData });
      clearForm();
    } catch (err) {
      console.error("Error al editar producto: ", err);
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
                  <input type="number" className="form-control" autoComplete="off" required {...register("precio")} min={0} onInput={e => e.target.value = e.target.value.slice(0, 6)} />
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
                    <>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => {
                          const archivo = e.target.files[0] || null;
                          if (archivo && archivo.size > 5 * 1024 * 1024) {
                            setErrorImagen("La imagen es pesada,no puede superar los 5MB.");
                            e.target.value = "";
                            setArchivoImagen(null);
                          } else {
                            setErrorImagen("");
                            setArchivoImagen(archivo);
                          }
                        }}
                      />
                      {errorImagen && <small className="text-danger">{errorImagen}</small>}
                    </>
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