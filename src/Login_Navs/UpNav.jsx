import React from 'react'
import Swal from 'sweetalert2';
import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import profile from "../../src/img/profile.webp";
import { useAuth } from "../context/AuthContext";

const UpNav = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout()
            localStorage.setItem("rol", JSON.stringify(null));
            navigate("/");
        } catch (e) {
            console.error("handleLogout UpNav.jsx" + e.message)
            window.alert("Error al Cerrar Sesión, Verifique su conexión!")
        }
    };

    const confirmLogout = (e) => {
        e.preventDefault();
        Swal.fire({
            title: '¿Desea cerrar sesión?',
            showDenyButton: true,
            confirmButtonText: 'Cerrar sesión',
            confirmButtonColor: '#198754',
            denyButtonText: `Cancelar`,
        }).then((result) => {
            if (result.isConfirmed) {
                handleLogout();
            }
        });
    };

    return (
        <>
            <nav className="navbar w-100 position-absolute">
                <div className="col d-flex justify-content-end align-items-center right-navbar">

                    <p className="fw-normal mb-0" style={{ marginRight: "20px" }}>
                        Bienvenido {currentUser.displayName || ""}
                    </p>


                    <div className="notificacion">

                        <Dropdown>
                            <Dropdown.Toggle
                                variant="primary"
                                className="btn btn-secondary mx-1 btn-md"
                                id="dropdown-actions"
                                style={{ background: "none", border: "none" }}
                            >
                                <img
                                    src={currentUser.photoURL || profile}
                                    alt="profile"
                                    className="profile-picture"
                                />
                            </Dropdown.Toggle>
                            <div className="dropdown__container">
                                <Dropdown.Menu>
                                    <div className="dropdown-item">
                                        <Link
                                            to="/miPerfil"
                                            className="text-decoration-none"
                                            style={{ color: "#8D93AB" }}
                                        >
                                            <i className="icono fa-solid fa-user" style={{ marginRight: "12px" }}></i>
                                            Mi Perfil
                                        </Link>
                                    </div>
                                    <div className="dropdown-item">
                                        <Link
                                            to="/"
                                            className="text-decoration-none"
                                            style={{ color: "#8D93AB" }}
                                            onClick={confirmLogout}
                                        >
                                            <FaSignOutAlt className="icono" />
                                            Cerrar Sesión
                                        </Link>
                                    </div>

                                </Dropdown.Menu>
                            </div>
                        </Dropdown>

                    </div>


                </div>
            </nav >
        </>
    );
};

export default UpNav;