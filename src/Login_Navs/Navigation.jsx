import Nav from "./NavIcons/Nav";
import { FaAngleLeft, FaUserTie, FaUser, FaSignOutAlt, FaHamburger, FaMotorcycle, FaCashRegister, FaTools } from 'react-icons/fa';
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import icono from "../../src/img/logo_negro_corto.webp";
import "../style/Main.css";
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';
import { useAuth } from "../context/AuthContext";


const Navigation = () => {
    const [isActive, setIsActive] = useState(false);
    const [tipoUsuario, setTipoUsuario] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.setItem("rol", JSON.stringify(null));
            navigate("/");
        } catch (e) {
            console.error("handleLogout Navigation.jsx" + e.message)
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

    const toggleOpen = () => {
        setOpen(prev => !prev);
    };

    useEffect(() => {
        let rolEncriptado = localStorage.getItem("rol");
        let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
        let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);

        setTipoUsuario(rolDesencriptado);
        setIsLoading(true)

        const rutasQueAbrenSubmenu = ["/miPerfil", "/admin"];
        setOpen(rutasQueAbrenSubmenu.includes(location.pathname));
    }, [location.pathname]);

    return (
        <div className={`navigation ${isActive && "active"} text-start`}>
            <div className={`menu ${isActive && "active"}`} onClick={() => setIsActive(!isActive)}>
                <FaAngleLeft className="menu-icon" />
            </div>
            <header>
                <div className="profile">
                    <img src={icono} alt="profile" className={isActive ? "profile-img-inactive" : "profile-picture-login"} />
                </div>
            </header>
            {isLoading && (
                <>
                    <div className="sidebar-title">
                        <Link to="/productos" className="text-decoration-none link-light"><Nav title="Productos" Icon={FaHamburger} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar-title">
                        <Link to="/gestion-deliverys" className="text-decoration-none link-light"><Nav title="Deliverys" Icon={FaMotorcycle} isActive={isActive} /></Link>
                    </div>

                     <div className="sidebar-title">
                        <Link to="/pedidos-caja" className="text-decoration-none link-light"><Nav title="Caja" Icon={FaCashRegister} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar">
                        <div className={open ? "sidebar-item open" : "sidebar-item"}>
                            <div className="sidebar-title link-light" onClick={toggleOpen}>
                                <Nav title="Configuracion" Icon={FaTools} isActive={isActive} />
                            </div>
                            <div className="sidebar-content">
                                {tipoUsuario === process.env.REACT_APP_admin ? (
                                    <Link to="/admin" className="text-decoration-none link-light"><Nav title="Usuarios" Icon={FaUserTie} isActive={isActive} /></Link>) : null}
                                <Link to="/miPerfil" className="text-decoration-none link-light"><Nav title="Mi Perfil" Icon={FaUser} isActive={isActive} /></Link>
                            </div>
                        </div>
                    </div>
                    <div className="sidebar-title">
                        <Link to="/" className="text-decoration-none link-light" onClick={confirmLogout}><Nav title="Salir" Icon={FaSignOutAlt} isActive={isActive} /></Link>
                    </div>

                </>
            )}
        </div>
    );
};

export default Navigation;