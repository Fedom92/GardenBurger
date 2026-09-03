import Nav from "./Nav";
import { FaAngleLeft, FaUsers, FaUser, FaSignOutAlt, FaHamburger, FaMotorcycle, FaCashRegister, FaTools, FaCartPlus, FaPeopleCarry, FaHistory, FaChartBar, FaStore } from 'react-icons/fa';
import { useState, useEffect, createContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logo from "../../src/img/logo_negro_corto.webp";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import InsertarRegistros from "../Utils/InsertarRegistros";
import "../style/Main.css";

export const NavigationContext = createContext();

// Qué módulos del menú ve cada rol. Es solo cosmético: la barrera real son los
// guards de App.js. Un rol que no figure acá ve únicamente Mi Perfil y Salir.
const MODULOS_POR_ROL = {
    [process.env.REACT_APP_admin]: ["productos", "historial", "estadisticas", "clientes", "configuracion"],
    // "pruebas" es la herramienta de dev que inserta pedidos de ejemplo. Solo el
    // encargado la ve; escribe pedidos reales y mueve el arqueo del día.
    [process.env.REACT_APP_encargado]: ["caja", "cocina", "atp", "deliverys", "historial", "pruebas"],
    [process.env.REACT_APP_cajero]: ["caja", "historial"],
    [process.env.REACT_APP_cocina]: ["cocina"],
    [process.env.REACT_APP_delivery]: ["deliverys"],
    [process.env.REACT_APP_atp]: ["atp"],
};

const Navigation = () => {
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);
    const [openDeliverys, setOpenDeliverys] = useState(false);
    const [openEstadisticas, setOpenEstadisticas] = useState(false);
    const [openHistorial, setOpenHistorial] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, userData } = useAuth();

    const modulos = MODULOS_POR_ROL[userData?.rol] ?? [];
    const puedeVer = (modulo) => modulos.includes(modulo);

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
        setIsLoading(true);

        const rutasQueAbrenSubmenu = ["/miPerfil", "/admin"];
        setOpenConfig(rutasQueAbrenSubmenu.includes(location.pathname));

        const rutasQueAbrenSubmenuDeliverys = ["/gestion-motodeliverys", "/jefe-deliverys"];
        setOpenDeliverys(rutasQueAbrenSubmenuDeliverys.includes(location.pathname));

        const rutasQueAbrenSubmenuEstadisticas = ["/estadisticas-viejas"];
        setOpenEstadisticas(rutasQueAbrenSubmenuEstadisticas.includes(location.pathname));

        // Pantallas anchas: la barra arranca colapsada para no comerles ancho.
        // Va por ruta y no en el onClick del link, si no entrar por URL directa
        // o recargar la dejaba desplegada.
        const rutasConBarraColapsada = ["/estadisticas-viejas"];
        if (rutasConBarraColapsada.includes(location.pathname)) setIsActive(true);

        const rutasQueAbrenSubmenuHistorial = ["/historial-pedidos"];
        setOpenHistorial(rutasQueAbrenSubmenuHistorial.includes(location.pathname));
    }, [userData.rol, location.pathname]);

    // `isActive` es el colapso de la barra de escritorio, donde Nav dibuja sólo
    // el icono. Con el cajón móvil abierto siempre tienen que ir los títulos.
    const navContext = { isActive: isActive && !mobileMenuOpen };

    return (
        <NavigationContext.Provider value={navContext}>
            {/* Con el cajón cerrado esto es lo único visible en celular, y es lo que
                lo abre. Mismo lenguaje que la barra colapsada de escritorio: logo y
                flecha flotando arriba a la izquierda, sin ocupar una franja fija. */}
            {!mobileMenuOpen && (
                <button
                    type="button"
                    className="nav-handle d-md-none"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Abrir menú"
                >
                    <img src={logo} alt="" className="nav-handle-logo" />
                    <FaAngleLeft className="nav-handle-icon" />
                </button>
            )}

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
                <div className="mobile-close d-md-none text-end p-2 pb-0 pt-3">
                    <FaAngleLeft className="fs-1 text-white" style={{ cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)} />
                </div>
                <header>
                    <div className="profile">
                        <img src={logo} alt="profile" className={isActive ? "img-barraNav-inactive d-none d-md-block" : "img-barraNav"} />
                    </div>
                </header>
                {isLoading && (
                    <>
                        {puedeVer("productos") && (
                            <div className="sidebar-title">
                                <Link to="/productos" className="text-decoration-none link-light"><Nav title="Productos" Icon={FaCartPlus} /></Link>
                            </div>
                        )}

                        {puedeVer("cocina") && (
                            <div className="sidebar-title">
                                <Link to="/gestion-cocina" className="text-decoration-none link-light"><Nav title="Cocina" Icon={FaHamburger} /></Link>
                            </div>
                        )}

                        {puedeVer("atp") && (
                            <div className="sidebar-title">
                                <Link to="/gestion-atp" className="text-decoration-none link-light"><Nav title="Atención al Público" Icon={FaStore} /></Link>
                            </div>
                        )}

                        {puedeVer("deliverys") && (
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
                        )}

                        {puedeVer("caja") && (
                            <div className="sidebar-title">
                                <Link to="/pedidos-caja" className="text-decoration-none link-light"><Nav title="Caja" Icon={FaCashRegister} /></Link>
                            </div>
                        )}

                        {puedeVer("historial") && (
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
                        )}

                        {puedeVer("estadisticas") && (
                            <div className="sidebar">
                                <div className={openEstadisticas ? "sidebar-item open" : "sidebar-item"}>
                                    <div className="sidebar-title link-light" onClick={() => setOpenEstadisticas(prev => !prev)}>
                                        <Nav title="Estadísticas" Icon={FaChartBar} />
                                    </div>
                                    <div className="sidebar-content">
                                        <Link to="/estadisticas-viejas" className="text-decoration-none link-light"><Nav title="Histórico" Icon={FaHistory} /></Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {puedeVer("clientes") && (
                            <div className="sidebar-title">
                                <Link to="/clientes" className="text-decoration-none link-light"><Nav title="Clientes" Icon={FaUsers} /></Link>
                            </div>
                        )}

                        {puedeVer("configuracion") ? (
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
                        ) : (
                            <div className="sidebar-title">
                                <Link to="/miPerfil" className="text-decoration-none link-light"><Nav title="Mi Perfil" Icon={FaUser} /></Link>
                            </div>
                        )}
                        {/*TODO: ELIMINAR PRUEBAS CUANDO SE IMPLEMENTE. RECORDAR ELIMINARLO DE TODOS LADOS*/}    
                        {puedeVer("pruebas") && (
                            <div className="sidebar-title px-3 pb-2">
                                <InsertarRegistros />
                            </div>
                        )}

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