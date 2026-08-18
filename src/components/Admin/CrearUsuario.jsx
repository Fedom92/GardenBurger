import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, app } from "../../firebaseConfig/firebase";
import { fetchSucursales } from "../../Utils/sucursales";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";

const CrearUsuario = (props) => {
  const { register, handleSubmit, reset } = useForm();
  const { agregarusuario, ...propsModal } = props;
  const [error, setError] = useState('');
  const [sucursales, setSucursales] = useState([]);

  const userCollection = collection(db, "usuarios");

  useEffect(() => {
    fetchSucursales().then(setSucursales).catch(console.error);
  }, []);

  const validarInputs = async (data) => {
    if (!data.correo || !/@[^.]+\.com(\.\w+)?$/.test(data.correo)) {
      return "Correo electrónico inválido";
    }

    // Solo cuenta como duplicado un usuario activo: los dados de baja conservan
    // su correo y esa persona puede volver a darse de alta desde cero.
    const querySnapshot = await getDocs(query(userCollection, where("correo", "==", data.correo)));
    if (querySnapshot.docs.some((d) => d.data().activo !== false)) {
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

    try {
      // Server-side (Cloud Function con Admin SDK): crea el Auth user y el
      // doc en "usuarios" sin desloguear al admin actual ni depender de
      // App Check en el cliente.
      const crearUsuarioFn = httpsCallable(getFunctions(app), "crearUsuario");
      const { data: nuevo } = await crearUsuarioFn({
        correo: data.correo,
        password: data.password,
        nombreCompleto: data.nombreCompleto,
        rol: data.rol,
        telefono: data.telefono,
        sucursal: data.sucursal,
      });

      agregarusuario(nuevo);
      clearForm();
    } catch (error) {
      console.error("Error al agregar usuario: ", error);
      Swal.fire({
        title: '¡Error!',
        text: error.message || 'Error al Crear Usuario. Cierra sesión, recarga e intente de nuevo.',
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
                    <option value={process.env.REACT_APP_atp}>ATP</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Email*</label>
                  <input type="email" className="form-control" autoComplete="off" required {...register("correo")} />
                </div>

                <div className="col-6 mb-2">
                  <label className="form-label">Sucursal*</label>
                  <select className="form-control" multiple={false} style={{ height: "48px" }} required {...register("sucursal")}>
                    <option value="">Selecciona una sucursal ....</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre || s.id}</option>
                    ))}
                  </select>
                </div>
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