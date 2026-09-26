import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, app } from "../../firebaseConfig/firebase";
import { fetchSucursales } from "../../Utils/sucursales";
import { ROLES } from "../../Utils/Constantes";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../Utils/avisos";

// Alta de empleados. Dos variantes en el mismo formulario, y las decide el ROL
// (`ROLES[rol].sinAcceso`), no un check: antes había uno, y solo servía para los
// repartidores.
//
// - CON acceso: la Cloud Function crea la cuenta de Auth y escribe el perfil,
//   las dos cosas server-side. El perfil viaja en `datos` como objeto genérico,
//   así que agregar un campo acá no obliga a redeployar la Function.
// - SIN acceso (repartidores): no se toca Auth. Es un documento y nada más. En
//   lugar del correo y la contraseña, el formulario pide los datos de la moto.
const CrearEmpleado = (props) => {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: { valorHora: 0 }
  });
  const { agregarempleado, ...propsModal } = props;
  const [error, setError] = useState('');
  // Un useState no alcanza: entre dos clicks rápidos el botón sigue habilitado y
  // un repartidor (addDoc, id por llamada) quedaba dado de alta dos veces.
  const { procesando, ejecutar } = useAccionUnica();
  const [sucursales, setSucursales] = useState([]);

  const rol = watch("rol");
  const sinAcceso = !!ROLES[rol]?.sinAcceso;
  const llevaMoto = !!ROLES[rol]?.llevaMoto;

  const userCollection = collection(db, "usuarios");

  useEffect(() => {
    fetchSucursales().then(setSucursales).catch((error) => {
      console.error(error);
      avisarErrorDeCarga("las sucursales");
    });
  }, []);

  const validarInputs = async (data) => {
    // Un empleado sin acceso no tiene correo ni contraseña que validar.
    if (ROLES[data.rol]?.sinAcceso) return null;

    if (!data.correo || !/@[^.]+\.com(\.\w+)?$/.test(data.correo)) {
      return "Correo electrónico inválido";
    }

    // Solo cuenta como duplicado un empleado activo: los dados de baja conservan
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

  // Lo que se guarda en `usuarios`, sin los campos que solo sirven para el alta.
  const armarEmpleado = (data) => ({
    nombreCompleto: data.nombreCompleto,
    dni: data.dni,
    telefono: data.telefono,
    domicilio: data.domicilio,
    rol: data.rol,
    sucursal: data.sucursal,
    valorHora: Number(data.valorHora) || 0,
    activo: true,
    sinAcceso: !!ROLES[data.rol]?.sinAcceso,
    ...(ROLES[data.rol]?.sinAcceso ? {} : { correo: data.correo }),
    ...(ROLES[data.rol]?.llevaMoto ? {
      marcaMoto: data.marcaMoto || "",
      modeloMoto: data.modeloMoto || "",
      colorMoto: data.colorMoto || "",
      patente: data.patente || "",
    } : {}),
  });

  const validarFields = (data) => ejecutar(async () => {
    const errorMsg = await validarInputs(data);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setError("");
    const empleado = armarEmpleado(data);

    try {
      if (ROLES[data.rol]?.sinAcceso) {
        // Sin cuenta de Auth: es un documento y nada más, no hay Function.
        const docRef = await addDoc(userCollection, { ...empleado, timestamp: serverTimestamp() });
        agregarempleado({ id: docRef.id, ...empleado });
      } else {
        // La Function crea la cuenta y escribe el perfil del mismo lado. Si el
        // documento falla, ella misma borra la cuenta: o pasan las dos cosas o
        // ninguna, sin dejar un usuario de Auth con el correo tomado.
        const crearUsuarioFn = httpsCallable(getFunctions(app), "crearUsuario");
        const { data: creado } = await crearUsuarioFn({
          correo: data.correo,
          password: data.password,
          datos: empleado,
        });
        agregarempleado(creado);
      }

      clearForm();
    } catch (error) {
      console.error("Error al agregar empleado: ", error);
      Swal.fire({
        title: '¡Error!',
        text: error.message || 'Error al crear el empleado. Cerrá sesión, recargá e intentá de nuevo.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    }
  });

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
          <h1>Crear Empleado</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <div className="container">
          <div className="col">
            <form name="crearEmpleado" onSubmit={handleSubmit(validarFields)}>

              <div className="row">
                <div className="col-md-6 mb-2">
                  <label className="form-label">Nombre Completo*</label>
                  <input type="text" className="form-control" required {...register("nombreCompleto")} />
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label">Domicilio</label>
                  <input type="text" className="form-control" {...register("domicilio")} />
                </div>
              </div>

              <div className="row">
                <div className="col-md-4 mb-2">
                  <label className="form-label">DNI</label>
                  <input type="text" className="form-control" {...register("dni")} />
                </div>

                <div className="col-md-4 mb-2">
                  <label className="form-label">Telefono</label>
                  <input type="text" className="form-control" {...register("telefono")} />
                </div>

                <div className="col-md-4 mb-2">
                  <label className="form-label">Valor por hora ($)</label>
                  <input type="number" min={0} className="form-control" {...register("valorHora")} />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-2">
                  <label className="form-label">Rol*</label>
                  {/* Sin opción Admin: los administradores se dan de alta a mano desde la
                      Consola de Firebase. La Cloud Function además rechaza ese rol, porque
                      reponer un <option> con las devtools es trivial. */}
                  <select className="form-control" multiple={false} style={{ height: "48px" }} required {...register("rol")}>
                    <option value="">Selecciona un rol ....</option>
                    <option value={process.env.REACT_APP_encargado}>Encargado</option>
                    <option value={process.env.REACT_APP_cajero}>Cajero</option>
                    <option value={process.env.REACT_APP_cocina}>Cocina</option>
                    <option value={process.env.REACT_APP_jefeDeliverys}>Jefe de Deliverys</option>
                    <option value={process.env.REACT_APP_delivery}>Delivery</option>
                    <option value={process.env.REACT_APP_atp}>ATP</option>
                  </select>
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label">Sucursal*</label>
                  <select className="form-control" multiple={false} style={{ height: "48px" }} required {...register("sucursal")}>
                    <option value="">Selecciona una sucursal ....</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {llevaMoto && (
                <div className="row border-top pt-2 mt-1">
                  <div className="col-12 mb-1">
                    <span className="text-body-secondary small fw-bold text-uppercase">Datos de la moto</span>
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label">Patente</label>
                    <input type="text" className="form-control" {...register("patente")} />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label">Marca</label>
                    <input type="text" className="form-control" {...register("marcaMoto")} />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label">Modelo</label>
                    <input type="text" className="form-control" {...register("modeloMoto")} />
                  </div>
                  <div className="col-md-3 mb-2">
                    <label className="form-label">Color</label>
                    <input type="text" className="form-control" {...register("colorMoto")} />
                  </div>
                </div>
              )}

              {!sinAcceso && (
                <div className="row border-top pt-2 mt-1">
                  <div className="col-12 mb-1">
                    <span className="text-body-secondary small fw-bold text-uppercase">Acceso al sistema</span>
                  </div>
                  <div className="col-12 mb-2">
                    <label className="form-label">Email*</label>
                    <input type="email" className="form-control" autoComplete="off" required={!sinAcceso} {...register("correo")} />
                  </div>

                  <div className="col-md-6 mb-2">
                    <label className="form-label">Password*</label>
                    <input type="password" className="form-control" minLength={6} autoComplete="off" required={!sinAcceso} {...register("password")} />
                  </div>

                  <div className="col-md-6 mb-2">
                    <label className="form-label">Reingresar Password*</label>
                    <input type="password" className="form-control" minLength={6} autoComplete="off" required={!sinAcceso} {...register("confirmPassword")} />
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end align-items-center gap-2 mt-2">
                {error && (
                  <div className="alert alert-danger py-1 px-2 mb-0" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-success" disabled={procesando}>
                  {procesando ? "Guardando..." : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CrearEmpleado;
