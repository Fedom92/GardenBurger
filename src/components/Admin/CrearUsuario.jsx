import React, { useState } from "react";
import { collection, setDoc, doc, query, limit, getDocs, where } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig/firebase";
import { createUserWithEmailAndPassword, updateCurrentUser } from "firebase/auth"
import { Modal } from "react-bootstrap";
import moment from 'moment';
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";

const CrearUsuario = (props) => {
  const { register, handleSubmit, reset } = useForm();

  const { agregarusuario, ...propsModal } = props;
  const hoy = moment(new Date()).format("DD/MM/YYYY");
  const [error, setError] = useState('');

  const userCollection = collection(db, "usuarios");

  const validarInputs = async (data) => {
    if (!data.correo || !/@[^.]+\.com(\.\w+)?$/.test(data.correo)) {
      return "Correo electrónico inválido";
    }

    const querySnapshot = await getDocs(query(userCollection, where("correo", "==", data.correo), limit(1)));
    if (!querySnapshot.empty) {
      return "El correo ya está registrado";
    }

    if (data.password.length < 6) {
      return "El password debe tener al menos 6 caracteres";
    }

    if (data.password !== data.confirmPassword) {
      return "Las contraseñas no coinciden!";
    }

    return null;
  };

  const validarFields = async (data) => {
    const errorMsg = await validarInputs(data);
    if (errorMsg) {
      setError(errorMsg);
      setTimeout(setError(""), 2000);
      return;
    }

    const usuarioAnterior = auth.currentUser;
    const nuevoUsuario = {
      correo: data.correo,
      fechaAlta: hoy,
      foto: "",
      nombreCompleto: data.nombreCompleto,
      rol: data.rol,
      telefono: data.telefono,
    };

    try {
      const { user } = await createUserWithEmailAndPassword(auth, data.correo, data.password);

      await setDoc(doc(db, "usuarios", user.uid), nuevoUsuario);
      await updateCurrentUser(auth, usuarioAnterior);
      
      clearForm();
    } catch (error) {
      console.error("Error al agregar usuario: ", error);
      Swal.fire({
        title: '¡Error!',
        text: 'Error al Crear Usuario. Cierra sesión, recarga e intente de nuevo.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    };
  }

  const clearForm = () => {
    reset();
    setError("");
    props.onHide();
  };

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => clearForm()}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Crear Usuario</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <div className="container">
          <div className="col">
            <form name="crearUsuario" onSubmit={handleSubmit(validarFields)}>
              <div className="row">
                <div className="col-12 mb-2">
                  <label className="form-label">Nombre Completo*</label>
                  <input type="text" className="form-control" required {...register("nombreCompleto")} />
                </div>
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Telefono</label>
                  <input type="text" className="form-control" {...register("telefono")} />
                </div>

                <div className="col-6 mb-2">
                  <label className="form-label">Rol*</label>
                  <select className="form-control" multiple={false} style={{ height: "48px" }} required {...register("rol")}>
                    <option value="">Selecciona un rol ....</option>
                    <option value={process.env.REACT_APP_admin}>Admin</option>
                    <option value={process.env.REACT_APP_encargado}>Encargado</option>
                    <option value={process.env.REACT_APP_cajero}>Cajero</option>
                    <option value={process.env.REACT_APP_cocina}>Cocina</option>
                    <option value={process.env.REACT_APP_delivery}>Delivery</option>
                    <option value={process.env.REACT_APP_contador}>Contador</option>
                  </select>
                </div>
              </div>

              <div className="col-12 mb-2">
                <label className="form-label">Email*</label>
                <input type="email" className="form-control" autoComplete="off" required {...register("correo")} />
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Password*</label>
                  <input type="password" className="form-control" minLength={6} autoComplete="off" required {...register("password")} />
                </div>

                <div className="col-6 mb-2">
                  <label className="form-label">Reingresar Password*</label>
                  <input type="password" className="form-control" minLength={6} autoComplete="off" required {...register("confirmPassword")} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "end" }}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-success">Agregar</button>

              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CrearUsuario;