import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, deleteDoc, doc, query, orderBy, getDocs, addDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CryptoJS from 'crypto-js';
import '../../style/Main.css';
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";

const PersonalDeliverys = () => {
    const { register, handleSubmit, reset } = useForm();
    const [deliverys, setDeliverys] = useState([]);
    const [modalShowCrear, setModalShowCrear] = useState(false);
    const [modalShowEditar, setModalShowEditar] = useState(false);
    const [delivery, setDelivery] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const deliverysCollectiona = collection(db, "deliverys");
    const deliverysCollection = useRef(query(deliverysCollectiona, orderBy("nombre", "asc")));

    const getDeliverys = useCallback((snapshot) => {
        const deliverysArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDeliverys(deliverysArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const deliverysSnapshot = await getDocs(deliverysCollection.current);
                await getDeliverys(deliverysSnapshot);
            } catch (error) {
                console.error('Error fetching data Deliverys:', error);
            }
        };

        fetchData();
    }, [getDeliverys]);

    //Agrega y Edita en vista Local
    const agregarDelivery = (nuevoDelivery) => {
        const nuevosDeliverys = [...deliverys, nuevoDelivery];
        nuevosDeliverys.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDeliverys(nuevosDeliverys);
    };

    const editarDelivery = (nuevoDeliveryActualizado) => {
        const deliverysActualizados = deliverys.map((delivery) =>
            delivery.id === nuevoDeliveryActualizado.id ? { ...delivery, ...nuevoDeliveryActualizado } : delivery);
        deliverysActualizados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDeliverys(deliverysActualizados);
    };

    const deliveryExiste = (dni, idExcluir = "") => {
        return deliverys.some(
            (delivery) => delivery.dni === dni && delivery.id !== idExcluir
        );
    };

    const handleCreate = async (data) => {
        if (deliveryExiste(data.dni)) {
            setError("Ya existe un delivery con este DNI");
            return;
        }

        const newDelivery = {
            nombre: data.nombre,
            dni: data.dni,
            telefono: data.telefono,
            direccion: data.direccion,
            marcaMoto: data.marcaMoto,
            modeloMoto: data.modeloMoto,
            colorMoto: data.colorMoto,
            patente: data.patente,
            activo: true
        };

        try {
            const docRef = await addDoc(deliverysCollectiona, newDelivery);
            const newId = docRef.id;

            setError("");
            reset();
            agregarDelivery({ id: newId, ...newDelivery });
            setModalShowCrear(false);
            Swal.fire('Éxito', 'Delivery creado correctamente', 'success');

        } catch (error) {
            console.error("Error al agregar el Delivery: ", error);
            Swal.fire('Error', 'No se pudo crear el delivery', 'error');
        }
    };

    const handleEdit = (delivery) => {
        setDelivery(delivery);
        // Precargar valores en el formulario de edición
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
        setModalShowEditar(true);
    };

    const handleUpdate = async (data) => {
        if (deliveryExiste(data.dni, delivery.id)) {
            setError("Ya existe un delivery con este DNI");
            return;
        }

        const newDelivery = {
            nombre: data.nombre,
            dni: data.dni,
            telefono: data.telefono,
            direccion: data.direccion,
            marcaMoto: data.marcaMoto,
            modeloMoto: data.modeloMoto,
            colorMoto: data.colorMoto,
            patente: data.patente,
            activo: true
        };

        try {
            await setDoc(doc(deliverysCollectiona, delivery.id), newDelivery);
            editarDelivery({ id: delivery.id, ...newDelivery });
            setModalShowEditar(false);
            setError("");
            reset();
            Swal.fire('Éxito', 'Delivery actualizado correctamente', 'success');
        } catch (error) {
            console.error("Error al actualizar el Delivery: ", error);
            Swal.fire('Error', 'No se pudo actualizar el delivery', 'error');
        }
    };

    const confirmeDelete = (id) => {
        Swal.fire({
            title: '¿Esta seguro?',
            text: "No podra revertir la accion",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Si',
            cancelButtonText: 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteDelivery(id)
                Swal.fire({
                    title: '¡Borrado!',
                    text: 'Delivery eliminado.',
                    icon: 'success',
                    confirmButtonColor: '#198754'
                });
            }
        })
    }

    const deleteDelivery = async (id) => {
        const deliveryDoc = doc(db, "deliverys", id);
        await deleteDoc(deliveryDoc);
        setDeliverys((prevDeliverys) => prevDeliverys.filter((delivery) => delivery.id !== id));
    };

    const columnasDeliverys = [
        { columnasBasicas: ["nombre", "dni", "telefono", "direccion"] },
        {
            accessorKey: "marcaMoto",
            header: "Marca Moto",
        },
        {
            accessorKey: "modeloMoto",
            header: "Modelo Moto",
        },
        {
            accessorKey: "colorMoto",
            header: "Color Moto",
        },
        {
            accessorKey: "patente",
            header: "Patente",
        },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const delivery = row.original;
                return (
                    <>
                        <button
                            className="btn btn-success mx-1"
                            title="EDITAR"
                            onClick={() => handleEdit(delivery)}
                        >
                            <i className="fa-solid fa-edit"></i>
                        </button>
                        <button
                            onClick={() => confirmeDelete(delivery.id)}
                            className="btn btn-danger"
                            title="ELIMINAR"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </>
                );
            },
        },
    ];

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="container mw-100">
                        <div className="row">
                            <div className="col">
                                <br></br>
                                <div className="d-flex justify-content-between mt-3">
                                    <div
                                        className="d-flex justify-content-start align-items-center"
                                        style={{ maxHeight: "40px", marginLeft: "10px" }}
                                    >
                                        <h1>Gestión de Deliverys</h1>

                                        <button
                                            variant="primary"
                                            className="btn-contorno m-1"
                                            onClick={() => setModalShowCrear(true)}
                                        >
                                            Agregar Delivery
                                        </button>
                                    </div>
                                </div>

                                <TablaGenerica
                                    data={deliverys}
                                    columnas={columnasDeliverys}
                                    sortBy="nombre"
                                    ordenDescendente={false}
                                    camposBusqueda={["nombre", "dni", "telefono", "patente"]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Delivery */}
            <div className={`modal ${modalShowCrear ? 'show' : ''}`} style={{ display: modalShowCrear ? 'block' : 'none' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Crear Delivery</h5>
                            <button type="button" className="btn-close" onClick={() => setModalShowCrear(false)}></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit(handleCreate)}>
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
                                        {error && <small className="text-danger">{error}</small>}
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

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setModalShowCrear(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-success">
                                        Crear
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Editar Delivery */}
            <div className={`modal ${modalShowEditar ? 'show' : ''}`} style={{ display: modalShowEditar ? 'block' : 'none' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Editar Delivery</h5>
                            <button type="button" className="btn-close" onClick={() => setModalShowEditar(false)}></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit(handleUpdate)}>
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
                                        {error && <small className="text-danger">{error}</small>}
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

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setModalShowEditar(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-success">
                                        Actualizar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default PersonalDeliverys;
