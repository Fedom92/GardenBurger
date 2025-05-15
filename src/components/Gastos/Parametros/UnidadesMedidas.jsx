import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";

const UnidadesMedidas = ({ show, onHide }) => {
    const [idAEditar, setIdAEditar] = useState(null);
    const [unidadMedida, setUnidadMedida] = useState("");
    const [unidadesMedidas, setUnidadesMedidas] = useState([]);
    const [error, setError] = useState("");

    const unidadesMedidasCollection = collection(db, "unidadesMedidas");
    const unidadesMedidasCollectionOrdenados = useRef(query(unidadesMedidasCollection, orderBy("name")));

    const getUnidadesMedidas = useCallback((snapshot) => {
        const unidadesMedidasArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setUnidadesMedidas(unidadesMedidasArray);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const unidadesMedidasSnapshot = await getDocs(unidadesMedidasCollectionOrdenados.current);
                await getUnidadesMedidas(unidadesMedidasSnapshot);

            } catch (error) {
                console.error('Error fetching data Unidad Medida:', error);
            }
        };

        fetchData();

    }, [getUnidadesMedidas]);

    const inputRef = useRef(null);

    const unidadMedidaExiste = (name) => {
        return unidadesMedidas.some(
            (unidadMedida) => unidadMedida.name.toLowerCase() === name.toLowerCase()
        );
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (unidadMedida.trim() === "") {
            setError("La unidad medida no puede estar vacío");
            return;
        }
        if (unidadMedidaExiste(unidadMedida)) {
            setError("La unidad medida ya existe");
            return;
        }
        const newState = { name: unidadMedida };

        try {
            const docRef = await addDoc(unidadesMedidasCollection, newState)
            const newId = docRef.id;
            setUnidadMedida("");
            setError("");
            setUnidadesMedidas([...unidadesMedidas, { id: newId, ...newState }]);

        } catch (error) {
            console.error("Error al agregar la Unidad Medida: ", error);
        }
    };

    const handleEdit = (uniMedida) => {
        setIdAEditar(uniMedida.id);
        setUnidadMedida(uniMedida.name);
        setError("");
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (unidadMedida.trim() === "") {
            setError("La unidad medida no puede estar vacío");
            return;
        }
        const unidadMedidaToUpdate = unidadesMedidas.filter((item) => item.id === idAEditar);
        const newState = { name: unidadMedida };

        const uniMedidasActualizados = unidadesMedidas.map((item) =>
            item.id === idAEditar ? { ...item, ...newState } : item
        );
        setUnidadesMedidas(uniMedidasActualizados);

        setDoc(doc(unidadesMedidasCollection, unidadMedidaToUpdate[0].id), newState).then(() => {
            setIdAEditar(null);
            setUnidadMedida("");
            setError("");
        });
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(unidadesMedidasCollection, id));
        const newStates = unidadesMedidas.filter((item) => item.id !== id);
        setUnidadesMedidas(newStates);
        setUnidadMedida("");
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
                <Modal.Title>Crear/Editar/Eliminar Unidad Medida</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
                    <div className="mb-3">
                        <label className="form-label">Unidad Medida</label>
                        <input
                            type="text"
                            className="form-control"
                            value={unidadMedida}
                            onChange={(e) => setUnidadMedida(e.target.value)}
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
                    {unidadesMedidas.map((uniMedida, index) => (
                        <div
                            key={uniMedida.id}
                            className="d-flex align-items-center justify-content-between border p-2"
                        >
                            <div>{uniMedida.name}</div>
                            <div>
                                <button
                                    className="btn button-main mx-1 btn-sm"
                                    onClick={() => handleEdit(uniMedida)}
                                >
                                    <i className="fa-solid fa-edit"></i>
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(uniMedida.id)}
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

export default UnidadesMedidas;
