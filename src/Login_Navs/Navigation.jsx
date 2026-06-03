import Nav from "./Nav";
import { FaAngleLeft, FaUsers, FaUser, FaSignOutAlt, FaHamburger, FaMotorcycle, FaCashRegister, FaTools, FaCartPlus, FaPeopleCarry, FaHistory, FaChartBar, FaUserCog, FaStore } from 'react-icons/fa';
import { useState, useEffect, createContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logo from "../../src/img/logo_negro_corto.webp";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import "../style/Main.css";

export const NavigationContext = createContext();

const Navigation = () => {
    const [isActive, setIsActive] = useState(false);
    const [tipoUsuario, setTipoUsuario] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);
    const [openDeliverys, setOpenDeliverys] = useState(false);
    const [openEstadisticas, setOpenEstadisticas] = useState(false);
    const [openHistorial, setOpenHistorial] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

        const rutasQueAbrenSubmenuDeliverys = ["/gestion-motodeliverys", "/jefe-deliverys"];
        setOpenDeliverys(rutasQueAbrenSubmenuDeliverys.includes(location.pathname));

        const rutasQueAbrenSubmenuEstadisticas = ["/estadisticas-viejas"];
        setOpenEstadisticas(rutasQueAbrenSubmenuEstadisticas.includes(location.pathname));

        const rutasQueAbrenSubmenuHistorial = ["/historial-pedidos"];
        setOpenHistorial(rutasQueAbrenSubmenuHistorial.includes(location.pathname));
    }, [userData.rol, location.pathname]);

    return (
        <NavigationContext.Provider value={{ isActive }}>
            <nav className="mobile-topbar d-md-none w-100 position-fixed top-0 start-0 d-flex justify-content-end align-items-center p-2" style={{ zIndex: 1050, backgroundColor: 'var(--color-primario-normal)' }}>
                <div className="d-flex align-items-center me-3" onClick={() => setMobileMenuOpen(true)}>
                    <i className="p-2" style={{ cursor: 'pointer' }}><FaUserCog className='fs-3 text-white' /></i>
                </div>
            </nav>

            {mobileMenuOpen && (
                <div className="mobile-overlay d-md-none position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50" style={{ zIndex: 1040 }} onClick={() => setMobileMenuOpen(false)}></div>
            )}

            <div className={`navigation text-white ${isActive ? "active" : ""} text-start ${mobileMenuOpen ? "mobile-open" : ""}`} onClick={(e) => {
                if (mobileMenuOpen && e.target.tagName === 'A') {
                    setMobileMenuOpen(false);
                }
            }}>
                <div className={`menu d-none d-md-flex ${isActive ? "active" : ""}`} onClick={() => setIsActive(!isActive)}>
                    <FaAngleLeft className="menu-icon" />
                </div>
                <div className="d-md-none text-end p-2 pb-0 pt-3">
                    <FaAngleLeft className="fs-1 text-white" style={{ cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)} />
                </div>
                <header>
                    <div className="profile">
                        <img src={logo} alt="profile" className={isActive ? "img-barraNav-inactive d-none d-md-block" : "img-barraNav"} />
                    </div>
                </header>
                {isLoading && (
                    <>
                        <div className="sidebar-title">
                            <Link to="/productos" className="text-decoration-none link-light"><Nav title="Productos" Icon={FaCartPlus} /></Link>
                        </div>

                        <div className="sidebar-title">
                            <Link to="/gestion-cocina" className="text-decoration-none link-light"><Nav title="Cocina" Icon={FaHamburger} /></Link>
                        </div>

                        <div className="sidebar-title">
                            <Link to="/gestion-atp" className="text-decoration-none link-light"><Nav title="Atención al Público" Icon={FaStore} /></Link>
                        </div>

                        <div className="sidebar">
                            <div className={openDeliverys ? "sidebar-item open" : "sidebar-item"}>
                                <div className="sidebar-title link-light" onClick={() => setOpenDeliverys(prev => !prev)}>
                                    <Nav title="Deliverys" Icon={FaMotorcycle} />
                                </div>
                                <div className="sidebar-content">
                                    <Link to="/gestion-motodeliverys" className="text-decoration-none link-light"><Nav title="Gestion Personal" Icon={FaUsers} /></Link>
                                    <Link to="/jefe-deliverys" className="text-decoration-none link-light"><Nav title="Entregas" Icon={FaPeopleCarry} /></Link>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-title">
                            <Link to="/pedidos-caja" className="text-decoration-none link-light"><Nav title="Caja" Icon={FaCashRegister} /></Link>
                        </div>

                        <div className="sidebar">
                            <div className={openHistorial ? "sidebar-item open" : "sidebar-item"}>
                                <div className="sidebar-title link-light" onClick={() => setOpenHistorial(prev => !prev)}>
                                    <Nav title="Historial" Icon={FaHistory} />
                                </div>
                                <div className="sidebar-content">
                                    <Link to="/historial-pedidos" className="text-decoration-none link-light"><Nav title="Pedidos" Icon={FaHistory} /></Link>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar">
                            <div className={openEstadisticas ? "sidebar-item open" : "sidebar-item"}>
                                <div className="sidebar-title link-light" onClick={() => setOpenEstadisticas(prev => !prev)}>
                                    <Nav title="Estadísticas" Icon={FaChartBar} />
                                </div>
                                <div className="sidebar-content">
                                    <Link to="/estadisticas-viejas" className="text-decoration-none link-light" onClick={() => setIsActive(true)}><Nav title="Histórico" Icon={FaHistory} /></Link>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-title">
                            <Link to="/clientes" className="text-decoration-none link-light"><Nav title="Clientes" Icon={FaUsers} /></Link>
                        </div>

                        <div className="sidebar">
                            <div className={openConfig ? "sidebar-item open" : "sidebar-item"}>
                                <div className="sidebar-title link-light" onClick={() => setOpenConfig(prev => !prev)}>
                                    <Nav title="Configuracion" Icon={FaTools} />
                                </div>
                                <div className="sidebar-content">
                                    <Link to="/admin" className="text-decoration-none link-light"><Nav title="Usuarios" Icon={FaUsers} /></Link>
                                    <Link to="/miPerfil" className="text-decoration-none link-light"><Nav title="Mi Perfil" Icon={FaUser} /></Link>
                                </div>
                            </div>
                        </div>
                        <div className="sidebar-title">
                            <Link to="/" className="text-decoration-none link-light" onClick={confirmLogout}><Nav title="Salir" Icon={FaSignOutAlt} /></Link>
                        </div>

                    </>
                )}
            </div>
        </NavigationContext.Provider>
    );
};

export default Navigation;