import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, where, getDocs, limit, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import 'moment/locale/es';
import moment from "moment";

function CreateTratamiento(props) {
  const { agregartratamiento, ...propsModal } = props;
  const hoy = moment(new Date()).format("YYYY-MM-DD");
  const [codigo, setCodigo] = useState(null);
  const [apellidoConNombre, setApellidoConNombre] = useState("");
  const [idPaciente, setIdPaciente] = useState("");
  const [tipoIdc, setTipoIdc] = useState("dni");
  const [idc, setIdc] = useState("");
  const [cta, setCta] = useState("");
  const [precio, setPrecio] = useState("");
  const [tarifasTratamientos, setTarifasTratamientos] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [pieza, setPieza] = useState("");
  const [estadosTratamientos, setEstadosTratamientos] = useState("");
  const [fecha, setFecha] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [showBuscador, setShowBuscador] = useState(true);

  const [, setEditable] = useState(false);

  const tratamientosCollection = collection(db, "tratamientos");
  const controlesCollection = collection(db, "controlEvoluciones")

  useEffect(() => {
    const getCodigo = async () => {
      const querySnapshot = await getDocs(
        query(tratamientosCollection, orderBy("codigo", "desc"), limit(1))
      );
      if (!querySnapshot.empty) {
        const maxCodigo = querySnapshot.docs[0].data().codigo;
        setCodigo(Number(maxCodigo) + 1);
      } else {
        setCodigo(Number(1));
      }
    };
    getCodigo();
  }, [tratamientosCollection]);

  const confirm = () => {
    Swal.fire({
      title: '¡Tratamiento agregado!',
      icon: 'success',
      confirmButtonColor: '#00C5C1'
    })
  }

  const validateFields = (e) => {
    e.preventDefault();
    if (
      apellidoConNombre.trim() === "" ||
      idc.trim() === "" ||
      tarifasTratamientos.trim() === "" ||
      estadosTratamientos.trim() === "" ||
      fecha.trim() === ""
    ) {
      setError("Respeta los campos obligatorios *");
      setTimeout(clearError, 2000)
      return false;
    } else {
      setError("");
      store(e);
    }
    return true;
  };

  const clearError = () => {
    setError("");
  };

  const clearFields = () => {
    setCodigo("")
    setApellidoConNombre("")
    setTipoIdc("dni")
    setIdc("")
    setCta("")
    setPrecio("")
    setTarifasTratamientos("")
    setPieza("")
    setEstadosTratamientos("")
    setFormaPago("")
    setFecha("")
    setFechaVencimiento("")
    setNotas("")
  };

  const store = async (e) => {
    e.preventDefault();
    moment.locale('es')
    var mesVariable = moment(fecha).format("MMMM");
    var tiempoAlta = serverTimestamp();
    const busqueda = query(collection(db, "user"), where("uidParaComparar", "==", props.current_user.uid), limit(1));
    const querySnapshot = await getDocs(busqueda);

    const tratamientoDocRef = {
      codigo: codigo,
      apellidoConNombre: apellidoConNombre,
      idPaciente: idPaciente,
      tipoIdc: tipoIdc,
      idc: idc,
      cta: cta,
      precio: precio,
      restoCobro: Number(precio),
      formaPago: formaPago,
      tarifasTratamientos: tarifasTratamientos,
      pieza: pieza,
      estadosTratamientos: estadosTratamientos,
      fecha: fecha,
      fechaNotificacion: '',
      mes: mesVariable,
      fechaVencimiento: fechaVencimiento,
      notas: notas,
      timestamp: tiempoAlta,
      cobrosManuales: {
        fechaCobro: [],
        importeAbonado: [],
        tratamientoCobro: [],
        codigoTratamiento: [],
        pacienteCobro: [],
        timestampCobro: [],
      },
    };

    try {
      const docRef = await addDoc(tratamientosCollection, tratamientoDocRef);
      props.agregartratamiento({ id: docRef.id, ...tratamientoDocRef });

      await addDoc(controlesCollection, {
        codigoTratamiento: codigo,
        timestamp: tiempoAlta,
        apellidoConNombre: apellidoConNombre,
        idPaciente: idPaciente,
        tipoIdc: tipoIdc,
        idc: idc,
        tratamientoControl: tarifasTratamientos,
        pieza: pieza,
        fechaControlRealizado: fecha,
        detalleTratamiento: "1° Tratamiento Iniciado: " + notas,
        doctor: props.current_user.displayName,
        doctorId: querySnapshot.docs[0].data()?.idUnica || "",
        tratamientoId: docRef.id,
      });
    } catch (error) {
      console.error("Error al agregar tratamiento: ", error);
    }

    clearFields();
    props.onHide();
    confirm();
  };

  async function buscarTratamiento(tratamiento) {
    if (!tratamiento) {
      setCta("");
      setPrecio("");
      return;
    }

    const q = query(
      collection(db, "tarifas"),
      where("tratamiento", "==", tratamiento),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0].data();
      if (doc.eliminado) {
        const confirmMessage = "El tratamiento seleccionado está marcado como eliminado. ¿Deseas continuar?";
        const shouldContinue = window.confirm(confirmMessage);
        if (!shouldContinue) {
          setTarifasTratamientos("");
          setCta("");
          setPrecio("");
          return;
        }
      }
      setCta(doc.codigo);
      setPrecio(doc.tarifa);
    } else {
      setCta("");
      setPrecio("");
    }
  }

  useEffect(() => {
    if (fecha === "") {
      setFecha(hoy);
    }
    if (formaPago === "") {
      setFormaPago("Contado");
    }
  }, [formaPago, fecha, hoy]);

  const manejarValorSeleccionado = async (suggestion) => {
    if (suggestion === "") {
      setApellidoConNombre("");
      setIdPaciente("")
      setTipoIdc("dni")
      setIdc("");
      setEditable(true);
      return;
    }

    const querySnapshot = await getDocs(
      query(collection(db, "clients"), where("valorBusqueda", "==", suggestion)), limit(1)
    );

    const doc = querySnapshot.docs[0];

    if (doc) {
      const data = doc.data();
      setApellidoConNombre(data.apellidoConNombre);
      setTipoIdc(data.tipoIdc);
      setIdc(data.idc);
      setIdPaciente(doc.id)
      setEditable(false);
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      if (props.id) {
        setShowBuscador(false);
        const docRef = doc(db, 'clients', props.id);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setApellidoConNombre(data.apellidoConNombre);
          setTipoIdc(data.tipoIdc);
          setIdc(data.idc);
          setIdPaciente(props.id);
          setEditable(false);
        }
      }
    };

    fetchClient();
  }, [props.id, apellidoConNombre]);

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => { clearFields(); props.onHide(); }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Crear Tratamiento</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          {showBuscador && (
            <div className="col-6 mb-2" style={{ display: "flex" }}>
              <input
                placeholder="Buscador por Apellido, Nombre o DNI"
                type="text"
                className="form-control"
                onChangeCapture={(e) =>
                  manejarValorSeleccionado(e.target.value)
                }
                list="pacientes-list"
                multiple={false}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ display: "flex", alignItems: "center", marginLeft: "-26px" }}></i>
              <datalist id="pacientes-list">
                {props.valorbusquedaoptions}
              </datalist>
            </div>
          )}

          <form style={{ transform: "scale(0.98)" }}>
            <div className="row">
              <div className="col-6 mb-2">
                <label className="form-label">IDC*</label>
                <div style={{ display: "flex" }}>
                  <select
                    value={tipoIdc}
                    onChange={(e) => { setTipoIdc(e.target.value); setIdc("") }}
                    className={"form-control-selectedCode me-1"}
                    multiple={false}
                    style={{ width: "fit-content" }}
                    disabled
                    required
                  >
                    <option value="dni">DNI</option>
                    <option value="ce">CE</option>
                    <option value="ruc">RUC</option>
                    <option value="pas">PAS</option>

                  </select>
                  <input
                    value={idc}
                    onChange={(e) => setIdc(e.target.value)}
                    type={tipoIdc === "dni" || tipoIdc === "ruc" ? "number" : "text"}
                    minLength={tipoIdc === "dni" ? 8 : undefined}
                    maxLength={tipoIdc === "dni" ? 8 : tipoIdc === "ruc" ? 11 : tipoIdc === "ce" || tipoIdc === "pas" ? 12 : undefined}
                    onKeyDown={(e) => {
                      const maxLength = e.target.maxLength;
                      const currentValue = e.target.value;
                      const isTabKey = e.key === "Tab";
                      const isDeleteKey = e.key === "Delete" || e.key === "Supr" || e.key === "Backspace";
                      if (maxLength && currentValue.length >= maxLength && !isTabKey && !isDeleteKey) {
                        e.preventDefault();
                      }
                    }}
                    className="form-control"
                    disabled
                    required
                  />
                </div>
              </div>
              <div className="col-6 mb-2">
                <label className="form-label">Apellido y Nombres*</label>
                <input
                  value={apellidoConNombre}
                  onChange={(e) => setApellidoConNombre(e.target.value)}
                  type="text"
                  className="form-control"
                  disabled
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-6 mb-2">
                <label className="form-label">Tratamiento*</label>
                <input
                  value={tarifasTratamientos}
                  onChange={(e) => {
                    setTarifasTratamientos(e.target.value)
                    buscarTratamiento(e.target.value)
                  }}
                  type="text"
                  placeholder="Selecciona un Tratamiento..."
                  className="form-control"
                  list="tratamientos-list"
                />
                <datalist id="tratamientos-list">
                  {props.tratamientosoptions}
                </datalist>
              </div>
              <div className="col-6 mb-2">
                <label className="form-label">Estado del Tratamiento*</label>
                <select
                  value={estadosTratamientos}
                  onChange={(e) => setEstadosTratamientos(e.target.value)}
                  className="form-control"
                  multiple={false}
                  required
                >
                  <option value="">Selecciona un estado</option>
                  {props.estadostratamientosoptions}
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-4 mb-2">
                <label className="form-label">Forma de Pago</label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  className="form-control"
                  multiple={false}
                  required
                >
                  <option value="Contado">Contado</option>
                  <option value="Cuotas">Cuotas</option>
                </select>
              </div>

              <div className="col-4 mb-2">
                <label className="form-label">Precio</label>
                <input
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  type="number"
                  className="form-control"
                />
              </div>

              <div className="col-4 mb-2">
                <label className="form-label">Pieza</label>
                <input
                  value={pieza}
                  onChange={(e) => setPieza(e.target.value)}
                  type="number"
                  className="form-control"
                />
              </div>
            </div>

            <div className="row">
              <div className="col mb-2">
                <label className="form-label">Fecha*</label>
                <input
                  defaultValue={hoy}
                  onChange={(e) => setFecha(e.target.value)}
                  type="date"
                  className="form-control"
                  max={hoy}
                />
              </div>
              {formaPago === "Cuotas" && (<div className="col-6 mb-2">
                <label className="form-label">Fecha Vencimiento*</label>
                <input
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  type="date"
                  className="form-control"
                  required
                />
              </div>)}
            </div>

            <div className="row">
              <div className="col-12 mb-2">
                <label className="form-label">Notas</label>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  type="text"
                  className="form-control"
                />
              </div>
            </div>
            <div style={{ display: "flex" }}>
              <button type="submit" onClick={validateFields} className="btn button-main" style={{ margin: '10px' }}>
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
      </Modal.Body >
    </Modal >
  );
}

export default CreateTratamiento;
