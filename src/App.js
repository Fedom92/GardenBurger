import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

import Login from './Login_Navs/Login';
import Productos from "./components/Productos/Productos";
import PanelAdmin from "./components/Admin/PanelAdmin";
import MiPerfil from "./components/Admin/MiPerfil";
import CrearSolicitud from "./components/Solicitudes/Crearsolicitud";
import SeleccionSucursal from "./components/Solicitudes/SeleccionSucursal";
import Menu from "./components/Solicitudes/Menu.jsx";
import Caja from "./components/POS/Caja";
import JefeDeliverys from "./components/Delivery/JefeDeliverys";
import PersonalDeliverys from "./components/Delivery/GestionPersonal/PersonalDeliverys";
import Clientes from "./components/Clientes/Clientes";
import Cocina from "./components/Cocina/Cocina";
import HistorialPedidos from "./components/Pedidos/HistorialPedidos";
import Estadisticas from "./components/Estadisticas/Historico/Estadisticas";
import ATP from "./components/ATP/ATP";
import { PaginaDetalle } from './components/Solicitudes/PaginaDetalle.jsx';

import { CartProvider } from './context/CartContext';
import { AuthContextProvider } from "./context/AuthContext";
import { RequireAuth, RequireSucursal, RequireAdmin, LayoutStaff } from './Login_Navs/RutasProtegidas';
import { ToastContainer } from 'react-toastify';

function App() {
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
            {/* Públicas: quedan fuera de AuthContext. No montan nada de sesión. */}
            <Route path="/crear-solicitud" element={<SeleccionSucursal />} />
            <Route path="/crear-solicitud/:sucursal" element={<CrearSolicitud />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/ver-pedido/:sucursal/:id" element={<PaginaDetalle />} />

            {/* Staff: AuthContext vive únicamente sobre esta rama */}
            <Route element={<AuthContextProvider><LayoutStaff /></AuthContextProvider>}>
              <Route path="/" element={<Login />} />
              <Route path="/admin" element={<RequireAuth><RequireAdmin><PanelAdmin /></RequireAdmin></RequireAuth>} />
              <Route path="/productos" element={<RequireAuth><RequireAdmin><Productos /></RequireAdmin></RequireAuth>} />
              <Route path="/estadisticas-viejas" element={<RequireAuth><RequireAdmin><Estadisticas /></RequireAdmin></RequireAuth>} />

              <Route path="/pedidos-caja" element={<RequireAuth><RequireSucursal><Caja /></RequireSucursal></RequireAuth>} />
              <Route path="/gestion-motodeliverys" element={<RequireAuth><RequireSucursal><PersonalDeliverys /></RequireSucursal></RequireAuth>} />
              <Route path="/jefe-deliverys" element={<RequireAuth><RequireSucursal><JefeDeliverys /></RequireSucursal></RequireAuth>} />
              <Route path="/gestion-cocina" element={<RequireAuth><RequireSucursal><Cocina /></RequireSucursal></RequireAuth>} />
              <Route path="/historial-pedidos" element={<RequireAuth><RequireSucursal permitirAdmin><HistorialPedidos /></RequireSucursal></RequireAuth>} />
              <Route path="/clientes" element={<RequireAuth><RequireAdmin><Clientes /></RequireAdmin></RequireAuth>} />
              <Route path="/gestion-atp" element={<RequireAuth><RequireSucursal><ATP /></RequireSucursal></RequireAuth>} />

              <Route path="/miPerfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>

    </div>
  );
}

export default App;
