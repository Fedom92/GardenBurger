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
import CryptoJS from 'crypto-js';
import Caja from "./components/POS/Caja";
import Delivery from "./components/Delivery/Delivery";
import Cocina from "./components/Cocina/Cocina";
import { useAuth } from "./context/AuthContext";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={<RequireAuth><RequireAdmin><PanelAdmin /></RequireAdmin></RequireAuth>} />
          <Route path="/productos" element={<RequireAuth><RequireAdmin><Productos /></RequireAdmin></RequireAuth>} />
          <Route path="/pedidos-caja" element={<RequireAuth><RequireAdmin><Caja /></RequireAdmin></RequireAuth>} />
          <Route path="/gestion-deliverys" element={<RequireAuth><RequireAdmin><Delivery /></RequireAdmin></RequireAuth>} />
          <Route path="/gestion-cocina" element={<RequireAuth><RequireAdmin><Cocina /></RequireAdmin></RequireAuth>} />
          <Route path="/miPerfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
          <Route path="/crear-solicitud" element={<CrearSolicitud />} />

          {/*Para limitar Links por Rol
          tipoUsuario !== process.env.REACT_APP_rolStaff && tipoUsuario !== process.env.REACT_APP_rolEjecutor && tipoUsuario !== process.env.REACT_APP_rolOperaciones ? (
            <>
              <Route path="/gastos" element={<RequireAuth><Gastos /></RequireAuth>} />
            </>
          ) : (null)*/}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;