import React, { useEffect } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const EditProducto = (props) => {
  const { editar_producto, categorias_options, producto, ...propsModal } = props;
  const { register, handleSubmit, reset, watch } = useForm();
  const categoriaSeleccionada = watch("categoria");

  useEffect(() => {
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
    const productoRef = doc(db, "productos", producto.id);
    const productoDoc = await getDoc(productoRef);
    const productoData = productoDoc.data();

    const newData = {
      categoria: data.categoria || productoData.categoria,
      descripcion: data.descripcion || productoData.descripcion,
      precio: Number(data.precio) || Number(productoData.precio),
      imagen: data.imagen || productoData.imagen,
      ingredientes: data.ingredientes || productoData.ingredientes,
      oferta: data.oferta || false,
      tipoExtra: data.categoria === "EXTRA" ? (data.tipoExtra || productoData.tipoExtra) : "",
    };

    try {
      await updateDoc(productoRef, newData);
      editar_producto({ id: producto.id, ...newData });

      clearForm();
    } catch (error) {
      console.error("Error al editar producto: ", error);
    }
  };

  const clearForm = () => {
    reset();
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

              <div className="d-flex justify-content-end mt-2">
                <button
                  type="submit"
                  className="btn btn-success"
                >
                  Editar
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