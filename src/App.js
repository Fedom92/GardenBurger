import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import './App.css';
import Login from './Login_Navs/Login';
import Productos from "./components/Productos/Productos";
import PanelAdmin from "./components/Admin/PanelAdmin";
import MiPerfil from "./components/Admin/MiPerfil";
import Navigation from "./Login_Navs/Navigation"
import UpNav from "./Login_Navs/UpNav"
import CrearSolicitud from "./components/Solicitudes/Crearsolicitud";
import Menu from "./components/Solicitudes/Menu.jsx";
import CryptoJS from 'crypto-js';
import Caja from "./components/POS/Caja";
import { CartProvider } from './context/CartContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Deliverys from "./components/Delivery/Deliverys";
import PersonalDeliverys from "./components/Delivery/PersonalDeliverys";
import Clientes from "./components/Clientes/Clientes";
import Cocina from "./components/Cocina/Cocina";
import HistorialPedidos from "./components/Pedidos/HistorialPedidos";
import { useAuth } from "./context/AuthContext";
import { PaginaDetalle } from './components/Solicitudes/PaginaDetalle.jsx';

function App() {
  const { currentUser } = useAuth()
  const [, setTipoUsuario] = useState("");

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    if (rolEncriptado) {
      let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
      let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
      setTipoUsuario(rolDesencriptado);
    }
  }, []);


  const RequireAuth = ({ children }) => {
    return currentUser ? (
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
    let rolEncriptado = localStorage.getItem('rol');
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);

    if (currentUser && rolDesencriptado === process.env.REACT_APP_admin) {
      return children;
    } else {
      return <Navigate to="/miPerfil" />;
    }
  };

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

            {/*Para limitar Links por Rol
          tipoUsuario !== process.env.REACT_APP_rolStaff && tipoUsuario !== process.env.REACT_APP_rolEjecutor && tipoUsuario !== process.env.REACT_APP_rolOperaciones ? (
            <>
              <Route path="/gastos" element={<RequireAuth><Gastos /></RequireAuth>} />
            </>
          ) : (null)*/}
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </CartProvider>

    </div>
  );
}

export default App;