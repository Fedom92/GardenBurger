import React, { useEffect } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const EditProducto = (props) => {
  const { editar_producto, categorias_options, producto, ...propsModal } = props;
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    reset({
      categoria: producto.categoria || "",
      descripcion: producto.descripcion || "",
      precio: Number(producto.precio) || "",
      imagen: producto.imagen || "",
    });
  }, [producto, reset]);

  const update = async (data) => {
    const productoRef = doc(db, "productos", props.id);
    const productoDoc = await getDoc(productoRef);
    const productoData = productoDoc.data();

    const newData = {
      categoria: data.categoria || productoData.categoria,
      descripcion: data.descripcion || productoData.descripcion,
      precio: Number(data.precio) || Number(productoData.precio),
      imagen: data.imagen || productoData.imagen
    };

    await updateDoc(productoRef, newData);
    editar_producto({ id: props.id, ...newData });

    clearForm();
  };

  const clearForm = () => {
    reset();
    props.onHide();
  };

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
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
                    <option value="">Selecciona acá...</option>
                    {categorias_options}
                  </select>
                </div>

                <div className="col-6 mb-2">
                  <label className="form-label">Link Imagen</label>
                  <input type="text" className="form-control" autoComplete="off" {...register("imagen")} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-success"
              >
                Editar
              </button>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default EditProducto;