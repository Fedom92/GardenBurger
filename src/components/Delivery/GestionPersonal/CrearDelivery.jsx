import React, { useState } from "react";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { colSucursal } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";

const CrearDelivery = (props) => {
    const { userData } = useAuth();
    const { register, handleSubmit, reset } = useForm();
    const { agregarDelivery, deliveryExiste, ...propsModal } = props;
    const [error, setError] = useState("");

    const deliverysCollection = colSucursal("deliverys");

    const guardarBD = async (data) => {
        if (deliveryExiste(data.dni)) {
            setError("Ya existe un delivery con este DNI");
            return;
        }

        const nuevoDelivery = {
            nombre: data.nombre,
            dni: data.dni,
            telefono: data.telefono,
            direccion: data.direccion,
            marcaMoto: data.marcaMoto,
            modeloMoto: data.modeloMoto,
            colorMoto: data.colorMoto,
            patente: data.patente,
            activo: true,
            creaDeliveryID: userData.id,
            creaDelivery: userData.nombreCompleto,
            creaDeliveryTimestamp: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(deliverysCollection, nuevoDelivery);
            agregarDelivery({ id: docRef.id, ...nuevoDelivery });
            clearForm();
            Swal.fire("Éxito", "Delivery creado correctamente", "success");
        } catch (error) {
            console.error("Error al agregar el Delivery: ", error);
            Swal.fire("Error", "No se pudo crear el delivery", "error");
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
                    <h1>Crear Delivery</h1>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <div className="container">
                    <div className="col">
                        <form name="crearDelivery" onSubmit={handleSubmit(guardarBD)}>
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

                            <div className="d-flex justify-content-end align-items-baseline mt-2">
                                {error && (
                                    <div className="alert alert-danger p-0 me-1" role="alert">
                                        {error}
                                    </div>
                                )}
                                <button type="submit" className="btn btn-success">
                                    Crear
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default CrearDelivery;
