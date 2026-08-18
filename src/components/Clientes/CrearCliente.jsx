import React from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

const CrearCliente = (props) => {
    const { onCreated, ...propsModal } = props;
    const { register, handleSubmit, reset } = useForm();
    const { userData } = useAuth();

    const clientesCollection = collection(db, "clientes");

    const guardarBD = async (data) => {
        const nuevoCliente = {
            nombre: data.nombre,
            direccion: data.direccion,
            entreCalles: data.entreCalles || "",
            telefono: data.telefono,
            // Sucursal desde la que se dio de alta (vacío si lo creó un admin)
            sucursal: userData?.sucursal || "",
        };

        const docRef = await addDoc(clientesCollection, nuevoCliente);
        onCreated && onCreated({ id: docRef.id, ...nuevoCliente });
        clearForm();
    };

    const clearForm = () => {
        reset();
        props.onHide && props.onHide();
    };

    return (
        <Modal {...propsModal} size="md" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton onClick={() => clearForm()}>
                <Modal.Title id="contained-modal-title-vcenter">
                    <h1>Crear Cliente</h1>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <div className="container">
                    <div className="col">
                        <form onSubmit={handleSubmit(guardarBD)}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Nombre*</label>
                                    <input type="text" className="form-control" required {...register("nombre")} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Teléfono*</label>
                                    <input type="text" className="form-control" required {...register("telefono")} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Dirección*</label>
                                    <input type="text" className="form-control" required {...register("direccion")} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Entre Calles</label>
                                    <input type="text" className="form-control" {...register("entreCalles")} />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-2">
                                <button type="submit" className="btn btn-success">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default CrearCliente;



