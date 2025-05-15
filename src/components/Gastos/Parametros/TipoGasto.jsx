import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";

const TipoGasto = ({ show, onHide }) => {
    const [idAEditar, setIdAEditar] = useState(null);
    const [tipoGasto, setTipoGasto] = useState("");
    const [tipoGastos, setTipoGastos] = useState([]);
    const [error, setError] = useState("");

    const tipoGastosCollection = collection(db, "tipoGasto");
    const tipoGastosCollectionOrdenados = useRef(query(tipoGastosCollection, orderBy("name")));

    const getTipoGastos = useCallback((snapshot) => {
        const tipoGastosArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setTipoGastos(tipoGastosArray);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const tipoGastosSnapshot = await getDocs(tipoGastosCollectionOrdenados.current);
                await getTipoGastos(tipoGastosSnapshot);

            } catch (error) {
                console.error('Error fetching data Tipo Gasto:', error);
            }
        };

        fetchData();

    }, [getTipoGastos]);

    const inputRef = useRef(null);

    const tipoGastoExiste = (name) => {
        return tipoGastos.some(
            (tipoGasto) => tipoGasto.name.toLowerCase() === name.toLowerCase()
        );
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (tipoGasto.trim() === "") {
            setError("El Tipo Gasto no puede estar vacío");
            return;
        }
        if (tipoGastoExiste(tipoGasto)) {
            setError("El Tipo Gasto ya existe");
            return;
        }
        const newState = { name: tipoGasto };

        try {
            const docRef = await addDoc(tipoGastosCollection, newState)
            const newId = docRef.id;

            setTipoGasto("");
            setError("");
            setTipoGastos([...tipoGastos, { id: newId, ...newState }]);

        } catch (error) {
            console.error("Error al agregar el Tipo Gasto: ", error);
        }
    };

    const handleEdit = (tipo) => {
        setIdAEditar(tipo.id);
        setTipoGasto(tipo.name);
        setError("");
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (tipoGasto.trim() === "") {
            setError("El Tipo Gasto no puede estar vacío");
            return;
        }
        const tipoGastoToUpdate = tipoGastos.filter((item) => item.id === idAEditar);

        const newState = { name: tipoGasto };

        const tipoGastosActualizados = tipoGastos.map((item) =>
            item.id === idAEditar ? { ...item, ...newState } : item
        );
        setTipoGastos(tipoGastosActualizados);

        setDoc(doc(tipoGastosCollection, tipoGastoToUpdate[0].id), newState).then(() => {
            setIdAEditar(null);
            setTipoGasto("");
            setError("");
        });
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(tipoGastosCollection, id));
        const newStates = tipoGastos.filter((item) => item.id !== id);
        setTipoGastos(newStates);
        setTipoGasto("");
        setError("");
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>Crear/Editar/Eliminar Tipo Compra</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
                    <div className="mb-3">
                        <label className="form-label">Tipo Gasto</label>
                        <input
                            type="text"
                            className="form-control"
                            value={tipoGasto}
                            onChange={(e) => setTipoGasto(e.target.value)}
                            ref={inputRef}
                        />
                        {error && <small className="text-danger">{error}</small>}
                    </div>
                    <button className="btn button-main" type="submit">
                        {idAEditar !== null ? "Actualizar" : "Crear"}
                    </button>

                    {idAEditar !== null && (
                        <button
                            className="btn btn-secondary mx-2"
                            onClick={() => setIdAEditar(null)}
                        >
                            Cancelar
                        </button>
                    )}
                </form>
                <div className="mt-3">
                    {tipoGastos.map((tipo, index) => (
                        <div
                            key={tipo.id}
                            className="d-flex align-items-center justify-content-between border p-2"
                        >
                            <div>{tipo.name}</div>
                            <div>
                                <button
                                    className="btn button-main mx-1 btn-sm"
                                    onClick={() => handleEdit(tipo)}
                                >
                                    <i className="fa-solid fa-edit"></i>
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(tipo.id)}
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default TipoGasto;
