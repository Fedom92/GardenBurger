import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { NOMBRES_ROL } from "../../Utils/Constantes";
import EditClave from "./EditClave";
import "../../style/Main.css"
import moment from 'moment';

// Perfil de solo lectura. El empleado no edita sus propios datos: si algo está
// mal se lo avisa al administrador, que lo corrige desde el PanelAdmin. Lo
// único que puede cambiar por su cuenta es la contraseña, y eso va por Auth,
// no por Firestore.
//
// Los datos salen de useAuth(): AuthContext ya leyó el documento al loguear, así
// que esta pantalla no cuesta ninguna lectura.
const Campo = ({ label, valor, ancho = "col-md-6" }) => (
  <div className={`${ancho} mb-3`}>
    <label className="small mb-1 text-body-secondary">{label}</label>
    <div className="form-control bg-body-secondary text-center">
      {valor || "—"}
    </div>
  </div>
);

const MiPerfil = () => {
  const { userData } = useAuth();
  const [mostrarPerfil, setMostrarPerfil] = useState(true);
  const [modalShowEditClave, setModalShowEditClave] = useState(false);

  // Los documentos viejos no tienen timestamp: sin el guard, moment(undefined)
  // devuelve la fecha de hoy y la muestra como si fuera el alta.
  const fechaAlta = userData?.timestamp?.toDate
    ? moment(userData.timestamp.toDate()).format("DD/MM/YYYY")
    : "—";

  const llevaMoto = !!(userData?.patente || userData?.marcaMoto);

  return (
    <>
      <div className="w-100 mt-5 d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)' }}>
        <div className="container mw-100 d-flex flex-column flex-grow-1">
          <div className="d-flex">
            <h1>Mi Perfil</h1>
          </div>

          <nav className="nav nav-borders">
            <div
              className={`nav-link ms-0 ${mostrarPerfil ? "active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => { setMostrarPerfil(true); setModalShowEditClave(false); }}
            >
              Perfil
            </div>
            <div
              className="nav-link"
              style={{ cursor: "pointer" }}
              onClick={() => { setMostrarPerfil(false); setModalShowEditClave(true); }}
            >
              Seguridad
            </div>
          </nav>
          <hr className="mt-0 mb-4" />

          <div className="row justify-content-center flex-grow-1">
            <div className="col-xl-8">
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span>Detalles de la Cuenta</span>
                  <small className="text-body-secondary">
                    Para modificar algún dato, avisale al administrador
                  </small>
                </div>
                <div className="card-body">
                  <div className="row gx-3">
                    <Campo label="Nombre Completo" valor={userData?.nombreCompleto} ancho="col-12" />
                    <Campo label="DNI" valor={userData?.dni} />
                    <Campo label="Telefono" valor={userData?.telefono} />
                    <Campo label="Domicilio" valor={userData?.domicilio} ancho="col-12" />
                    <Campo label="Correo Electronico" valor={userData?.correo} />
                    <Campo label="Rol" valor={NOMBRES_ROL[userData?.rol]} />
                    <Campo label="Sucursal" valor={userData?.sucursal} />
                    <Campo label="Fecha de Alta" valor={fechaAlta} />
                  </div>

                  {llevaMoto && (
                    <div className="row gx-3 border-top pt-3">
                      <div className="col-12 mb-2">
                        <span className="text-body-secondary small fw-bold text-uppercase">Datos de la moto</span>
                      </div>
                      <Campo label="Patente" valor={userData?.patente} ancho="col-md-3" />
                      <Campo label="Marca" valor={userData?.marcaMoto} ancho="col-md-3" />
                      <Campo label="Modelo" valor={userData?.modeloMoto} ancho="col-md-3" />
                      <Campo label="Color" valor={userData?.colorMoto} ancho="col-md-3" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditClave
        show={modalShowEditClave}
        onHide={() => setModalShowEditClave(false)}
      />
    </>
  );
};

export default MiPerfil;
