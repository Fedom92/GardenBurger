import React, { useState } from "react";
import { auth, verifCredenciales, reautenticar, actualizarClave, deslogear } from "../../firebaseConfig/firebase";
import { Modal, } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";


const EditClave = (props) => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState('');
    const navigate = useNavigate()
    const [mostrarPrimerModal, setMostrarPrimerModal] = useState(true);
    const [mostrarSegundoModal, setMostrarSegundoModal] = useState(false);
    const [revalidUsuario, setRevalidUsuario] = useState("");
    const [revalidPass, setRevalidPass] = useState("");

    const validateFields = (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Las nuevas contraseñas no coinciden!")
            setTimeout(clearError, 2000);
            return;
        } else {
            if (newPassword.length < 6) {
                setError("El password debe tener al menos 6 caracteres");
                setTimeout(clearError, 2000);
                return;
            } else {
                setMostrarPrimerModal(false)
                setMostrarSegundoModal(true)
            }
        }
    }

    const update = async (e) => {
        e.preventDefault();

        const credentials = verifCredenciales(revalidUsuario, revalidPass);

        await reautenticar(auth.currentUser, credentials)
            .then(({ user }) => {
                actualizarClave(user, newPassword).then(() => {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: 'Modificación de clave exitosa.',
                        icon: 'success',
                        confirmButtonColor: '#00C5C1',
                    }).then(() => {
                        props.onHide();
                        deslogear(auth);
                        localStorage.setItem("user", JSON.stringify(null));
                        navigate("/")
                    });
                });
            })
            .catch(() => {
                setNewPassword("");
                setConfirmPassword("");
                setError("");
                setRevalidPass("");
                setRevalidUsuario("");
                setMostrarSegundoModal(false)
                props.onHide();
                Swal.fire({
                    title: '¡Error!',
                    text: 'Autenticación Incorrecta.',
                    icon: 'error',
                    confirmButtonColor: '#d33',
                })
                setMostrarPrimerModal(true)
            });
    };

    const clearError = () => {
        setError("");
    };

    return (
        <>
            {mostrarPrimerModal && (
                <Modal
                    {...props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                >
                    <Modal.Header closeButton onClick={() => {
                        props.onHide();
                        setNewPassword("");
                        setConfirmPassword("");
                        setError("")
                    }}>
                        <Modal.Title id="contained-modal-title-vcenter">
                            <h1>Cambiar Contraseña</h1>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="container">
                            <div className="col">
                                <form>
                                    <div className="row">
                                        <div className="col mb-6">
                                            <label className="form-label">Nueva Contraseña</label>
                                            <input
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                type="password"
                                                className="form-control"
                                                minLength={6}
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col mb-6">
                                            <label className="form-label">Reingrese Nueva Contraseña</label>
                                            <input
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                type="password"
                                                className="form-control"
                                                minLength={6}
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div style={{ display: "flex" }}>
                                            <button
                                                type="submit"
                                                onClick={validateFields}
                                                className="btn button-main"
                                                style={{ margin: "4px" }}
                                            >
                                                Guardar Nueva Clave
                                            </button>
                                            {error && (
                                                <div className="alert alert-danger" role="alert" style={{ margin: '10px' }}>
                                                    {error}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Modal.Body>
                </Modal>)}


            {mostrarSegundoModal && (
                <Modal onHide={props.onHide} {...props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                >
                    <Modal.Header>
                        <Modal.Title>Valide nuevamente su Usuario para continuar</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="container">
                            <div className="col">
                                <form>
                                    <div className="row">
                                        <div className="col mb-6">
                                            <label className="form-label">Ingrese su usuario</label>
                                            <input
                                                onChange={(e) => setRevalidUsuario(e.target.value)}
                                                type="email"
                                                className="form-control"
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col mb-6">
                                            <label className="form-label">Ingrese su Contraseña</label>
                                            <input
                                                onChange={(e) => setRevalidPass(e.target.value)}
                                                type="password"
                                                className="form-control"
                                                minLength={6}
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <div style={{ display: "flex" }}>
                            <button
                                type="submit"
                                onClick={(e) => { update(e); props.onHide() }}
                                className="btn button-main"
                            >
                                Continuar
                            </button>
                        </div>
                    </Modal.Footer>
                </Modal>)}
        </>
    );
}
export default EditClave;