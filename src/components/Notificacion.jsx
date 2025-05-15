import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";
import CreateCita from "./Agenda/CreateCita";
import { FaBell } from 'react-icons/fa';
import { Dropdown, Modal, Button } from "react-bootstrap";
import Calendar from "react-calendar";
import Swal from "sweetalert2";
import moment from 'moment';

const Notificacion = () => {
    const [notificaciones, setNotificaciones] = useState({
        tratamientos: [],
        clients: []
    });

    const [modalShowCita, setModalShowCita] = useState(false);
    const [paciente, setPaciente] = useState("");
    const [mostrarModal, setMostrarModal] = useState(false);
    const [fechaPostergada, setFechaPostergada] = useState("");
    const [idTratamiento, setIdTratamiento] = useState("");
    const hoy = moment().format("MM-DD");

    useEffect(() => {
        const fetchTratamientos = async () => {
            const tarifasTratamientosParaNotificar = ['Limpieza dental'];
            const inicioSemana = moment().startOf('week').format("MM-DD");
            const finSemana = moment().endOf('week').format("MM-DD");
            const haceSeisMeses = moment().subtract(6, 'months').format("YYYY-MM-DD");

            try {
                const tratamientosQuery = query(
                    collection(db, 'tratamientos'),
                    where('tarifasTratamientos', 'in', tarifasTratamientosParaNotificar),
                    where('fecha', '<=', haceSeisMeses),
                    where('fechaNotificacion', '==', ''),
                    where('notificacionLeida', '==', false)
                );

                const pospuestosQuery = query(
                    collection(db, 'tratamientos'),
                    where('tarifasTratamientos', 'in', tarifasTratamientosParaNotificar),
                    where('fechaNotificacion', '==', moment().format("YYYY-MM-DD")),
                    where('notificacionLeida', '==', false)
                );

                const clientsQuery = query(
                    collection(db, 'clients'),
                    where('mesDiaFechaNacimiento', '>=', inicioSemana),
                    where('mesDiaFechaNacimiento', '<=', finSemana)
                );

                const [tratamientosSnapshot, pospuestosSnapshot] = await Promise.all([
                    getDocs(tratamientosQuery),
                    getDocs(pospuestosQuery)
                ]);

                const tratamientosDocs = tratamientosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const pospuestosDocs = pospuestosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const tratamientos = [
                    ...tratamientosDocs,
                    ...pospuestosDocs.filter(t2 => !tratamientosDocs.some(t1 => t1.id === t2.id))
                ];

                const clientesSnapshot = await getDocs(clientsQuery);
                const clients = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setNotificaciones({
                    tratamientos,
                    clients
                });
            } catch (error) {
                console.error("Error fetching Notificaciones:", error);
            }
        };

        fetchTratamientos();
    }, []);

    const buscarPaciente = async (idPaciente, id) => {
        try {
            const pacienteDoc = doc(db, "clients", idPaciente);
            const docSnapshot = await getDoc(pacienteDoc);

            if (docSnapshot.exists()) {
                setPaciente({
                    ...docSnapshot.data(),
                    id: docSnapshot.id
                });
                setIdTratamiento(id);
                setModalShowCita(true);
            } else {
                Swal.fire({
                    title: '¡Alerta!',
                    text: 'Al parecer este paciente ya no se encuentra en tu BD.',
                    icon: 'warning',
                    confirmButtonColor: '#00C5C1'
                });
                setPaciente("");
                setIdTratamiento("");
                setModalShowCita(false);
            }
        } catch (error) {
            console.error("Error fetching patient: ", error);
            Swal.fire({
                title: 'Error!',
                text: 'Hubo un error buscando al paciente.',
                icon: 'error',
                confirmButtonColor: '#00C5C1'
            });
            setPaciente("");
            setIdTratamiento("");
            setModalShowCita(false);
        }
    };

    const confirmarLectura = (id) => {
        Swal.fire({
            title: '¿Esta seguro de quitar esta notificación?',
            text: "No podrá revertir la accion",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#00C5C1',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si',
            cancelButtonText: 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                marcarLeidaNotificacion(id)
                Swal.fire({
                    title: '¡Eliminada!',
                    text: 'La Notificación ha sido marcada como leída.',
                    icon: 'success',
                    confirmButtonColor: '#00C5C1'
                });
            }
        })
    }

    const marcarLeidaNotificacion = async (id) => {
        const tratamientoDoc = doc(db, "tratamientos", id);
        await updateDoc(tratamientoDoc, { notificacionLeida: true });
        setNotificaciones(prevState => ({
            ...prevState,
            tratamientos: prevState.tratamientos.filter(tratamiento => tratamiento.id !== id)
        }));
    };

    const handleModal = (e, id) => {
        e.preventDefault();
        setIdTratamiento(id);
        setMostrarModal(true);
    };

    const handleCloseModal = () => {
        setMostrarModal(false);
        setFechaPostergada("");
        setIdTratamiento("");
    };

    const confirmarPosponer = async () => {
        let fechaFormat = moment(fechaPostergada).format("DD/MM/YYYY");
        Swal.fire({
            title: `¿Postergará al ${fechaFormat} la notificación?`,
            text: "No podrá revertir la accion",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#00C5C1',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si',
            cancelButtonText: 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                posponerNotificacion(idTratamiento);
                handleCloseModal();
                Swal.fire({
                    title: '¡Pospuesta!',
                    text: 'La Notificación ha sido postergada con éxito.',
                    icon: 'success',
                    confirmButtonColor: '#00C5C1'
                });
            }
        })
    }

    const posponerNotificacion = async (id) => {
        const tratamientoDoc = doc(db, "tratamientos", id);
        await updateDoc(tratamientoDoc, { fechaNotificacion: fechaPostergada });
        setNotificaciones(prevState => ({
            ...prevState,
            tratamientos: prevState.tratamientos.filter(tratamiento => tratamiento.id !== id)
        }));
    };

    return (
        <>
            <Dropdown>
                <Dropdown.Toggle
                    variant="primary"
                    className="btn btn-secondary btn-md p-0 m-0"
                    id="dropdown-actions"
                    style={{ background: "none", border: "none" }}
                >
                    <div className="notificaciones_tratamientos">
                        <FaBell className="icono m-0" />
                        <span className="badge badge_tratamientos rounded-pill bg-danger m-0">{notificaciones.tratamientos.length || ""}</span>
                    </div>
                </Dropdown.Toggle>
                <div className="dropdown__container">
                    <Dropdown.Menu id="menu-notificaciones-scrollbar">
                        {notificaciones.tratamientos.length > 0 && notificaciones.tratamientos.map(tratamiento => (
                            <Dropdown.Item
                                id="lista-notificaciones"
                                className='cursor-none'
                                key={tratamiento.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <h3
                                    id="notificacion-paciente"
                                    onClick={() => buscarPaciente(tratamiento.idPaciente, tratamiento.id)}
                                >
                                    {tratamiento.apellidoConNombre}
                                </h3>
                                <div className="d-flex justify-content-between">
                                    <p className="m-0" style={{ fontSize: "12px" }}>{moment(tratamiento.fecha).format("DD/MM/YYYY")} - Cod. {tratamiento.codigo}</p>
                                    <div className='justify-content-end ' style={{ marginTop: "-2px" }}>
                                        <i className="fa-solid fa-clock-rotate-left icono-notificacion"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleModal(e, tratamiento.id);
                                            }}
                                        ></i>
                                        <i className="fa-solid fa-trash-can mx-2 icono-notificacion"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmarLectura(tratamiento.id);
                                            }}
                                        ></i>
                                    </div>
                                </div>
                            </Dropdown.Item>
                        ))}

                        {notificaciones.clients.length > 0 && (
                            <>
                                <p
                                    className='p-0 w-50 align-center justify-content-center m-auto mt-2 mb-2'
                                    style={{ borderTop: 'black 1px solid' }}
                                ></p>
                                <p className='text-start mx-2 m-0' style={{ fontSize: "13px" }}>
                                    Cumpleaños Semanal:
                                </p>

                                {notificaciones.clients.map(paciente => {
                                    const isToday = paciente.mesDiaFechaNacimiento === hoy;
                                    return (
                                        <Dropdown.Item
                                            id="lista-notificaciones"
                                            className='cursor-none'
                                            key={paciente.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <h3 className="m-0" id="notificacion-cliente">{paciente.apellidoConNombre}</h3>
                                            <p
                                                className={`m-0 ${isToday ? 'cliente-cumple' : ''}`}
                                                id="notificacion-cliente">
                                                {moment(paciente.mesDiaFechaNacimiento, 'MM-DD').format('DD/MM')}
                                            </p>
                                        </Dropdown.Item>
                                    );
                                })}
                            </>
                        )}
                    </Dropdown.Menu>
                </div>
            </Dropdown>

            {modalShowCita && <CreateCita
                show={modalShowCita}
                paciente={paciente}
                notificacion_id={idTratamiento}
                marcarleidanotificacion={marcarLeidaNotificacion}
                onHide={() => {
                    setModalShowCita(false);
                    setPaciente("");
                    setIdTratamiento("");
                }}
            />}

            {mostrarModal && <Modal
                size="md"
                show={mostrarModal}
                onHide={handleCloseModal}
            >
                <Modal.Header closeButton onClick={handleCloseModal}>
                    <Modal.Title>Seleccione una fecha de postergación:</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}>
                    <Calendar
                        defaultValue={moment().format("YYYY-MM-DD")}
                        onChange={(date) => {
                            const formattedDate =
                                moment(date).format("YYYY-MM-DD");
                            setFechaPostergada(formattedDate);
                        }}
                        value={fechaPostergada}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={confirmarPosponer}>
                        Aceptar
                    </Button>
                </Modal.Footer>
            </Modal>}
        </>
    );
};

export default Notificacion;