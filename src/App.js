import "./App.css";
import React from "react";
import ShowPacientes from "./components/Pacientes/ShowPacientes";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Agenda from "./components/Agenda/Agenda";
import Tarifario from "./components/Tarifario/Tarifario";
import Tratamientos from "./components/Tratamientos/Tratamientos";
import PanelAdmin from "./components/Admin/PanelAdmin";
import MiPerfil from "./components/Admin/MiPerfil";
import History from "./components/HistoriaClinica/History.jsx";
import Ingresos from "./components/Ingresos/Ingresos";
import Gastos from "./components/Gastos/Gastos";
import Materiales from "./components/Gastos/Parametros/Materiales";
import Proveedores from "./components/Gastos/Parametros/Proveedores";
import ControlEvolucion from "./components/ControlEvolucion/ControlEvolucion";
import Dashboard from "./components/Dashboard/Dashboard";
import Navigation from "./components/Navigation"
import UpNav from "./components/UpNav"
import CryptoJS from 'crypto-js';
import { useAuth } from "./context/AuthContext";

function App() {
  const { currentUser } = useAuth()

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

  function RequireAdmin({ children }) {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);

    if (rolDesencriptado === process.env.REACT_APP_rolAd) {
      return children;
    } else if (rolDesencriptado === process.env.REACT_APP_rolRecepcionis) {
      return <Navigate to="/agenda" />;
    } else {
      return <Navigate to="/pacientes" />;
    }
  }

  return (
    <div className="App mainpage">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route index path="/admin" element={<RequireAuth><RequireAdmin><PanelAdmin /></RequireAdmin></RequireAuth>} />
          <Route index path="/miPerfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
          <Route index path="/pacientes" element={<RequireAuth><ShowPacientes /></RequireAuth>} />
          <Route path="/agenda" element={<RequireAuth><Agenda current_user={currentUser} /></RequireAuth>} />
          <Route path="/tarifario" element={<RequireAuth><RequireAdmin><Tarifario /></RequireAdmin></RequireAuth>} />
          <Route path="/tratamientos" element={<RequireAuth><Tratamientos current_user={currentUser} /></RequireAuth>} />
          <Route path="/historias" element={<RequireAuth><History current_user={currentUser} /></RequireAuth>} />
          <Route path="/controlEvoluciones" element={<RequireAuth><ControlEvolucion current_user={currentUser} /></RequireAuth>} />
          <Route path="/historias/:id" element={<RequireAuth><History current_user={currentUser} /></RequireAuth>} />
          <Route path="/ventas" element={<RequireAuth><RequireAdmin><Ingresos /></RequireAdmin></RequireAuth>} />
          <Route path="/compras" element={<RequireAuth><Gastos /></RequireAuth>} />
          <Route path="/materiales" element={<RequireAuth><Materiales /></RequireAuth>} />
          <Route path="/proveedores" element={<RequireAuth><Proveedores /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><RequireAdmin><Dashboard /></RequireAdmin></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
