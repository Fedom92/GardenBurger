import React, { useState, useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";

const ListaSeleccionEstadoCita = ({ citaId, estadosParam, editarcita }) => {
    const [estados, setEstados] = useState([]);

    useEffect(() => {
        const fetchEstadosAnticipo = async () => {
            let estadosArray = estadosParam.map(estado => estado.name);
            setEstados(estadosArray);
        };

        fetchEstadosAnticipo();
    }, [estadosParam]);

    const handleEstadoChange = async (selectedEstado) => {
        const citasRef = doc(db, "citas", citaId);
        await updateDoc(citasRef, { estado: selectedEstado });
        editarcita(citaId, { estado: selectedEstado });
    };

    return (
        <div>
            <Dropdown onSelect={handleEstadoChange}>
                <Dropdown.Toggle variant="secondary" id="dropdown-button2" className="p-2 my-1 border-0" style={{ backgroundColor: "#FFF", color: "#808080" }}>
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

export default ListaSeleccionEstadoCita;