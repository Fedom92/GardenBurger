import React from 'react'
import Swal from 'sweetalert2';
import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCog, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from "../context/AuthContext";

const UpNav = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

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
                    <div className="notificacion">
                        <Dropdown>
                            <Dropdown.Toggle
                                variant="primary"
                                className="border-2 border-white bg-black rounded-3 p-0"
                                id="dropdown-actions"
                            >
                                <i className="p-2">
                                    <FaUserCog className='fs-3'/>
                                </i>
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