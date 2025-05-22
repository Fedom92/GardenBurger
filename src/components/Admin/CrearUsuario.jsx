import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig/firebase";
import { createUserWithEmailAndPassword, updateProfile, updateCurrentUser } from "firebase/auth"
import { Modal } from "react-bootstrap";
import moment from 'moment';
import Swal from "sweetalert2";


const CrearUsuario = (props) => {
  const { agregarusuario, ...propsModal } = props;
  const [codigo, setCodigo] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombres, setNombres] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rol, setRol] = useState('');
  const [error, setError] = useState('');
  const [editable] = useState(false);

  const userCollection = collection(db, "usuarios");

  useEffect(() => {
    const getCodigo = async () => {
      const querySnapshot = await getDocs(
        query(userCollection, orderBy("codigo", "desc"), limit(1))
      );
      if (!querySnapshot.empty) {
        const maxCodigo = querySnapshot.docs[0].data().codigo;
        setCodigo(Number(maxCodigo) + 1);
      } else {
        setCodigo(1);
      }
    };
    getCodigo();
  }, [userCollection]);

  const validateFields = async (e) => {
    e.preventDefault();
    if (nombres.trim() === "" || apellido.trim() === "" || correo.trim() === "" || rol.trim() === "" || password.trim() === "" || confirmPassword.trim() === "") {
      setError("Respeta los campos obligatorios*");
      setTimeout(clearError, 2000);
      return;
    }
    if (!correo || !/@[^.]+\.com(\.\w+)?$/.test(correo)) {
      setError("Correo electrónico inválido");
      setTimeout(clearError, 2000);
      return;
    }
    const querySnapshot = await getDocs(query(userCollection, where("correo", "==", correo), limit(1)));
    if (!querySnapshot.empty) {
      setError("El correo ya está registrado");
      setTimeout(clearError, 2000);
      return;
    }
    if (password.length < 6) {
      setError("El password debe tener al menos 6 caracteres");
      setTimeout(clearError, 2000);
      return;
    } else {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden!")
        setTimeout(clearError, 2000);
        return;
      }
    }
    setError("");
    await store(e);
  }



  const store = async (e) => {
    e.preventDefault();
    const usuarioAnterior = auth.currentUser;
    const nombreCompleto = nombres + " " + apellido;

    const nuevoUsuario = {
      codigo: codigo,
      nombres: nombres,
      apellido: apellido,
      nombreCompleto: nombreCompleto,
      correo: correo,
      telefono: telefono,
      rol: rol,
      foto: "",
      fechaAlta: moment(new Date()).format('DD/MM/YY'),
    };

    try {
      await addDoc(userCollection, nuevoUsuario);

      const { user } = await createUserWithEmailAndPassword(auth, correo, password);
      await updateProfile(user, { displayName: nombreCompleto });

      await updateCurrentUser(auth, usuarioAnterior);
    } catch (error) {
      console.error("Error al agregar usuario: ", error);
      Swal.fire({
        title: '¡Error!',
        text: 'Error al Crear Usuario. Cierra sesión, recarga e intente de nuevo.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    };
  };

  const clearFields = () => {
    setCodigo("")
    setApellido("");
    setNombres("");
    setCorreo("");
    setPassword("");
    setConfirmPassword("");
    setTelefono("");
    setRol("");
    setError("");
  };

  const clearError = () => {
    setError("");
  };

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => {
        props.onHide();
        clearFields("")
      }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Crear Usuario</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="col">
            <form onSubmit={store} style={{ transform: "scale(0.98)", marginTop: "-40px" }}>
              <div className="col-12 mb-2">
                <label className="form-label">Codigo</label>
                <input
                  value={codigo}
                  disabled={!editable}
                  type="number"
                  className="form-control"
                />
              </div>
              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Nombres*</label>
                  <input
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    type="text"
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label">Apellido*</label>
                  <input
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    type="text"
                    className="form-control"
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Telefono</label>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    type="text"
                    className="form-control"
                  />
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label">Rol*</label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="form-control"
                    multiple={false}
                    style={{ height: "48px" }}
                    required
                  >
                    <option value="">Selecciona un rol ....</option>
                    <option value={process.env.REACT_APP_rolAdmin}>Admin</option>
                    <option value={process.env.REACT_APP_rolLogistica}>Logistica</option>
                    <option value={process.env.REACT_APP_rolOperaciones}>Operaciones</option>
                    <option value={process.env.REACT_APP_rolRH}>RR.HH.</option>
                    <option value={process.env.REACT_APP_rolSoporte}>Soporte</option>
                  </select>
                </div>
              </div>

              <div className="col-12 mb-2">
                <label className="form-label">Email*</label>
                <input
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  type="email"
                  className="form-control"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Password*</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="form-control"
                    minLength={6}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label">Reingresar Password*</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    className="form-control"
                    minLength={6}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "end" }}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  onClick={(e) => validateFields(e)}
                  className="btn button-main"
                >
                  Agregar
                </button>

              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CrearUsuario;