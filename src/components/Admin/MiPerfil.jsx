import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import EditClave from "./EditClave";
import Swal from "sweetalert2";
import "../../style/Main.css"
import moment from 'moment';

const MiPerfil = () => {
  const [user, setUser] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editable, setEditable] = useState(false);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [id, setId] = useState("");
  const [, setMostrarPerfil] = useState(true);
  const [modalShowEditClave, setModalShowEditClave] = useState(false);
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, fetchUserData);
    return unsubscribe;
  }, []);

  const fetchUserData = async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser(userData);
        setNombreCompleto(userData.nombreCompleto);
        setCorreo(userData.correo);
        setTelefono(userData.telefono);
        setId(userDoc.id);
        // Sin el guard, un doc viejo sin timestamp muestra la fecha de hoy como alta.
        setFecha(userData.timestamp?.toDate ? moment(userData.timestamp.toDate()).format("DD/MM/YYYY") : "—")
      }
      setIsLoading(false);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    setEditable(true)
    setMostrarCancelar(true)
  };

  const handleCancelar = (e) => {
    e.preventDefault();
    setEditable(false)
    setMostrarCancelar(false)
  };

  const handleSave = async (e) => {
    try {
      e.preventDefault();
      const userDocRef = doc(db, "usuarios", id);
      await updateDoc(userDocRef, {
        nombreCompleto,
        correo,
        telefono,
      });
      Swal.fire({
        title: '¡Éxito!',
        text: 'Modificación de usuario exitosa.',
        icon: 'success',
        confirmButtonColor: '#198754',
      }).then(() => {
        signOut(auth);
        navigate("/")
      })
    } catch (e) {
      Swal.fire({
        title: '¡Error!',
        text: 'Error al guardar sus datos. Vuelva a iniciar sesión e intente de nuevo.',
        icon: 'error',
        confirmButtonColor: '#d33',
      })
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100 mt-5 d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)' }}>
          <div className="container mw-100 d-flex flex-column flex-grow-1">
            <div className="d-flex">
              <h1>Mi Perfil</h1>
            </div>

            <nav className="nav nav-borders">
              <div className="nav-link active ms-0" onClick={() => { setMostrarPerfil(true); setModalShowEditClave(false); }} >Perfil</div>
              <div className="nav-link" onClick={() => { setMostrarPerfil(false); setModalShowEditClave(true); }} >Seguridad</div>
            </nav>
            <hr className="mt-0 mb-4" />
            <div className="row justify-content-center flex-grow-1">
              <div className="col-xl-8">
                <div className="card mb-4">
                  <div className="card-header">Detalles de la Cuenta</div>
                  <div className="card-body">
                    <form name="miPerfil">
                      <div className="row gx-3 mb-3">
                        <div className="col-md-12">
                          <label className="small mb-1">Nombre Completo</label>
                          <input className="form-control" id="inputNombres" type="text" placeholder="Ingresa tus Nombres" value={nombreCompleto || ""}
                            onChange={(e) => setNombreCompleto(e.target.value)} disabled={!editable} style={{ textAlign: "center" }} />
                        </div>
                      </div>
                      <div className="row gx-3 mb-3">
                        <div className="col-md-6">
                          <label className="small mb-1">Correo Electronico</label>
                          <input className="form-control" id="inputEmailAddress" type="email" placeholder="Ingresa tu Correo Electronico" value={correo}
                            onChange={(e) => setCorreo(e.target.value.toLowerCase())} disabled style={{ textAlign: "center" }} autoComplete="off" />
                        </div>
                        <div className="col-md-6">
                          <label className="small mb-1">Telefono</label>
                          <input className="form-control" id="inputPhone" type="tel" placeholder="Ingresa tu Telefono" value={telefono || ""}
                            onChange={(e) => setTelefono(e.target.value)} disabled={!editable} style={{ textAlign: "center" }} />
                        </div>
                      </div>

                      <div className="row gx-3 mb-3">
                        <div className="col-md-12">
                          <label className="small mb-1">Fecha de Alta</label>
                          <input className="form-control" id="inputBirthday" type="text" name="birthday" value={fecha} disabled style={{ textAlign: "center" }} />
                        </div>
                      </div>
                      <button className="btn btn-success" type="submit" onClick={editable ? handleSave : handleEdit} style={{ margin: "1px" }}>
                        {editable ? "Guardar Cambios" : "Editar Informacion"}
                      </button>
                      {mostrarCancelar && (<button className="btn btn-danger" type="submit" onClick={handleCancelar} style={{ margin: "1px" }}>
                        Cancelar
                      </button>)}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <EditClave
        usuario={user}
        show={modalShowEditClave}
        onHide={() => setModalShowEditClave(false)}
      />
    </>
  );
};

export default MiPerfil;