import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sincronizarHoraServidor } from "../Utils/fechaComercial";
import Navigation from "./Navigation";

// Guards de permisos y layout del staff. Viven acá para que App.js quede como
// una tabla de rutas y nada más. Todos usan useAuth(), así que sólo funcionan
// dentro de <AuthContextProvider> — o sea, bajo la rama de staff.

export const RequireAuth = ({ children }) => {
    const { userData } = useAuth();
    const location = useLocation();
    return userData ? (
        <>
            <Navigation />
            {children}
        </>
    ) : (
        <Navigate to="/" state={{ from: location }} replace />
    );
};

// Las pantallas operativas leen sucursales/{userData.sucursal}/...; sin sucursal
// asignada las queries fallan. Aplica a todos los roles (el admin gestiona desde
// /admin y no necesita estas pantallas). `permitirAdmin` deja pasar al admin sin
// sucursal en pantallas que tienen su propio selector (ej: Historial de Pedidos).
export const RequireSucursal = ({ children, permitirAdmin = false }) => {
    const { userData } = useAuth();
    if (userData?.sucursal || (permitirAdmin && userData?.rol === process.env.REACT_APP_admin)) {
        return children;
    }
    return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100">
            <h4>Usuario sin sucursal asignada</h4>
            <p>Esta pantalla opera sobre una sucursal. Asigná la sucursal del usuario desde el Panel Admin.</p>
        </div>
    );
};

export const RequireAdmin = ({ children }) => {
    const { userData } = useAuth();
    if (userData?.rol === process.env.REACT_APP_admin) {
        return children;
    } else {
        return <Navigate to="/miPerfil" />;
    }
};

/* Filtrar por rol específico
 const RequireCocina = ({ children }) => {
   const { userData } = useAuth();
   Reemplaza "COCINA" por el rol exacto de variables de entorno
   if (userData?.rol === "COCINA") {
     return children;
   } else {
     Si no tiene el rol, lo redirigimos a otra pantalla
     return <Navigate to="/miPerfil" />;
   }
 };
Ejemplo: <Route path="/gestion-cocina" element={<RequireAuth><RequireCocina><Cocina /></RequireCocina></RequireAuth>} />*/

/* Filtrar por MULTIPLES roles
 const RequireRole = ({ children, allowedRoles }) => {
   const { userData } = useAuth();
   if (allowedRoles.includes(userData?.rol)) {
     return children;
   } else {
     return <Navigate to="/miPerfil" />;
   }
 };

 Ejemplo:
 <Route path="/gastos" element={
   <RequireAuth>
     <RequireRole allowedRoles={[process.env.REACT_APP_admin, process.env.REACT_APP_rolCaja]}>
       <Gastos />
     </RequireRole>
   </RequireAuth>
 } />*/

// Envuelve la rama de staff. Es el único punto donde se sincroniza la hora del
// servidor: los visitantes públicos no llegan acá y no gastan invocaciones.
export const LayoutStaff = () => {
    const { userData } = useAuth();

    useEffect(() => {
        if (userData) {
            sincronizarHoraServidor();
        }
    }, [userData]);

    return <Outlet />;
};
