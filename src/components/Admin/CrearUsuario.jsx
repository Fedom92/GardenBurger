import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, limit, getDocs, where, updateDoc } from "firebase/firestore";
import { db, auth, } from "../../firebaseConfig/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { Modal } from "react-bootstrap";
import moment from 'moment';
import Swal from "sweetalert2";


const CrearUsuario = (props) => {
  const { agregarusuario, ...propsModal } = props;
  const [codigo, setCodigo] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombres, setNombres] = useState('');
  const [, setFechaAlta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rol, setRol] = useState('');
  const [foto,] = useState('');
  const [error, setError] = useState('');
  const [editable] = useState(false);

  const userCollection = collection(db, "user");

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


  const store = async (e) => {
    e.preventDefault();
    const { user } = await createUserWithEmailAndPassword(auth, correo, password);
    const nombreCompleto = nombres + " " + apellido;

    await updateProfile(user, {
      displayName: nombreCompleto,
    });

    await user.getIdTokenResult().then(() => {
      return user;
    });

    const uid = (rol === process.env.REACT_APP_rolRecepcionis) ? "Recepcionista" : user.uid;

    const docRef = await addDoc(userCollection, {
      uid: uid,
      uidParaComparar: user.uid,
      codigo: codigo,
      nombres: nombres,
      apellido: apellido,
      nombreCompleto: nombreCompleto,
      correo: correo,
      telefono: telefono,
      rol: rol,
      foto: foto,
      fechaAlta: moment(new Date()).format('DD/MM/YY'),
    });

    await updateDoc(docRef, {
      idUnica: docRef.id,
    });
    props.agregarusuario({ id: docRef.id, ...docRef });

    Swal.fire({
      title: '¡Éxito!',
      text: 'Usuario agregado!.',
      icon: 'success',
      confirmButtonColor: '#00C5C1',
    }).then(() => {
      clearFields();
      props.onHide();
    });

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
    setFechaAlta("");
    setError("");
  };

  const validateFields = async (e) => {
    e.preventDefault();
    const querySnapshot = await getDocs(query(userCollection, where("correo", "==", correo)));
    if (!querySnapshot.empty) {
      setError("El correo ya está registrado");
      setTimeout(clearError, 2000);
      return;
    } else {
      if (nombres.trim() === "" || apellido.trim() === "" || correo.trim() === "" || rol.trim() === "" || password.trim() === "" || confirmPassword.trim() === "") {
        setError("Respeta los campos obligatorios *");
        setTimeout(clearError, 2000);
        return;
      } else {
        if (password.length < 6) {
          setError("El password debe tener al menos 6 caracteres");
          setTimeout(clearError, 2000);
          return;
        } else {
          if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden!")
            setTimeout(clearError, 2000);
            return;
          } else {
            setError("");
            store(e);
          }
        }
      }
    }
  }

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
          <h1>Crear Recepcionista</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col">
              <form onSubmit={store} style={{ transform: "scale(0.98)" }}>
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
                    <label className="form-label">Rol</label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="form-control"
                      multiple={false}
                      style={{ height: "48px" }}
                      required
                    >
                      <option value="">Selecciona un rol ....</option>
                      <option value={process.env.REACT_APP_rolAd}>Admin</option>
                      <option value={process.env.REACT_APP_rolRecepcionis}>Recepcionista</option>
                      <option value={process.env.REACT_APP_rolDoctor}>Doctor</option>
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

                <div style={{ display: "flex" }}>
                  <button
                    type="submit"
                    onClick={validateFields}
                    className="btn button-main"
                  >
                    Agregar
                  </button>
                  {error && (
                    <div className="alert alert-danger" role="alert" style={{ margin: '10px' }}>
                      {error}
                    </div>
                  )}
                </div>

              </form>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CrearUsuario;