import React, { useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";

const EditCliente = (props) => {
    const { onUpdated, cliente, ...propsModal } = props;
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        reset({
            nombre: cliente?.nombre || "",
            direccion: cliente?.direccion || "",
            entreCalles: cliente?.entreCalles || "",
            telefono: cliente?.telefono || "",
        });
    }, [cliente, reset]);

    const update = async (data) => {
        // El cliente ya está en memoria: es el resultado de la búsqueda. Releerlo acá
        // costaba una lectura en cada edición.
        const newData = {
            nombre: data.nombre || cliente.nombre,
            direccion: data.direccion || cliente.direccion,
            entreCalles: data.entreCalles || cliente.entreCalles,
            telefono: data.telefono || cliente.telefono,
        };

        // Sin esto, un fallo dejaba el modal abierto sin decir nada.
        try {
            await updateDoc(doc(db, "clientes", cliente.id), newData);
            onUpdated && onUpdated({ id: cliente.id, ...newData });
            clearForm();
        } catch (error) {
            console.error("Error al editar cliente:", error);
            Swal.fire({ title: "Error", text: "No se pudo guardar el cliente. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#dc3545" });
        }
    };

    const clearForm = () => {
        reset();
        props.onHide && props.onHide();
    };

    return (
        <Modal {...propsModal} size="md" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton onClick={() => clearForm()}>
                <Modal.Title id="contained-modal-title-vcenter">
                    <h1>Editar Cliente</h1>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <div className="container">
                    <div className="col">
                        <form onSubmit={handleSubmit(update)}>
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
                                <button type="submit" className="btn btn-success">Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default EditCliente;



