import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

import Login from './Login_Navs/Login';
import Productos from "./components/Productos/Productos";
import PanelAdmin from "./components/Admin/PanelAdmin";
import MiPerfil from "./components/Admin/MiPerfil";
import Navigation from "./Login_Navs/Navigation"
import UpNav from "./Login_Navs/UpNav"
import CrearSolicitud from "./components/Solicitudes/Crearsolicitud";
import Menu from "./components/Solicitudes/Menu.jsx";
import Caja from "./components/POS/Caja";
import Deliverys from "./components/Delivery/Deliverys";
import PersonalDeliverys from "./components/Delivery/GestionPersonal/PersonalDeliverys";
import Clientes from "./components/Clientes/Clientes";
import Cocina from "./components/Cocina/Cocina";
import HistorialPedidos from "./components/Pedidos/HistorialPedidos";

import { CartProvider } from './context/CartContext';
import { ToastContainer } from 'react-toastify';
import { useAuth } from "./context/AuthContext";
import { PaginaDetalle } from './components/Solicitudes/PaginaDetalle.jsx';


function App() {
  const { userData } = useAuth();

  const RequireAuth = ({ children }) => {
    return userData ? (
      <>
        <Navigation />
        <UpNav />
        {children}
      </>
    ) : (
      <Navigate to="/" />
    );
  };

  const RequireAdmin = ({ children }) => {
    if (userData?.rol === process.env.REACT_APP_admin) {
      return children;
    } else {
      return <Navigate to="/miPerfil" />;
    }
  };

  /* Filtrar por rol específico
   const RequireCocina = ({ children }) => {
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

  return (
    <div className="App mainpage">
      <CartProvider>
        <BrowserRouter>
          <ToastContainer
            autoClose={3000}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
          />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<RequireAuth><RequireAdmin><PanelAdmin /></RequireAdmin></RequireAuth>} />
            <Route path="/productos" element={<RequireAuth><RequireAdmin><Productos /></RequireAdmin></RequireAuth>} />
            <Route path="/pedidos-caja" element={<RequireAuth><RequireAdmin><Caja /></RequireAdmin></RequireAuth>} />
            <Route path="/gestion-deliverys" element={<RequireAuth><RequireAdmin><PersonalDeliverys /></RequireAdmin></RequireAuth>} />
            <Route path="/delivery-pedidos" element={<RequireAuth><RequireAdmin><Deliverys /></RequireAdmin></RequireAuth>} />
            <Route path="/gestion-cocina" element={<RequireAuth><RequireAdmin><Cocina /></RequireAdmin></RequireAuth>} />
            <Route path="/historial-pedidos" element={<RequireAuth><RequireAdmin><HistorialPedidos /></RequireAdmin></RequireAuth>} />
            <Route path="/clientes" element={<RequireAuth><RequireAdmin><Clientes /></RequireAdmin></RequireAuth>} />
            <Route path="/miPerfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
            <Route path="/crear-solicitud" element={<CrearSolicitud />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/ver-pedido/:id" element={<PaginaDetalle />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>

    </div>
  );
}

export default App;