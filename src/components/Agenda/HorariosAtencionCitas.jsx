import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { addDoc, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase.js";

const HorariosAtencionCitas = ({ horariosParam, show, onHide }) => {
    const [idAEditar, setIdAEditar] = useState(null);
    const [horario, setHorario] = useState('');
    const [error, setError] = useState('');
    const [horarios, setHorarios] = useState([]);
    const horariosCollection = collection(db, "horariosAtencion");
    const [cols, setCols] = useState(1);

    const getEstados = (horariosParam) => {
        setHorarios(horariosParam);
        setCols(Math.ceil(horariosParam.length / 10));
    }

    useEffect(() => {
        getEstados(horariosParam);
    }, [horariosParam]);

    const horarioExiste = (name) => {
        return horarios.some((horario) => horario.name.toLowerCase() === name.toLowerCase());
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (horario.trim() === '') {
            setError('El horario no puede estar vacío');
            setTimeout(clearError, 2000);
            return;
        }
        if (horarioExiste(horario)) {
            setError('El horario ya existe');
            setTimeout(clearError, 2000);
            return;
        }

        const newHorario = { name: horario };

        try {
            const docRef = await addDoc(horariosCollection, newHorario)
            const newId = docRef.id;

            setHorario('');
            setError('');
            setHorarios([...horarios, { id: newId, ...newHorario }]);

        } catch (error) {
            console.error("Error al agregar el Horario: ", error);
        }
    };

    const handleEdit = (horario) => {
        setIdAEditar(horario.id);
        setHorario(horario.name);
        setError('');
    };

    const clearError = () => {
        setError("");
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (horario.trim() === '') {
            setError('El horario no puede estar vacío');
            setTimeout(clearError, 2000);
            return;
        }
        if (horarioExiste(horario)) {
            setError('El horario ya existe');
            setTimeout(clearError, 2000);
            return;
        }
        const horarioToUpdate = horarios.filter((item) => item.id === idAEditar);
        const newHorario = { name: horario };

        const horariosActualizados = horarios.map((horario) =>
            horario.id === idAEditar ? { ...horario, ...newHorario } : horario
        );
        setHorarios(horariosActualizados);

        setDoc(doc(horariosCollection, horarioToUpdate[0].id), newHorario)
            .then(() => {
                setIdAEditar(null);
                setHorario('');
                setError('');
            })
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(horariosCollection, id));
        const newHorarios = horarios.filter((horario) => horario.id !== id);
        setHorarios(newHorarios);
        setHorario('');
        setError('');
    };

    const clear = () => {
        setIdAEditar(null);
        setHorario('');
        setError("");
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton onClick={() => { clear() }}>
                <Modal.Title>Crear/Editar/Eliminar Horarios</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
                    <div className="mb-6">
                        <label className="form-label">Horarios</label >
                        <input
                            type="text"
                            className="form-control"
                            maxLength={5}
                            value={horario}
                            onChange={(e) => setHorario(e.target.value)}
                        />
                        {error && <small className="text-danger">{error}</small>}
                    </div>
                    <button className="btn button-main mt-1" type="submit">
                        {idAEditar !== null ? 'Actualizar' : 'Crear'}
                    </button>
                    {idAEditar !== null && (
                        <button className="btn btn-secondary mx-2" onClick={() => clear()}>
                            Cancelar
                        </button>
                    )}
                </form>
                <div style={{ columnCount: cols, marginTop: '10px' }}>
                    {horarios.map((horario, index) => (
                        <div key={horario.id + index}
                            className="d-flex align-items-center justify-content-between border p-2"
                            style={{ borderRadius: '30px', margin: '5px' }}
                        >
                            <div>{horario.name}</div>
                            <div>
                                <button className="btn button-main mx-1 btn-sm" onClick={() => handleEdit(horario)}>
                                    <i className="fa-solid fa-edit"></i>
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(horario.id)}>
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

export default HorariosAtencionCitas;