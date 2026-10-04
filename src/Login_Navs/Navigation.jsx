import Nav from "./Nav";
import { FaAngleLeft, FaTimes, FaUsers, FaUser, FaSignOutAlt, FaHamburger, FaMotorcycle, FaCashRegister, FaTools, FaCartPlus, FaHistory, FaChartBar, FaChartLine, FaStore, FaClock, FaMoneyCheckAlt, FaTachometerAlt } from 'react-icons/fa';
import { useState, useEffect, createContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import logo from "../../src/img/logo_negro_corto.webp";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../Utils/Constantes";
import "../style/Main.css";

// NavLink marca con `nav-actual` el link de la pantalla en la que se está. Solo el
// cajón del celular lo pinta (Main.css): en la PC se ve igual que antes.
const claseLink = ({ isActive }) => `text-decoration-none link-light${isActive ? " nav-actual" : ""}`;

export const NavigationContext = createContext();

// Qué módulos del menú ve cada rol. Es solo cosmético: la barrera real son los
// guards de App.js. Un rol que no figure acá ve únicamente Mi Perfil y Salir.
const MODULOS_POR_ROL = {
    [process.env.REACT_APP_admin]: ["productos", "metricas", "historial", "estadisticas", "liquidacion", "clientes", "configuracion"],
    [process.env.REACT_APP_encargado]: ["caja", "cocina", "atp", "deliverys", "asistencias"],
    [process.env.REACT_APP_cajero]: ["caja"],
    [process.env.REACT_APP_cocina]: ["cocina"],
    // Los repartidores no tienen modulo: existen para la asistencia y para asignarles pedidos.
    [process.env.REACT_APP_jefeDeliverys]: ["deliverys"],
    [process.env.REACT_APP_atp]: ["atp"],
};

const Navigation = () => {
    const [isActive, setIsActive] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);
    const [openEstadisticas, setOpenEstadisticas] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, userData } = useAuth();

    const modulos = MODULOS_POR_ROL[userData?.rol] ?? [];
    const puedeVer = (modulo) => modulos.includes(modulo);

    const handleLogout = async () => {
        try {
            await logout();
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
        const rutasQueAbrenSubmenu = ["/miPerfil", "/admin"];
        setOpenConfig(rutasQueAbrenSubmenu.includes(location.pathname));

        const rutasQueAbrenSubmenuEstadisticas = ["/estadisticas", "/estadisticas-viejas"];
        setOpenEstadisticas(rutasQueAbrenSubmenuEstadisticas.includes(location.pathname));

        // Pantallas anchas: la barra arranca colapsada para no comerles ancho.
        // Va por ruta y no en el onClick del link, si no entrar por URL directa
        // o recargar la dejaba desplegada.
        const rutasConBarraColapsada = ["/estadisticas", "/estadisticas-viejas"];
        if (rutasConBarraColapsada.includes(location.pathname)) setIsActive(true);
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

            {/* Tocar un ítem cierra el cajón. Con `closest` y no mirando el target:
                el toque cae en el texto o el ícono de adentro, no en el <a>. */}
            <div className={`navigation text-white ${isActive ? "active" : ""} text-start ${mobileMenuOpen ? "mobile-open" : ""}`} onClick={(e) => {
                if (mobileMenuOpen && e.target.closest("a")) {
                    setMobileMenuOpen(false);
                }
            }}>
                <div className={`menu d-none d-md-flex ${isActive ? "active" : ""}`} onClick={() => setIsActive(!isActive)}>
                    <FaAngleLeft className="menu-icon" />
                </div>
                {/* Encabezado del cajón en el celular: logo, quién está y cerrar. En
                    el celular reemplaza al logo grande del escritorio. */}
                <div className="mobile-close d-md-none">
                    <img src={logo} alt="" className="mobile-close-logo" />
                    <div className="mobile-usuario">
                        <div className="mobile-usuario-nombre">{userData?.nombreCompleto}</div>
                        <div className="mobile-usuario-rol">{ROLES[userData?.rol]?.nombre}</div>
                    </div>
                    <button type="button" className="mobile-close-btn" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)}>
                        <FaTimes />
                    </button>
                </div>
                <header>
                    <div className="profile">
                        <img src={logo} alt="profile" className={isActive ? "img-barraNav-inactive d-none d-md-block" : "img-barraNav"} />
                    </div>
                </header>
                <>
                        {puedeVer("productos") && (
                            <div className="sidebar-title">
                                <NavLink to="/productos" className={claseLink}><Nav title="Productos" Icon={FaCartPlus} /></NavLink>
                            </div>
                        )}

                        {puedeVer("cocina") && (
                            <div className="sidebar-title">
                                <NavLink to="/gestion-cocina" className={claseLink}><Nav title="Cocina" Icon={FaHamburger} /></NavLink>
                            </div>
                        )}

                        {puedeVer("atp") && (
                            <div className="sidebar-title">
                                <NavLink to="/gestion-atp" className={claseLink}><Nav title="Atención al Público" Icon={FaStore} /></NavLink>
                            </div>
                        )}

                        {/* El alta de repartidores se mudó al PanelAdmin, así que el
                            submenú quedó con un solo ítem y pasa a ser link directo. */}
                        {puedeVer("deliverys") && (
                            <div className="sidebar-title">
                                <NavLink to="/jefe-deliverys" className={claseLink}><Nav title="Deliverys" Icon={FaMotorcycle} /></NavLink>
                            </div>
                        )}

                        {puedeVer("caja") && (
                            <div className="sidebar-title">
                                <NavLink to="/pedidos-caja" className={claseLink}><Nav title="Caja" Icon={FaCashRegister} /></NavLink>
                            </div>
                        )}

                        {/* Carga de horarios de la jornada. Solo el encargado. */}
                        {puedeVer("asistencias") && (
                            <div className="sidebar-title">
                                <NavLink to="/asistencias" className={claseLink}><Nav title="Asistencias" Icon={FaClock} /></NavLink>
                            </div>
                        )}

                        {/* Liquidación de horas por período. Solo el admin. */}
                        {puedeVer("liquidacion") && (
                            <div className="sidebar-title">
                                <NavLink to="/liquidacion" className={claseLink}><Nav title="Liquidación" Icon={FaMoneyCheckAlt} /></NavLink>
                            </div>
                        )}

                        {puedeVer("metricas") && (
                            <div className="sidebar-title">
                                <NavLink to="/metricas" className={claseLink}><Nav title="Métricas" Icon={FaTachometerAlt} /></NavLink>
                            </div>
                        )}

                        {/* Un solo destino: no tiene sentido un acordeón de un ítem. */}
                        {puedeVer("historial") && (
                            <div className="sidebar-title">
                                <NavLink to="/historial-pedidos" className={claseLink}><Nav title="Historial" Icon={FaHistory} /></NavLink>
                            </div>
                        )}

                        {puedeVer("estadisticas") && (
                            <div className="sidebar">
                                <div className={openEstadisticas ? "sidebar-item open" : "sidebar-item"}>
                                    <div className="sidebar-title link-light" onClick={() => setOpenEstadisticas(prev => !prev)}>
                                        <Nav title="Estadísticas" Icon={FaChartBar} />
                                    </div>
                                    <div className="sidebar-content">
                                        <NavLink to="/estadisticas" className={claseLink}><Nav title="Generales" Icon={FaChartLine} /></NavLink>
                                        <NavLink to="/estadisticas-viejas" className={claseLink}><Nav title="Histórico" Icon={FaHistory} /></NavLink>
                                    </div>
                                </div>
                            </div>
                        )}

                        {puedeVer("clientes") && (
                            <div className="sidebar-title">
                                <NavLink to="/clientes" className={claseLink}><Nav title="Clientes" Icon={FaUsers} /></NavLink>
                            </div>
                        )}

                        {puedeVer("configuracion") ? (
                            <div className="sidebar">
                                <div className={openConfig ? "sidebar-item open" : "sidebar-item"}>
                                    <div className="sidebar-title link-light" onClick={() => setOpenConfig(prev => !prev)}>
                                        <Nav title="Configuracion" Icon={FaTools} />
                                    </div>
                                    <div className="sidebar-content">
                                        <NavLink to="/admin" className={claseLink}><Nav title="Usuarios" Icon={FaUsers} /></NavLink>
                                        <NavLink to="/miPerfil" className={claseLink}><Nav title="Mi Perfil" Icon={FaUser} /></NavLink>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="sidebar-title">
                                <NavLink to="/miPerfil" className={claseLink}><Nav title="Mi Perfil" Icon={FaUser} /></NavLink>
                            </div>
                        )}

                        {/* En el celular va abajo de todo y separado (Main.css). */}
                        <div className="sidebar-title sidebar-salir">
                            <Link to="/" className="text-decoration-none link-light" onClick={confirmLogout}><Nav title="Salir" Icon={FaSignOutAlt} /></Link>
                        </div>

                </>
            </div>
        </NavigationContext.Provider>
    );
};

export default Navigation;