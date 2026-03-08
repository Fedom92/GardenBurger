import Nav from "./NavIcons/Nav";
import { FaAngleLeft, FaUsers, FaUser, FaSignOutAlt, FaHamburger, FaMotorcycle, FaCashRegister, FaTools, FaCartPlus, FaPeopleCarry, FaHistory, FaChartBar } from 'react-icons/fa';
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import icono from "../../src/img/logo_negro_corto.webp";
import "../style/Main.css";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";


const Navigation = () => {
    const [isActive, setIsActive] = useState(false);
    const [tipoUsuario, setTipoUsuario] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);
    const [openDeliverys, setOpenDeliverys] = useState(false);
    const [openEstadisticas, setOpenEstadisticas] = useState(false);
    const [openHistorial, setOpenHistorial] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, userData } = useAuth();

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

    useEffect(() => {
        setTipoUsuario(userData?.rol || "");
        setIsLoading(true);

        const rutasQueAbrenSubmenu = ["/miPerfil", "/admin"];
        setOpenConfig(rutasQueAbrenSubmenu.includes(location.pathname));

        const rutasQueAbrenSubmenuDeliverys = ["/gestion-deliverys", "/delivery-pedidos"];
        setOpenDeliverys(rutasQueAbrenSubmenuDeliverys.includes(location.pathname));

        const rutasQueAbrenSubmenuEstadisticas = ["/estadisticas-historicas"];
        setOpenEstadisticas(rutasQueAbrenSubmenuEstadisticas.includes(location.pathname));

        const rutasQueAbrenSubmenuHistorial = ["/historial-pedidos"];
        setOpenHistorial(rutasQueAbrenSubmenuHistorial.includes(location.pathname));
    }, [userData.rol, location.pathname]);

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
                        <Link to="/productos" className="text-decoration-none link-light"><Nav title="Productos" Icon={FaCartPlus} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar-title">
                        <Link to="/gestion-cocina" className="text-decoration-none link-light"><Nav title="Cocina" Icon={FaHamburger} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar">
                        <div className={openDeliverys ? "sidebar-item open" : "sidebar-item"}>
                            <div className="sidebar-title link-light" onClick={() => setOpenDeliverys(prev => !prev)}>
                                <Nav title="Deliverys" Icon={FaMotorcycle} isActive={isActive} />
                            </div>
                            <div className="sidebar-content">
                                <Link to="/gestion-deliverys" className="text-decoration-none link-light"><Nav title="Gestion Personal" Icon={FaUsers} isActive={isActive} /></Link>
                                <Link to="/delivery-pedidos" className="text-decoration-none link-light"><Nav title="Entregas" Icon={FaPeopleCarry} isActive={isActive} /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-title">
                        <Link to="/pedidos-caja" className="text-decoration-none link-light"><Nav title="Caja" Icon={FaCashRegister} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar">
                        <div className={openHistorial ? "sidebar-item open" : "sidebar-item"}>
                            <div className="sidebar-title link-light" onClick={() => setOpenHistorial(prev => !prev)}>
                                <Nav title="Historial" Icon={FaHistory} isActive={isActive} />
                            </div>
                            <div className="sidebar-content">
                                <Link to="/historial-pedidos" className="text-decoration-none link-light"><Nav title="Pedidos" Icon={FaHistory} isActive={isActive} /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar">
                        <div className={openEstadisticas ? "sidebar-item open" : "sidebar-item"}>
                            <div className="sidebar-title link-light" onClick={() => setOpenEstadisticas(prev => !prev)}>
                                <Nav title="Estadísticas" Icon={FaChartBar} isActive={isActive} />
                            </div>
                            <div className="sidebar-content">
                                <Link to="/estadisticas-historicas" className="text-decoration-none link-light"><Nav title="Histórico" Icon={FaHistory} isActive={isActive} /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-title">
                        <Link to="/clientes" className="text-decoration-none link-light"><Nav title="Clientes" Icon={FaUsers} isActive={isActive} /></Link>
                    </div>

                    <div className="sidebar">
                        <div className={openConfig ? "sidebar-item open" : "sidebar-item"}>
                            <div className="sidebar-title link-light" onClick={() => setOpenConfig(prev => !prev)}>
                                <Nav title="Configuracion" Icon={FaTools} isActive={isActive} />
                            </div>
                            <div className="sidebar-content">
                                <Link to="/admin" className="text-decoration-none link-light"><Nav title="Usuarios" Icon={FaUsers} isActive={isActive} /></Link>
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