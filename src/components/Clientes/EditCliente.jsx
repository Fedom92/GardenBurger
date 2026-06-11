import React, { useEffect } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

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
        const clienteRef = doc(db, "clientes", cliente.id);
        const clienteDoc = await getDoc(clienteRef);
        const clienteData = clienteDoc.data();

        const newData = {
            nombre: data.nombre || clienteData.nombre,
            direccion: data.direccion || clienteData.direccion,
            entreCalles: data.entreCalles || clienteData.entreCalles,
            telefono: data.telefono || clienteData.telefono,
        };

        await updateDoc(clienteRef, newData);
        onUpdated && onUpdated({ id: cliente.id, ...newData });
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



