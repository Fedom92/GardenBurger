import React, { useEffect } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";

const EditarDelivery = (props) => {
    const { editarDelivery, deliveryExiste, delivery, ...propsModal } = props;
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        reset({
            nombre: delivery.nombre || "",
            dni: delivery.dni || "",
            telefono: delivery.telefono || "",
            direccion: delivery.direccion || "",
            marcaMoto: delivery.marcaMoto || "",
            modeloMoto: delivery.modeloMoto || "",
            colorMoto: delivery.colorMoto || "",
            patente: delivery.patente || "",
        });
    }, [delivery, reset]);

    const update = async (data) => {
        if (deliveryExiste(data.dni, delivery.id)) {
            Swal.fire("Error", "Ya existe un delivery con este DNI", "error");
            return;
        }

        const deliveryRef = doc(db, "deliverys", delivery.id);
        const deliveryDoc = await getDoc(deliveryRef);
        const deliveryData = deliveryDoc.data();

        const newData = {
            nombre: data.nombre || deliveryData.nombre,
            dni: data.dni || deliveryData.dni,
            telefono: data.telefono || deliveryData.telefono,
            direccion: data.direccion || deliveryData.direccion,
            marcaMoto: data.marcaMoto || deliveryData.marcaMoto,
            modeloMoto: data.modeloMoto || deliveryData.modeloMoto,
            colorMoto: data.colorMoto || deliveryData.colorMoto,
            patente: data.patente || deliveryData.patente,
        };

        try {
            await updateDoc(deliveryRef, newData);
            editarDelivery({ id: delivery.id, ...newData });
            clearForm();
            Swal.fire("Éxito", "Delivery actualizado correctamente", "success");
        } catch (error) {
            console.error("Error al actualizar el Delivery: ", error);
            Swal.fire("Error", "No se pudo actualizar el delivery", "error");
        }
    };

    const clearForm = () => {
        reset();
        props.onHide();
    };

    return (
        <Modal {...propsModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton onClick={() => clearForm()}>
                <Modal.Title id="contained-modal-title-vcenter">
                    <h1>Editar Delivery</h1>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <div className="container">
                    <div className="col">
                        <form name="editarDelivery" onSubmit={handleSubmit(update)}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Nombre*</label>
                                    <input type="text" className="form-control" required {...register("nombre")} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Dirección*</label>
                                    <input type="text" className="form-control" required {...register("direccion")} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">DNI*</label>
                                    <input type="text" className="form-control" required {...register("dni")} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Teléfono*</label>
                                    <input type="text" className="form-control" required {...register("telefono")} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Patente*</label>
                                    <input type="text" className="form-control" required {...register("patente")} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Marca Moto*</label>
                                    <input type="text" className="form-control" required {...register("marcaMoto")} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Modelo Moto*</label>
                                    <input type="text" className="form-control" required {...register("modeloMoto")} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Color Moto*</label>
                                    <input type="text" className="form-control" required {...register("colorMoto")} />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-2">
                                <button type="submit" className="btn btn-success">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default EditarDelivery;
