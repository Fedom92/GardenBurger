import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, doc, deleteDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import "../../style/Main.css";
import CrearCliente from "./CrearCliente";
import EditCliente from "./EditCliente";

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalShowCrear, setModalShowCrear] = useState(false);
    const [modalShowEditar, setModalShowEditar] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    const clientesCollection = useRef(query(collection(db, "clientes"), orderBy("nombre", "asc")));

    const getClientes = useCallback((snapshot) => {
        const clientesArray = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setClientes(clientesArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const clientesSnapshot = await getDocs(clientesCollection.current);
                await getClientes(clientesSnapshot);
            } catch (error) {
                console.error("Error cargando clientes:", error);
            }
        };

        fetchData();
    }, [getClientes]);

    const agregarClienteLocal = (nuevo) => {
        const nuevos = [...clientes, nuevo];
        nuevos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setClientes(nuevos);
    };

    const actualizarClienteLocal = (actualizado) => {
        const nuevos = clientes.map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c));
        nuevos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setClientes(nuevos);
    };

    const handleCreated = (nuevo) => {
        agregarClienteLocal(nuevo);
        setModalShowCrear(false);
        Swal.fire("Éxito", "Cliente creado correctamente", "success");
    };

    const handleEdit = (cliente) => {
        setClienteSeleccionado(cliente);
        setModalShowEditar(true);
    };

    const handleUpdated = (actualizado) => {
        actualizarClienteLocal(actualizado);
        setModalShowEditar(false);
        Swal.fire("Éxito", "Cliente actualizado correctamente", "success");
    };

    const confirmeDelete = (id) => {
        Swal.fire({
            title: '¿Esta seguro?',
            text: "No podrá revertir la acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Si',
            cancelButtonText: 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteCliente(id)
                Swal.fire({
                    title: '¡Borrado!',
                    text: 'Cliente eliminado.',
                    icon: 'success',
                    confirmButtonColor: '#198754'
                });
            }
        })
    };

    const deleteCliente = async (id) => {
        const clienteDoc = doc(db, "clientes", id);
        await deleteDoc(clienteDoc);
        setClientes((prev) => prev.filter((c) => c.id !== id));
    };

    const columnas = [
        { columnasBasicas: ["nombre", "telefono", "direccion"] },
        { accessorKey: "entreCalles", header: "Entre Calles" },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const cliente = row.original;
                return (
                    <>
                        <button className="btn btn-success mx-1" title="EDITAR" onClick={() => handleEdit(cliente)}>
                            <i className="fa-solid fa-edit"></i>
                        </button>
                        <button className="btn btn-danger" title="ELIMINAR" onClick={() => confirmeDelete(cliente.id)}>
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
                                    <div className="d-flex justify-content-start align-items-center" style={{ maxHeight: "40px", marginLeft: "10px" }}>
                                        <h1>Clientes</h1>
                                        <button className="btn-contorno m-1" onClick={() => setModalShowCrear(true)}>
                                            Agregar Cliente
                                        </button>
                                    </div>
                                </div>

                                <TablaGenerica
                                    data={clientes}
                                    columnas={columnas}
                                    sortBy="nombre"
                                    ordenDescendente={false}
                                    camposBusqueda={["nombre", "telefono", "direccion"]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CrearCliente
                show={modalShowCrear}
                onHide={() => setModalShowCrear(false)}
                onCreated={handleCreated}
            />
            {clienteSeleccionado && (<EditCliente
                show={modalShowEditar}
                onHide={() => setModalShowEditar(false)}
                cliente={clienteSeleccionado}
                onUpdated={handleUpdated}
            />)}

        </>
    );
};

export default Clientes;


