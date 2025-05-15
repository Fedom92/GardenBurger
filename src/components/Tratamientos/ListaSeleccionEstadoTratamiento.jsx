import React, { useState, useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";

const ListaSeleccionEstadoTratamiento = ({ tratamientoId, editarestadotratamiento, estadosTratamientosParam }) => {
    const [estados, setEstados] = useState([]);

    useEffect(() => {
        const fetchEstados = async () => {
            let estadosData = estadosTratamientosParam.map(estado => estado.name);
            setEstados(estadosData);
        };

        fetchEstados();
    }, [estadosTratamientosParam]);

    const handleEstadoChange = async (selectedEstado) => {
        const tratamientoRef = doc(db, "tratamientos", tratamientoId);
        await updateDoc(tratamientoRef, { estadosTratamientos: selectedEstado });
        editarestadotratamiento(tratamientoId, { estadosTratamientos: selectedEstado });
    };

    return (
        <div>
            <Dropdown onSelect={handleEstadoChange}>
                <Dropdown.Toggle variant="info" id="dropdown-button2" className="p-2 my-1 border-0" style={{ backgroundColor: "#FFF", color: "#808080" }}>
                </Dropdown.Toggle>
                <div className="dropdown__container">
                    <Dropdown.Menu>
                        {estados.map((estado, index) => (
                            <Dropdown.Item key={index} eventKey={estado}>{estado}</Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </div>
            </Dropdown>
        </div>
    );
};

export default ListaSeleccionEstadoTratamiento;