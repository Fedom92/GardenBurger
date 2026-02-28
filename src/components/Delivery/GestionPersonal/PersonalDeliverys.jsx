import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, deleteDoc, doc, query, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import '../../../style/Main.css';
import TablaGenerica from "../../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import CrearDelivery from "./CrearDelivery";
import EditarDelivery from "./EditarDelivery";

const PersonalDeliverys = () => {
    const [deliverys, setDeliverys] = useState([]);
    const [modalShowCrear, setModalShowCrear] = useState(false);
    const [modalShowEditar, setModalShowEditar] = useState(false);
    const [delivery, setDelivery] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const deliverysCollectiona = collection(db, "deliverys");
    const deliverysCollection = useRef(query(deliverysCollectiona));

    const getDeliverys = useCallback((snapshot) => {
        const deliverysArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
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

    const handleEdit = (delivery) => {
        setDelivery(delivery);
        setModalShowEditar(true);
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
                                    camposBusqueda={["nombre", "dni", "telefono", "marcaMoto", "patente"]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CrearDelivery
                show={modalShowCrear}
                onHide={() => setModalShowCrear(false)}
                agregarDelivery={agregarDelivery}
                deliveryExiste={deliveryExiste}
            />

            <EditarDelivery
                show={modalShowEditar}
                onHide={() => setModalShowEditar(false)}
                editarDelivery={editarDelivery}
                deliveryExiste={deliveryExiste}
                delivery={delivery}
            />
        </>
    );
}

export default PersonalDeliverys;
