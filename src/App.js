import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

// Login queda en el chunk principal: es la landing del staff y trae Main.css.
import Login from './Login_Navs/Login';
import { CartProvider } from './context/CartContext';
import { AuthContextProvider } from "./context/AuthContext";
import { Cargando, RequireAuth, RequireSucursal, RequireAdmin, RequireRole, LayoutStaff } from './Login_Navs/RutasProtegidas';
import { ToastContainer } from 'react-toastify';

// Cada pantalla en su propio chunk. El bundle único pesaba 3,2 MB: un cliente
// que abría /menu en el celular descargaba Caja, Cocina, Delivery, PanelAdmin y
// Estadísticas con Recharts, sin sesión y sin usarlas nunca. CRA hace el split
// solo con import(); las fronteras de Suspense están abajo y en RequireAuth.
const Productos = lazy(() => import("./components/Productos/Productos"));
const PanelAdmin = lazy(() => import("./components/Admin/PanelAdmin"));
const MiPerfil = lazy(() => import("./components/Admin/MiPerfil"));
const CrearSolicitud = lazy(() => import("./components/Solicitudes/Crearsolicitud"));
const SeleccionSucursal = lazy(() => import("./components/Solicitudes/SeleccionSucursal"));
const Menu = lazy(() => import("./components/Solicitudes/Menu.jsx"));
const Caja = lazy(() => import("./components/POS/Caja"));
const JefeDeliverys = lazy(() => import("./components/Delivery/JefeDeliverys"));
const Clientes = lazy(() => import("./components/Clientes/Clientes"));
const Cocina = lazy(() => import("./components/Cocina/Cocina"));
const HistorialPedidos = lazy(() => import("./components/Pedidos/HistorialPedidos"));
const Estadisticas = lazy(() => import("./components/Estadisticas/Historico/Estadisticas"));
const Metricas = lazy(() => import("./components/Metricas/Metricas"));
const ATP = lazy(() => import("./components/ATP/ATP"));
const Asistencias = lazy(() => import("./components/Asistencias/Asistencias"));
const LiquidacionAsistencias = lazy(() => import("./components/Asistencias/LiquidacionAsistencias"));
// Export nombrado: lazy() necesita un default.
const PaginaDetalle = lazy(() => import('./components/Solicitudes/PaginaDetalle.jsx').then(m => ({ default: m.PaginaDetalle })));

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
          {/* Esta frontera cubre las públicas y el Login. Las pantallas de staff
              tienen la suya dentro de RequireAuth, para que la navegación no
              parpadee mientras baja el chunk. */}
          <Suspense fallback={<Cargando />}>
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
                <Route path="/metricas" element={<RequireAuth><RequireAdmin><Metricas /></RequireAdmin></RequireAuth>} />
                <Route path="/liquidacion" element={<RequireAuth><RequireAdmin><LiquidacionAsistencias /></RequireAdmin></RequireAuth>} />
  
                <Route path="/pedidos-caja" element={<RequireAuth><RequireSucursal><Caja /></RequireSucursal></RequireAuth>} />
                <Route path="/jefe-deliverys" element={<RequireAuth><RequireRole roles={[process.env.REACT_APP_jefeDeliverys, process.env.REACT_APP_encargado]}><RequireSucursal><JefeDeliverys /></RequireSucursal></RequireRole></RequireAuth>} />
                <Route path="/gestion-cocina" element={<RequireAuth><RequireSucursal><Cocina /></RequireSucursal></RequireAuth>} />
                <Route path="/historial-pedidos" element={<RequireAuth><RequireAdmin><HistorialPedidos /></RequireAdmin></RequireAuth>} />
                <Route path="/clientes" element={<RequireAuth><RequireAdmin><Clientes /></RequireAdmin></RequireAuth>} />
                <Route path="/gestion-atp" element={<RequireAuth><RequireSucursal><ATP /></RequireSucursal></RequireAuth>} />
                {/* Solo el encargado carga asistencias; el admin las ve y corrige desde /liquidacion */}
                <Route path="/asistencias" element={<RequireAuth><RequireRole roles={[process.env.REACT_APP_encargado]}><RequireSucursal><Asistencias /></RequireSucursal></RequireRole></RequireAuth>} />
  
                <Route path="/miPerfil" element={<RequireAuth><MiPerfil /></RequireAuth>} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>

    </div>
  );
}

export default App;
