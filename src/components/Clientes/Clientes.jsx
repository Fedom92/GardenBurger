import React, { useState, useEffect } from "react";
import { collection, doc, deleteDoc, getDocs, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { fetchSucursales } from "../../Utils/sucursales";
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import "../../style/Main.css";
import CrearCliente from "./CrearCliente";
import EditCliente from "./EditCliente";

// Antes esta pantalla hacía un getDocs de TODA la colección en cada apertura: una
// lectura facturada por cliente, y creciendo para siempre. Ahora no lee nada hasta
// que se busca algo concreto, y siempre con tope.
const TOPE_TELEFONO = 25;
const TOPE_NOMBRE = 50;
const TOPE_SUCURSAL = 100;

// Un término de solo dígitos es un teléfono y se busca exacto, igual que hace
// useCliente al guardar un pedido. Cualquier otra cosa es un nombre.
const esTelefono = (termino) => /^\d{6,}$/.test(termino);

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [busco, setBusco] = useState(false);
    const [error, setError] = useState("");
    const [termino, setTermino] = useState("");
    const [sucursalSel, setSucursalSel] = useState("");
    const [modalShowCrear, setModalShowCrear] = useState(false);
    const [modalShowEditar, setModalShowEditar] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    useEffect(() => {
        fetchSucursales().then(setSucursales).catch(console.error);
    }, []);

    // Arma la consulta real contra Firestore. La sucursal se aplica del lado del
    // servidor solo cuando es el único criterio; combinada con un término se filtra
    // sobre el resultado ya acotado, que no cuesta lecturas ni pide índice nuevo.
    const armarConsulta = (term, suc) => {
        const clientesRef = collection(db, "clientes");

        if (esTelefono(term)) {
            return query(clientesRef, where("telefono", "==", term), limit(TOPE_TELEFONO));
        }

        if (term) {
            // Prefijo: aprovecha el orden natural de `nombre`. Firestore compara
            // byte a byte, así que distingue mayúsculas: hay que escribir el nombre
            // como se cargó. \uf8ff es el último carácter del rango Unicode privado.
            return query(
                clientesRef,
                where("nombre", ">=", term),
                where("nombre", "<=", term + "\uf8ff"),
                orderBy("nombre", "asc"),
                limit(TOPE_NOMBRE)
            );
        }

        return query(
            clientesRef,
            where("sucursal", "==", suc),
            orderBy("nombre", "asc"),
            limit(TOPE_SUCURSAL)
        );
    };

    const buscar = async () => {
        const term = termino.trim();
        if (!term && !sucursalSel) {
            setError("Escribí un nombre o teléfono, o elegí una sucursal.");
            return;
        }

        setIsLoading(true);
        setError("");
        setClientes([]);

        try {
            const snap = await getDocs(armarConsulta(term, sucursalSel));
            let encontrados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

            if (term && sucursalSel) {
                encontrados = encontrados.filter((c) => c.sucursal === sucursalSel);
            }

            encontrados.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            setClientes(encontrados);
            setBusco(true);

            if (encontrados.length === 0) {
                setError("No se encontraron clientes con ese criterio.");
            }
        } catch (e) {
            console.error("Error buscando clientes:", e);
            setError("Error al buscar. Revisá la conexión e intentá de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const ordenar = (lista) => [...lista].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

    const handleCreated = (nuevo) => {
        setClientes((prev) => ordenar([...prev, nuevo]));
        setBusco(true);
        setModalShowCrear(false);
        Swal.fire("Éxito", "Cliente creado correctamente", "success");
    };

    const handleEdit = (cliente) => {
        setClienteSeleccionado(cliente);
        setModalShowEditar(true);
    };

    const handleUpdated = (actualizado) => {
        setClientes((prev) => ordenar(prev.map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c))));
        setModalShowEditar(false);
        Swal.fire("Éxito", "Cliente actualizado correctamente", "success");
    };

    const confirmeDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Esta seguro?',
            text: "No podrá revertir la acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Si',
            cancelButtonText: 'No'
        });

        if (!result.isConfirmed) return;

        // Antes el Swal de éxito salía sin esperar el borrado y sin catch: decía
        // "¡Borrado!" aunque hubiera fallado, y la fila desaparecía igual.
        try {
            await deleteDoc(doc(db, "clientes", id));
            setClientes((prev) => prev.filter((c) => c.id !== id));
            Swal.fire({
                title: '¡Borrado!',
                text: 'Cliente eliminado.',
                icon: 'success',
                confirmButtonColor: '#198754'
            });
        } catch (e) {
            console.error("Error eliminando cliente:", e);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el cliente.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    };

    const columnas = [
        { columnasBasicas: ["nombre", "telefono", "direccion"] },
        { accessorKey: "entreCalles", header: "Entre Calles" },
        {
            accessorKey: "sucursal",
            header: "Sucursal",
            cell: ({ getValue }) => sucursales.find((s) => s.id === getValue())?.nombre || getValue() || "—",
        },
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

                            <div className="d-flex flex-wrap align-items-end gap-2 mt-3 mb-3">
                                <div>
                                    <label className="form-label small mb-1">Nombre o teléfono</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ minWidth: "16rem" }}
                                        value={termino}
                                        placeholder="Teléfono exacto o inicio del nombre"
                                        onChange={(e) => setTermino(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
                                    />
                                </div>
                                <div>
                                    <label className="form-label small mb-1">Sucursal</label>
                                    <select
                                        className="form-select"
                                        value={sucursalSel}
                                        onChange={(e) => setSucursalSel(e.target.value)}
                                    >
                                        <option value="">Todas</option>
                                        {sucursales.map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn btn-dark" onClick={buscar} disabled={isLoading}>
                                    {isLoading ? "Buscando..." : "Buscar"}
                                </button>
                            </div>

                            {error && (
                                <div className="alert alert-secondary py-2" role="alert">
                                    <small>{error}</small>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="text-center py-5">
                                    <span className="loader"></span>
                                </div>
                            ) : busco && clientes.length > 0 ? (
                                <TablaGenerica
                                    data={clientes}
                                    columnas={columnas}
                                    sortBy="nombre"
                                    ordenDescendente={false}
                                    camposBusqueda={["nombre", "telefono", "direccion"]}
                                />
                            ) : !busco && !error ? (
                                <p className="text-body-secondary">
                                    Buscá por teléfono, por el inicio del nombre, o elegí una sucursal para listar sus clientes.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

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
